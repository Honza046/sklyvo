/**
 * One-off: import Notion „Databáze Potenciálních Klientů“ CSV into CRM.
 * Dedupes by company / email / domain; updates status + contact on match.
 *
 * Usage:
 * npx tsx scripts/import-notion-csv.ts [path-to.csv]
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "../lib/prisma";
import { syncWorkspaceCrmToSheets } from "../lib/google-sheets-sync";

type LeadStatus =
 | "NEW"
 | "CONTACTED"
 | "REPLIED"
 | "MEETING_SET"
 | "CLOSED_WON"
 | "CLOSED_LOST";

const DEFAULT_CSV =
 "/Users/honza/outreachagent_V2/tmp/notion-export/part1/file_1.csv";

function mapNotionStatus(raw: string): LeadStatus {
 const s = raw.trim().toLowerCase();
 if (!s || s.includes("nekontakt")) return "NEW";
 if (s.includes("follow")) return "REPLIED";
 if (s.includes("komunik")) return "MEETING_SET";
 if (s.includes("domluv") && !s.includes("ne")) return "CLOSED_WON";
 if (
 s.includes("break") ||
 s.includes("nemá zájem") ||
 s.includes("nema zajem") ||
 s.includes("nedomluv")
 ) {
 return "CLOSED_LOST";
 }
 // Kontaktováno / Neodpověděl
 return "CONTACTED";
}

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
 if (!raw || raw === "-") return "";
 try {
 const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
 return new URL(withProtocol).hostname.replace(/^www\./i, "");
 } catch {
 return raw.replace(/^https?:\/\//i, "").split("/")[0]?.replace(/^www\./i, "") ?? "";
 }
}

function cleanEmail(raw: string | null | undefined) {
 const e = (raw ?? "").trim().toLowerCase();
 if (!e || e === "-") return null;
 if (!e.includes("@")) return null;
 return e;
}

function cleanIndustry(raw: string | null | undefined) {
 const t = (raw ?? "").trim();
 if (!t) return null;
 // drop leading emoji / symbols for cleaner CRM
 return t.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "").trim() || t;
}

function parseCsv(text: string): Record<string, string>[] {
 const lines: string[] = [];
 let cur = "";
 let inQuotes = false;
 for (let i = 0; i < text.length; i++) {
 const ch = text[i]!;
 if (ch === '"') {
 if (inQuotes && text[i + 1] === '"') {
 cur += '"';
 i++;
 } else {
 inQuotes = !inQuotes;
 }
 continue;
 }
 if ((ch === "\n" || ch === "\r") && !inQuotes) {
 if (ch === "\r" && text[i + 1] === "\n") i++;
 lines.push(cur);
 cur = "";
 continue;
 }
 cur += ch;
 }
 if (cur.length) lines.push(cur);

 if (lines.length === 0) return [];
 const splitRow = (line: string) => {
 const cells: string[] = [];
 let cell = "";
 let q = false;
 for (let i = 0; i < line.length; i++) {
 const ch = line[i]!;
 if (ch === '"') {
 if (q && line[i + 1] === '"') {
 cell += '"';
 i++;
 } else q = !q;
 continue;
 }
 if (ch === "," && !q) {
 cells.push(cell);
 cell = "";
 continue;
 }
 cell += ch;
 }
 cells.push(cell);
 return cells;
 };

 const header = splitRow(lines[0]!).map((h) => h.replace(/^\uFEFF/, "").trim());
 const rows: Record<string, string>[] = [];
 for (const line of lines.slice(1)) {
 if (!line.trim()) continue;
 const cells = splitRow(line);
 const row: Record<string, string> = {};
 header.forEach((h, idx) => {
 row[h] = (cells[idx] ?? "").trim();
 });
 rows.push(row);
 }
 return rows;
}

async function main() {
 const csvPath = resolve(process.argv[2] || DEFAULT_CSV);
 const text = readFileSync(csvPath, "utf8");
 const rows = parseCsv(text);
 console.log(`CSV: ${csvPath} (${rows.length} řádků)`);

 const workspaces = await prisma.workspace.findMany({
 select: {
 id: true,
 name: true,
 _count: { select: { leads: true } },
 googleSheetsConnection: {
 select: { status: true, spreadsheetTitle: true },
 },
 },
 });
 if (workspaces.length === 0) {
 throw new Error("Žádný workspace v DB.");
 }

 const forcedId = process.env.WORKSPACE_ID?.trim();
 const workspace =
 (forcedId ? workspaces.find((w) => w.id === forcedId) : null) ??
 workspaces.find((w) => w.googleSheetsConnection?.status === "CONNECTED") ??
 [...workspaces].sort((a, b) => b._count.leads - a._count.leads)[0]!;

 if (forcedId && workspace.id !== forcedId) {
 throw new Error(`Workspace ${forcedId} nenalezen.`);
 }

 console.log(
 `Workspace: ${workspace.name} (${workspace.id}) — ${workspace._count.leads} leadů před importem` +
 (workspace.googleSheetsConnection?.spreadsheetTitle
 ? ` | Sheets: ${workspace.googleSheetsConnection.spreadsheetTitle}`
 : ""),
 );

 const existing = await prisma.lead.findMany({
 where: { workspaceId: workspace.id },
 select: {
 id: true,
 companyName: true,
 domain: true,
 email: true,
 contactEmail: true,
 status: true,
 industry: true,
 },
 });

 type Existing = (typeof existing)[number];
 const byName = new Map<string, Existing>();
 const byEmail = new Map<string, Existing>();
 const byDomain = new Map<string, Existing>();

 const indexLead = (lead: Existing) => {
 const nk = normalizeCompanyKey(lead.companyName);
 if (nk) byName.set(nk, lead);
 for (const e of [lead.contactEmail, lead.email]) {
 const em = cleanEmail(e);
 if (em) byEmail.set(em, lead);
 }
 const d = (lead.domain ?? "").trim().toLowerCase();
 if (d) byDomain.set(d, lead);
 };
 for (const lead of existing) indexLead(lead);

 let created = 0;
 let updated = 0;
 let skipped = 0;
 const batchSeenNames = new Set<string>();
 const batchSeenEmails = new Set<string>();
 const batchSeenDomains = new Set<string>();

 for (const row of rows) {
 const companyName = (row["Název Klienta"] ?? "").trim();
 if (!companyName) {
 skipped += 1;
 continue;
 }
 const status = mapNotionStatus(row["Aktuální Stav"] ?? "");
 const email = cleanEmail(row["Email"]);
 const domain = toDomainFromUrl(row["Hlavní Odkaz"]) || null;
 const industry = cleanIndustry(row["Obor"]);
 const nameKey = normalizeCompanyKey(companyName);

 const match =
 (email && byEmail.get(email)) ||
 (domain && byDomain.get(domain.toLowerCase())) ||
 (nameKey && byName.get(nameKey)) ||
 null;

 if (match) {
 const data: {
 status: LeadStatus;
 email?: string | null;
 contactEmail?: string | null;
 domain?: string | null;
 industry?: string | null;
 companyName?: string;
 } = { status };
 if (email && !cleanEmail(match.contactEmail ?? match.email)) {
 data.email = email;
 data.contactEmail = email;
 } else if (email) {
 data.contactEmail = email;
 data.email = email;
 }
 if (domain && !match.domain) data.domain = domain;
 if (industry && !match.industry) data.industry = industry;
 // Notion name often cleaner — keep existing name unless empty
 await prisma.lead.update({ where: { id: match.id }, data });
 const refreshed = { ...match, ...data, companyName: match.companyName };
 indexLead(refreshed as Existing);
 updated += 1;
 continue;
 }

 // skip duplicate within CSV batch
 if (
 (nameKey && batchSeenNames.has(nameKey)) ||
 (email && batchSeenEmails.has(email)) ||
 (domain && batchSeenDomains.has(domain.toLowerCase()))
 ) {
 skipped += 1;
 continue;
 }

 const createdLead = await prisma.lead.create({
 data: {
 workspaceId: workspace.id,
 companyName,
 domain,
 email,
 contactEmail: email,
 phone: null,
 contactPhone: null,
 industry,
 status,
 source: "MANUAL",
 value: 0,
 placeId: null,
 },
 select: {
 id: true,
 companyName: true,
 domain: true,
 email: true,
 contactEmail: true,
 status: true,
 industry: true,
 },
 });
 indexLead(createdLead);
 if (nameKey) batchSeenNames.add(nameKey);
 if (email) batchSeenEmails.add(email);
 if (domain) batchSeenDomains.add(domain.toLowerCase());
 created += 1;
 }

 const after = await prisma.lead.count({ where: { workspaceId: workspace.id } });
 console.log(
 `Hotovo: +${created} nových, ${updated} aktualizováno, ${skipped} přeskočeno. Celkem leadů: ${after}`,
 );

 console.log("Sync do Google Sheets…");
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
