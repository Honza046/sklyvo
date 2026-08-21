"use server";

import { getSessionUser } from "@/app/actions/auth";
import {
  buildGoogleSheetsAuthorizeUrl,
  getGoogleSheetsOAuthConfig,
} from "@/lib/google-sheets-oauth";
import {
  extractGoogleSpreadsheetId,
  fetchSpreadsheetValues,
  getGoogleSheetsAccessToken,
  scheduleCrmSheetsSync,
  syncWorkspaceCrmToSheets,
} from "@/lib/google-sheets-sync";
import { normalizeLeadAuthor } from "@/lib/lead-author";
import { inferLeadTags } from "@/lib/lead-tags";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type GoogleSheetsConnectionState = {
  connected: boolean;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  accountEmail: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string | null;
  sheetName: string;
  splitBySource: boolean;
  /** Historická outreach DB — Radar podle ní vylučuje firmy. */
  archiveSpreadsheetId: string | null;
  archiveSpreadsheetUrl: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  oauthConfigured: boolean;
  /** Počet leadů v app CRM (pro přehled před vyčištěním). */
  crmLeadCount: number;
};

function disconnectedState(
  oauthConfigured: boolean,
): GoogleSheetsConnectionState {
  return {
    connected: false,
    status: "DISCONNECTED",
    accountEmail: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    spreadsheetTitle: null,
    sheetName: "Vše",
    splitBySource: false,
    archiveSpreadsheetId: null,
    archiveSpreadsheetUrl: null,
    syncEnabled: true,
    lastSyncedAt: null,
    lastError: null,
    oauthConfigured,
    crmLeadCount: 0,
  };
}

export async function getGoogleSheetsConnectionState(): Promise<GoogleSheetsConnectionState> {
  const { clientId, clientSecret } = getGoogleSheetsOAuthConfig();
  const oauthConfigured = Boolean(clientId && clientSecret);

  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return disconnectedState(oauthConfigured);
  }

  const [record, crmLeadCount] = await Promise.all([
    prisma.workspaceGoogleSheetsConnection.findUnique({
      where: { workspaceId },
    }),
    prisma.lead.count({ where: { workspaceId } }),
  ]);

  if (!record || record.status === "DISCONNECTED" || !record.spreadsheetId) {
    return {
      ...disconnectedState(oauthConfigured),
      archiveSpreadsheetId: record?.archiveSpreadsheetId ?? null,
      archiveSpreadsheetUrl: record?.archiveSpreadsheetUrl ?? null,
      lastError: record?.lastError ?? null,
      status: record?.status === "ERROR" ? "ERROR" : "DISCONNECTED",
      crmLeadCount,
    };
  }

  return {
    connected: record.status === "CONNECTED" || record.status === "ERROR",
    status: record.status,
    accountEmail: record.googleAccountEmail,
    spreadsheetId: record.spreadsheetId,
    spreadsheetUrl: record.spreadsheetUrl,
    spreadsheetTitle: record.spreadsheetTitle,
    sheetName: record.sheetName || "Vše",
    splitBySource: Boolean(record.splitBySource),
    archiveSpreadsheetId: record.archiveSpreadsheetId,
    archiveSpreadsheetUrl: record.archiveSpreadsheetUrl,
    syncEnabled: record.syncEnabled,
    lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null,
    lastError: record.lastError,
    oauthConfigured,
    crmLeadCount,
  };
}

export async function getGoogleSheetsOAuthUrl() {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const { clientId, clientSecret } = getGoogleSheetsOAuthConfig();
  if (!clientId || !clientSecret) {
    return {
      error:
        "Google Sheets OAuth není nakonfigurován. Přidejte GOOGLE_SHEETS_CLIENT_ID a GOOGLE_SHEETS_CLIENT_SECRET (nebo GOOGLE_EMAIL_*).",
    };
  }

  const url = buildGoogleSheetsAuthorizeUrl(
    session.user.workspaceId,
    process.env.GOOGLE_SHEETS_LOGIN_HINT?.trim() || session.user.email,
  );
  if (!url) {
    return { error: "Nepodařilo se sestavit Google OAuth URL." };
  }

  return { url };
}

export async function syncCrmToGoogleSheetsNow() {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const result = await syncWorkspaceCrmToSheets(workspaceId);
  if (result && "error" in result && result.error) {
    return { error: result.error };
  }
  if (result && "skipped" in result && result.skipped) {
    return { error: "Google Sheets není připojené nebo je sync vypnutý." };
  }

  revalidatePath("/settings");
  return {
    success: true as const,
    rowCount: result && "rowCount" in result ? result.rowCount : 0,
  };
}

export async function setGoogleSheetsSyncEnabled(enabled: boolean) {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  await prisma.workspaceGoogleSheetsConnection.updateMany({
    where: { workspaceId },
    data: { syncEnabled: enabled },
  });

  if (enabled) {
    scheduleCrmSheetsSync(workspaceId);
  }

  revalidatePath("/settings");
  return { success: true as const };
}

export async function disconnectGoogleSheets() {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  await prisma.workspaceGoogleSheetsConnection.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      status: "DISCONNECTED",
      syncEnabled: false,
    },
    update: {
      status: "DISCONNECTED",
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiresAt: null,
      googleAccountEmail: null,
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetTitle: null,
      syncEnabled: false,
      lastError: null,
      connectedAt: null,
      // archiveSpreadsheetId / Url zůstávají — Radar exclusion
    },
  });

  revalidatePath("/settings");
  return { success: true as const };
}

/**
 * Nastaví historickou outreach tabulku jako archiv pro Radar (vyloučení firem).
 * Nepřepisuje live Sklyvo CRM sheet.
 */
export async function setSheetsArchiveSpreadsheet(spreadsheetUrlOrId: string) {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const spreadsheetId = extractGoogleSpreadsheetId(spreadsheetUrlOrId);
  if (!spreadsheetId) {
    return { error: "Neplatná URL nebo ID Google Sheetu." };
  }

  const accessToken = await getGoogleSheetsAccessToken(workspaceId);
  if (!accessToken) {
    return { error: "Nejdřív připoj Google Sheets účet." };
  }

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,spreadsheetUrl`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const meta = (await metaRes.json()) as {
    properties?: { title?: string };
    spreadsheetUrl?: string;
    error?: { message?: string };
  };
  if (!metaRes.ok) {
    return {
      error: meta.error?.message ?? "Nepodařilo se otevřít archivní Sheet.",
    };
  }

  const url =
    meta.spreadsheetUrl ??
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  await prisma.workspaceGoogleSheetsConnection.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      status: "DISCONNECTED",
      archiveSpreadsheetId: spreadsheetId,
      archiveSpreadsheetUrl: url,
    },
    update: {
      archiveSpreadsheetId: spreadsheetId,
      archiveSpreadsheetUrl: url,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/radar");
  return {
    success: true as const,
    spreadsheetId,
    title: meta.properties?.title ?? null,
  };
}

/**
 * Smaže všechny leady z app CRM. Historický Google Sheet (archiv) zůstane.
 * Live Sklyvo sheet se při syncu přepíše jen novými leady (po smazání = prázdný).
 * Radar dál vylučuje firmy z archivu.
 */
export async function clearCrmLeadsKeepSheetsArchive(confirm: string) {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }
  if (confirm.trim().toUpperCase() !== "SMAZAT") {
    return { error: "Pro potvrzení napiš SMAZAT." };
  }

  const connection = await prisma.workspaceGoogleSheetsConnection.findUnique({
    where: { workspaceId },
    select: { archiveSpreadsheetId: true },
  });
  if (!connection?.archiveSpreadsheetId) {
    return {
      error:
        "Nejdřív nastav archivní outreach Sheet (Radar podle něj bude vylučovat staré firmy).",
    };
  }

  const deleted = await prisma.lead.deleteMany({ where: { workspaceId } });

  scheduleCrmSheetsSync(workspaceId);
  revalidatePath("/crm");
  revalidatePath("/settings");
  revalidatePath("/radar");

  return { success: true as const, deletedCount: deleted.count };
}

function mapLegacySheetStatus(
  raw: string,
):
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "MEETING_SET"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "BREAK_UP" {
  const s = raw.trim().toLowerCase();
  if (!s || s === "nový lead" || s === "novy lead") return "NEW";
  if (s.includes("break")) return "BREAK_UP";
  if (
    s.includes("nedomluv") ||
    s.includes("ztracen") ||
    s.includes("closed lost")
  ) {
    return "CLOSED_LOST";
  }
  if (s.includes("domluv") || s.includes("won")) return "CLOSED_WON";
  if (s.includes("schůzk") || s.includes("schuzk") || s.includes("komunik")) {
    return "MEETING_SET";
  }
  if (s.includes("odpověď") || s.includes("odpoved") || s.includes("follow")) {
    return "REPLIED";
  }
  return "CONTACTED";
}

function toDomainFromUrl(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "");
  } catch {
    return (
      raw
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        ?.replace(/^www\./i, "") ?? ""
    );
  }
}

function normalizeCompanyKey(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Napojí historickou outreach tabulku (listy Radar + Sniper) a importuje leady do CRM.
 * Další změny stavu v appce se syncují zpět do listů Radar / Sniper.
 */
export async function importHistoricalOutreachSheet(input: {
  spreadsheetUrlOrId: string;
  sheetName?: string;
}) {
  try {
    return await importHistoricalOutreachSheetInner(input);
  } catch (error) {
    console.error("importHistoricalOutreachSheet:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Import z Google Sheets selhal.",
    };
  }
}

async function importHistoricalOutreachSheetInner(input: {
  spreadsheetUrlOrId: string;
  sheetName?: string;
}) {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const spreadsheetId = extractGoogleSpreadsheetId(input.spreadsheetUrlOrId);
  if (!spreadsheetId) {
    return { error: "Neplatný odkaz nebo ID Google Sheetu." };
  }

  const accessToken = await getGoogleSheetsAccessToken(workspaceId);
  if (!accessToken) {
    const connection = await prisma.workspaceGoogleSheetsConnection.findUnique({
      where: { workspaceId },
      select: { lastError: true, status: true },
    });
    return {
      error:
        connection?.lastError?.trim() ||
        "Nejdřív připoj Google Sheets v Integracích (stejný Google účet, který má k tabulce přístup). Pokud už je připojené, Odpoj a Připoj znovu.",
    };
  }

  const sheetsToImport: Array<{ name: string; source: "RADAR" | "SNIPER" }> =
    input.sheetName?.trim()
      ? [
          {
            name: input.sheetName.trim(),
            source: /sniper/i.test(input.sheetName) ? "SNIPER" : "RADAR",
          },
        ]
      : [
          { name: "Radar", source: "RADAR" },
          { name: "Sniper", source: "SNIPER" },
        ];

  const existing = await prisma.lead.findMany({
    where: { workspaceId },
    select: { companyName: true, domain: true },
  });
  const existingNames = new Set(
    existing.map((l) => normalizeCompanyKey(l.companyName)).filter(Boolean),
  );
  const existingDomains = new Set(
    existing.map((l) => (l.domain ?? "").trim().toLowerCase()).filter(Boolean),
  );

  const toCreate: Array<{
    companyName: string;
    domain: string | null;
    placeId: null;
    email: string | null;
    phone: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    status:
      | "NEW"
      | "CONTACTED"
      | "REPLIED"
      | "MEETING_SET"
      | "CLOSED_WON"
      | "CLOSED_LOST"
      | "BREAK_UP";
    source: "RADAR" | "SNIPER";
    author: string | null;
    workspaceId: string;
    industry: null;
    value: number;
    tags: string[];
  }> = [];

  let skipped = 0;
  let totalRows = 0;
  const usedSheets: string[] = [];
  const batchNames = new Set<string>();
  const batchDomains = new Set<string>();
  let lastError = "";

  for (const sheet of sheetsToImport) {
    let rows: string[][] = [];
    try {
      rows = await fetchSpreadsheetValues({
        accessToken,
        spreadsheetId,
        range: `'${sheet.name.replace(/'/g, "''")}'!A1:I`,
      });
    } catch (e) {
      lastError =
        e instanceof Error ? e.message : "Sheet se nepodařilo načíst.";
      continue;
    }
    if (rows.length <= 1) continue;
    usedSheets.push(sheet.name);
    totalRows += rows.length - 1;

    const header = rows[0]!.map((h) => h.trim().toLowerCase());
    const idx = {
      firma: header.findIndex(
        (h) => h === "firma" || h === "company" || h === "název",
      ),
      email: header.findIndex((h) => h === "email" || h === "e-mail"),
      telefon: header.findIndex(
        (h) => h === "telefon" || h === "phone" || h === "tel",
      ),
      url: header.findIndex(
        (h) => h === "url" || h === "web" || h === "website",
      ),
      status: header.findIndex((h) => h === "status" || h === "stav"),
      nastroj: header.findIndex(
        (h) => h === "nástroj" || h === "nastroj" || h === "source",
      ),
      autor: header.findIndex(
        (h) =>
          h === "autor" ||
          h === "author" ||
          h === "vytvořil" ||
          h === "vytvoril",
      ),
    };
    if (idx.firma < 0) {
      return { error: `V listu ${sheet.name} chybí sloupec Firma.` };
    }

    for (const row of rows.slice(1)) {
      const companyName = (row[idx.firma] ?? "").trim();
      if (!companyName) {
        skipped += 1;
        continue;
      }
      const nameKey = normalizeCompanyKey(companyName);
      const url = idx.url >= 0 ? (row[idx.url] ?? "").trim() : "";
      const domain = toDomainFromUrl(url) || null;
      const email =
        idx.email >= 0
          ? (row[idx.email] ?? "").trim().toLowerCase() || null
          : null;
      const phone =
        idx.telefon >= 0 ? (row[idx.telefon] ?? "").trim() || null : null;
      const statusRaw = idx.status >= 0 ? (row[idx.status] ?? "") : "";
      const status = mapLegacySheetStatus(statusRaw);
      const author =
        idx.autor >= 0 ? normalizeLeadAuthor(row[idx.autor] ?? "") : null;

      let source = sheet.source;
      if (idx.nastroj >= 0) {
        const tool = (row[idx.nastroj] ?? "").trim().toLowerCase();
        if (tool.includes("sniper")) source = "SNIPER";
        else if (tool.includes("radar")) source = "RADAR";
      }

      if (
        (nameKey && (existingNames.has(nameKey) || batchNames.has(nameKey))) ||
        (domain &&
          (existingDomains.has(domain.toLowerCase()) ||
            batchDomains.has(domain.toLowerCase())))
      ) {
        skipped += 1;
        continue;
      }

      toCreate.push({
        companyName,
        domain,
        placeId: null,
        email,
        phone,
        contactEmail: email,
        contactPhone: phone,
        status,
        source,
        author,
        workspaceId,
        industry: null,
        value: 0,
        tags: inferLeadTags({ companyName, domain }),
      });
      if (nameKey) batchNames.add(nameKey);
      if (domain) batchDomains.add(domain.toLowerCase());
    }
  }

  if (usedSheets.length === 0) {
    return {
      error:
        lastError ||
        "Nenašel jsem listy Radar / Sniper s daty. Zkontroluj názvy listů v Google Sheetu.",
    };
  }

  const BATCH = 100;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    await prisma.lead.createMany({ data: toCreate.slice(i, i + BATCH) });
  }

  // Import jen doplní leady do CRM — nepřepisuje napojený Sklyvo Sheet.
  if (toCreate.length > 0) {
    scheduleCrmSheetsSync(workspaceId);
  }

  revalidatePath("/crm");
  revalidatePath("/radar");
  revalidatePath("/settings");
  revalidatePath("/");

  return {
    success: true as const,
    sheetName: usedSheets.join(" + "),
    createdCount: toCreate.length,
    skippedCount: skipped,
    totalRows,
  };
}

/**
 * Doplní Autor (Jan Sedlář / Matěj Pazdera / Filip Retzl) z outreach listů Radar + Sniper
 * k existujícím CRM leadům a propsaná do Google Sheets.
 */
export async function backfillAuthorsFromOutreachSheet(input: {
  spreadsheetUrlOrId: string;
}) {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const spreadsheetId = extractGoogleSpreadsheetId(input.spreadsheetUrlOrId);
  if (!spreadsheetId) {
    return { error: "Neplatný odkaz nebo ID Google Sheetu." };
  }

  const accessToken = await getGoogleSheetsAccessToken(workspaceId);
  if (!accessToken) {
    const connection = await prisma.workspaceGoogleSheetsConnection.findUnique({
      where: { workspaceId },
      select: { lastError: true },
    });
    return {
      error:
        connection?.lastError?.trim() ||
        "Nejdřív připoj Google Sheets v Integracích (stejný Google účet, který má k tabulce přístup). Pokud už je připojené, Odpoj a Připoj znovu.",
    };
  }

  const existing = await prisma.lead.findMany({
    where: { workspaceId },
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
  let withAuthor = 0;
  let totalRows = 0;
  const usedSheets: string[] = [];
  const authorCounts: Record<string, number> = {};

  for (const sheetName of ["Master", "Sheet1", "Radar", "Sniper"] as const) {
    let rows: string[][] = [];
    try {
      rows = await fetchSpreadsheetValues({
        accessToken,
        spreadsheetId,
        range: `'${sheetName}'!A1:I`,
      });
    } catch {
      continue;
    }
    if (rows.length <= 1) continue;
    usedSheets.push(sheetName);
    totalRows += rows.length - 1;

    const header = rows[0]!.map((h) => h.trim().toLowerCase());
    const idx = {
      firma: header.findIndex(
        (h) => h === "firma" || h === "company" || h === "název",
      ),
      email: header.findIndex((h) => h === "email" || h === "e-mail"),
      url: header.findIndex(
        (h) => h === "url" || h === "web" || h === "website",
      ),
      autor: header.findIndex(
        (h) =>
          h === "autor" ||
          h === "author" ||
          h === "vytvořil" ||
          h === "vytvoril",
      ),
    };
    if (idx.firma < 0 || idx.autor < 0) continue;

    for (const row of rows.slice(1)) {
      const companyName = (row[idx.firma] ?? "").trim();
      if (!companyName) continue;
      const author = normalizeLeadAuthor(row[idx.autor] ?? "");
      if (!author || author === "Sklyvo" || author === "Venegard") continue;
      withAuthor += 1;

      const email =
        idx.email >= 0
          ? (row[idx.email] ?? "").trim().toLowerCase() || null
          : null;
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

      // Master má prioritu — nepřepisuj Sedlář/Pazdera/Retzl slabším zdrojem
      if (match.author && sheetName !== "Master" && sheetName !== "Sheet1")
        continue;
      if (match.author === author) continue;
      await prisma.lead.update({
        where: { id: match.id },
        data: { author },
      });
      match.author = author;
      authorCounts[author] = (authorCounts[author] ?? 0) + 1;
      updated += 1;
    }
  }

  if (usedSheets.length === 0) {
    return {
      error: "Nenašel jsem listy Radar / Sniper se sloupcem Autor.",
    };
  }

  scheduleCrmSheetsSync(workspaceId);
  revalidatePath("/crm");
  revalidatePath("/settings");

  return {
    success: true as const,
    sheetName: usedSheets.join(" + "),
    totalRows,
    withAuthor,
    matched,
    updated,
    authorCounts,
  };
}

/** Doplní autory z připojeného Google Sheetu (URL uložené v integraci). */
export async function backfillAuthorsFromConnectedSheet() {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen.", updated: 0 };
  }

  const missing = await prisma.lead.count({
    where: {
      workspaceId,
      OR: [{ author: null }, { author: "" }],
    },
  });
  if (missing === 0) {
    return { success: true as const, updated: 0, skipped: true as const };
  }

  const conn = await prisma.workspaceGoogleSheetsConnection.findUnique({
    where: { workspaceId },
    select: { spreadsheetUrl: true, spreadsheetId: true },
  });
  const ref = (conn?.spreadsheetUrl || conn?.spreadsheetId || "").trim();
  if (!ref) {
    return {
      error: "Nejdřív připoj Google Sheets a nastav tabulku v Integracích.",
      updated: 0,
    };
  }

  const result = await backfillAuthorsFromOutreachSheet({
    spreadsheetUrlOrId: ref,
  });
  if ("error" in result && result.error) {
    return { error: result.error, updated: 0 };
  }
  return {
    success: true as const,
    updated: result.updated ?? 0,
    authorCounts: result.authorCounts,
  };
}
