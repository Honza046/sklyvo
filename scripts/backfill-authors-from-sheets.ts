/**
 * Backfill Lead.author from outreach Google Sheet (Radar + Sniper → sloupec Autor).
 *
 * Usage:
 *   WORKSPACE_ID=... npx tsx scripts/backfill-authors-from-sheets.ts [spreadsheetUrlOrId]
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  extractGoogleSpreadsheetId,
  fetchSpreadsheetValues,
  getGoogleSheetsAccessToken,
  syncWorkspaceCrmToSheets,
} from "../lib/google-sheets-sync";
import { normalizeLeadAuthor } from "../lib/lead-author";

const DEFAULT_SHEET =
  "https://docs.google.com/spreadsheets/d/1KAoCo7_HHpleIs5eAKVhlsQLQuIkke-dAg-dQsYE7xs/edit";

function normalizeCompanyKey(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toDomainFromUrl(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "");
  } catch {
    return raw.replace(/^https?:\/\//i, "").split("/")[0]?.replace(/^www\./i, "") ?? "";
  }
}

async function main() {
  const sheetArg = process.argv[2] || DEFAULT_SHEET;
  const spreadsheetId = extractGoogleSpreadsheetId(sheetArg);
  if (!spreadsheetId) throw new Error("Neplatný spreadsheet.");

  const forcedId = process.env.WORKSPACE_ID?.trim();
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { leads: true } },
      googleSheetsConnection: { select: { status: true } },
    },
  });
  const workspace =
    (forcedId ? workspaces.find((w) => w.id === forcedId) : null) ??
    workspaces.find((w) => w.googleSheetsConnection?.status === "CONNECTED") ??
    [...workspaces].sort((a, b) => b._count.leads - a._count.leads)[0];
  if (!workspace) throw new Error("Žádný workspace.");

  const accessToken = await getGoogleSheetsAccessToken(workspace.id);
  if (!accessToken) throw new Error("Google Sheets není připojené.");

  console.log(`Workspace ${workspace.name} (${workspace.id})`);

  const existing = await prisma.lead.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      companyName: true,
      domain: true,
      email: true,
      contactEmail: true,
      author: true,
    },
  });

  type Existing = (typeof existing)[number];
  const byName = new Map<string, Existing>();
  const byEmail = new Map<string, Existing>();
  const byDomain = new Map<string, Existing>();
  for (const lead of existing) {
    const nk = normalizeCompanyKey(lead.companyName);
    if (nk) byName.set(nk, lead);
    for (const e of [lead.contactEmail, lead.email]) {
      const em = (e ?? "").trim().toLowerCase();
      if (em) byEmail.set(em, lead);
    }
    const d = (lead.domain ?? "").trim().toLowerCase();
    if (d) byDomain.set(d, lead);
  }

  let updated = 0;
  let matched = 0;
  const authorCounts: Record<string, number> = {};
  const rawAuthorSamples = new Map<string, number>();

  for (const sheetName of ["Master", "Sheet1", "Radar", "Sniper"] as const) {
    let rows: string[][] = [];
    try {
      rows = await fetchSpreadsheetValues({
        accessToken,
        spreadsheetId,
        range: `'${sheetName}'!A1:I`,
      });
    } catch (e) {
      console.log(sheetName, "skip", e instanceof Error ? e.message : e);
      continue;
    }
    if (rows.length <= 1) continue;
    console.log(`${sheetName}: ${rows.length - 1} řádků`);

    const header = rows[0]!.map((h) => h.trim().toLowerCase());
    const idx = {
      firma: header.findIndex((h) => h === "firma" || h === "company" || h === "název"),
      email: header.findIndex((h) => h === "email" || h === "e-mail"),
      url: header.findIndex((h) => h === "url" || h === "web" || h === "website"),
      autor: header.findIndex(
        (h) => h === "autor" || h === "author" || h === "vytvořil" || h === "vytvoril",
      ),
    };
    if (idx.firma < 0 || idx.autor < 0) {
      console.log("  skip — chybí Firma nebo Autor");
      continue;
    }

    for (const row of rows.slice(1)) {
      const companyName = (row[idx.firma] ?? "").trim();
      if (!companyName) continue;
      const rawAuthor = (row[idx.autor] ?? "").trim();
      if (rawAuthor) {
        rawAuthorSamples.set(rawAuthor, (rawAuthorSamples.get(rawAuthor) ?? 0) + 1);
      }
      const author = normalizeLeadAuthor(rawAuthor);
      if (!author || author === "Venegard") continue;

      const email =
        idx.email >= 0 ? (row[idx.email] ?? "").trim().toLowerCase() || null : null;
      const domain =
        idx.url >= 0 ? toDomainFromUrl(row[idx.url] ?? "") || null : null;
      const nameKey = normalizeCompanyKey(companyName);

      const match =
        (email && byEmail.get(email)) ||
        (domain && byDomain.get(domain.toLowerCase())) ||
        (nameKey && byName.get(nameKey)) ||
        null;
      if (!match) continue;
      matched += 1;
      if (match.author && sheetName !== "Master" && sheetName !== "Sheet1") continue;
      if (match.author === author) continue;

      await prisma.lead.update({ where: { id: match.id }, data: { author } });
      match.author = author;
      authorCounts[author] = (authorCounts[author] ?? 0) + 1;
      updated += 1;
    }
  }

  // Notion: Vytvořil Honza → Jan Sedlář jen kde autor ještě chybí
  const notionCsv = process.env.NOTION_CSV?.trim();
  if (notionCsv) {
    const { readFileSync } = await import("fs");
    const text = readFileSync(notionCsv, "utf8");
    function parseCsv(text: string): string[][] {
      const rows: string[][] = [];
      let row: string[] = [];
      let cur = "";
      let q = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]!;
        if (ch === '"') {
          if (q && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else q = !q;
          continue;
        }
        if (ch === "," && !q) {
          row.push(cur);
          cur = "";
          continue;
        }
        if ((ch === "\n" || ch === "\r") && !q) {
          if (ch === "\r" && text[i + 1] === "\n") i++;
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
          continue;
        }
        cur += ch;
      }
      if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
      }
      return rows;
    }
    const nrows = parseCsv(text.replace(/^\uFEFF/, ""));
    const header = (nrows[0] || []).map((x) => x.trim());
    const iName = header.findIndex((h) => /n[aá]zev/i.test(h));
    const iAuthor = header.findIndex((h) => /vytvo/i.test(h));
    let notionUpdated = 0;
    if (iName >= 0 && iAuthor >= 0) {
      for (const cols of nrows.slice(1)) {
        const companyName = (cols[iName] ?? "").trim();
        const author = normalizeLeadAuthor(cols[iAuthor] ?? "");
        if (!companyName || !author) continue;
        const nameKey = normalizeCompanyKey(companyName);
        const match = nameKey ? byName.get(nameKey) : null;
        if (!match || match.author) continue;
        await prisma.lead.update({ where: { id: match.id }, data: { author } });
        match.author = author;
        authorCounts[author] = (authorCounts[author] ?? 0) + 1;
        notionUpdated += 1;
        updated += 1;
      }
    }
    console.log(`Notion Vytvořil doplněno: ${notionUpdated}`);
  }

  console.log("Raw autoři ve Sheetu:", Object.fromEntries(rawAuthorSamples));
  console.log({ matched, updated, authorCounts });

  const sync = await syncWorkspaceCrmToSheets(workspace.id);
  console.log("Sheets sync:", sync);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
