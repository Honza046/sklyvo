import { prisma } from "@/lib/prisma";
import { getGoogleSheetsOAuthConfig } from "@/lib/google-sheets-oauth";
import { decryptSecret, encryptSecret } from "@/lib/email-connection-crypto";

export const CRM_SHEET_HEADERS = [
 "ID",
 "Firma",
 "Web",
 "E-mail",
 "Telefon",
 "Stav",
 "Hodnota (Kč)",
 "Obor",
 "Zdroj",
 "Autor",
 "Vytvořeno",
 "Aktualizováno",
] as const;

const STATUS_LABELS: Record<string, string> = {
 NEW: "Nový lead",
 CONTACTED: "Kontaktováno",
 REPLIED: "Follow up",
 MEETING_SET: "Komunikace",
 CLOSED_WON: "Domluveno",
 CLOSED_LOST: "Nedomluveno",
 BREAK_UP: "Breakup",
};

/** Formát historické outreach DB (listy Radar / Sniper). */
export const OUTREACH_SHEET_HEADERS = [
 "Datum",
 "Firma",
 "Nástroj",
 "Autor",
 "Email",
 "Telefon",
 "URL",
 "Status",
] as const;

const SOURCE_TOOL_LABEL: Record<string, string> = {
 RADAR: "Radar",
 SNIPER: "Sniper",
 MANUAL: "Manuální",
 AUTOPILOT: "Autopilot",
};

const pendingSync = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleCrmSheetsSync(workspaceId: string) {
 if (!workspaceId) return;
 const existing = pendingSync.get(workspaceId);
 if (existing) clearTimeout(existing);
 pendingSync.set(
 workspaceId,
 setTimeout(() => {
 pendingSync.delete(workspaceId);
 void syncWorkspaceCrmToSheets(workspaceId).catch((error) => {
 console.error("scheduleCrmSheetsSync:", error);
 });
 }, 1200),
 );
}

async function refreshAccessToken(refreshToken: string) {
 const { clientId, clientSecret } = getGoogleSheetsOAuthConfig();
 if (!clientId || !clientSecret) {
 throw new Error("Google Sheets OAuth není nakonfigurován.");
 }

 const response = await fetch("https://oauth2.googleapis.com/token", {
 method: "POST",
 headers: { "Content-Type": "application/x-www-form-urlencoded" },
 body: new URLSearchParams({
 client_id: clientId,
 client_secret: clientSecret,
 refresh_token: refreshToken,
 grant_type: "refresh_token",
 }),
 });

 const json = (await response.json()) as {
 access_token?: string;
 expires_in?: number;
 error_description?: string;
 };

 if (!response.ok || !json.access_token) {
 throw new Error(json.error_description ?? "Obnova Google tokenu selhala.");
 }

 return {
 accessToken: json.access_token,
 expiresAt:
 typeof json.expires_in === "number"
 ? new Date(Date.now() + json.expires_in * 1000)
 : null,
 };
}

async function getValidAccessToken(workspaceId: string) {
 const connection = await prisma.workspaceGoogleSheetsConnection.findUnique({
 where: { workspaceId },
 });

 if (!connection || connection.status !== "CONNECTED" || !connection.syncEnabled) {
 return null;
 }
 if (!connection.spreadsheetId || !connection.googleRefreshToken) {
 return null;
 }

 const accessToken = await resolveAccessToken(workspaceId, connection);
 if (!accessToken) return null;
 return { connection, accessToken };
}

/** Access token for any Sheets API call (import historické DB, sync, …). */
export async function getGoogleSheetsAccessToken(workspaceId: string): Promise<string | null> {
 const connection = await prisma.workspaceGoogleSheetsConnection.findUnique({
 where: { workspaceId },
 });
 if (!connection?.googleRefreshToken) return null;
 if (connection.status !== "CONNECTED" && connection.status !== "ERROR") {
 return null;
 }
 return resolveAccessToken(workspaceId, connection);
}

async function resolveAccessToken(
 workspaceId: string,
 connection: {
 googleAccessToken: string | null;
 googleRefreshToken: string | null;
 googleTokenExpiresAt: Date | null;
 },
): Promise<string | null> {
 const refreshPlain = decryptSecret(connection.googleRefreshToken);
 if (!refreshPlain) return null;

 const stillValid =
 connection.googleAccessToken &&
 connection.googleTokenExpiresAt &&
 connection.googleTokenExpiresAt.getTime() > Date.now() + 60_000;

 if (stillValid && connection.googleAccessToken) {
 const accessPlain = decryptSecret(connection.googleAccessToken);
 if (accessPlain) return accessPlain;
 }

 const refreshed = await refreshAccessToken(refreshPlain);
 await prisma.workspaceGoogleSheetsConnection.update({
 where: { workspaceId },
 data: {
 googleAccessToken: encryptSecret(refreshed.accessToken),
 googleTokenExpiresAt: refreshed.expiresAt,
 lastError: null,
 },
 });

 return refreshed.accessToken;
}

export function extractGoogleSpreadsheetId(input: string): string | null {
 const raw = input.trim();
 if (!raw) return null;
 if (/^[a-zA-Z0-9-_]{20,}$/.test(raw) && !raw.includes("/")) return raw;
 const fromUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
 return fromUrl?.[1] ?? null;
}

export async function fetchSpreadsheetValues(input: {
 accessToken: string;
 spreadsheetId: string;
 range: string;
}): Promise<string[][]> {
 const response = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(input.range)}`,
 { headers: { Authorization: `Bearer ${input.accessToken}` } },
 );
 const json = (await response.json()) as {
 values?: string[][];
 error?: { message?: string };
 };
 if (!response.ok) {
 throw new Error(json.error?.message ?? "Nepodařilo se načíst data ze Sheetu.");
 }
 return json.values ?? [];
}

export type SheetsArchiveExclusionKeys = {
 domains: Set<string>;
 names: Set<string>;
 emails: Set<string>;
};

function normalizeArchiveDomain(raw: string | null | undefined): string | null {
 const s = (raw ?? "").trim();
 if (!s) return null;
 try {
 const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
 const host = u.hostname.toLowerCase().replace(/^www\./i, "");
 return host || null;
 } catch {
 const cleaned = s.replace(/^https?:\/\//i, "").split("/")[0]?.trim().toLowerCase() ?? "";
 return cleaned.replace(/^www\./i, "") || null;
 }
}

function normalizeArchiveCompany(name: string | null | undefined): string {
 return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function headerIndex(headers: string[], ...candidates: string[]): number {
 const normalized = headers.map((h) => h.trim().toLowerCase());
 for (const c of candidates) {
 const i = normalized.indexOf(c.toLowerCase());
 if (i >= 0) return i;
 }
 return -1;
}

/**
 * Načte firmy / domény / e-maily z historické outreach tabulky
 * (Master, Sheet1, Radar, Sniper) — pro vyloučení v Radaru bez CRM v appce.
 */
export async function loadSheetsArchiveExclusionKeys(
 workspaceId: string,
): Promise<SheetsArchiveExclusionKeys> {
 const empty: SheetsArchiveExclusionKeys = {
 domains: new Set(),
 names: new Set(),
 emails: new Set(),
 };

 const connection = await prisma.workspaceGoogleSheetsConnection.findUnique({
 where: { workspaceId },
 select: { archiveSpreadsheetId: true },
 });
 const spreadsheetId = connection?.archiveSpreadsheetId?.trim();
 if (!spreadsheetId) return empty;

 const accessToken = await getGoogleSheetsAccessToken(workspaceId);
 if (!accessToken) return empty;

 const metaRes = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
 { headers: { Authorization: `Bearer ${accessToken}` } },
 );
 const meta = (await metaRes.json()) as {
 sheets?: { properties?: { title?: string } }[];
 error?: { message?: string };
 };
 if (!metaRes.ok) {
 console.warn("[sheets-archive] meta failed:", meta.error?.message);
 return empty;
 }

 const preferred = ["Master", "Sheet1", "Radar", "Sniper", "Vše", "CRM"];
 const titles = (meta.sheets ?? [])
 .map((s) => s.properties?.title?.trim())
 .filter((t): t is string => Boolean(t));
 const sheetsToRead = [
 ...preferred.filter((t) => titles.includes(t)),
 ...titles.filter((t) => !preferred.includes(t)),
 ].slice(0, 8);

 for (const title of sheetsToRead) {
 try {
 const rows = await fetchSpreadsheetValues({
 accessToken,
 spreadsheetId,
 range: `'${title.replace(/'/g, "''")}'!A:H`,
 });
 if (rows.length < 2) continue;

 const headers = rows[0] ?? [];
 const firmaIdx = headerIndex(headers, "Firma", "Company", "Název", "Název Klienta");
 const urlIdx = headerIndex(headers, "URL", "Web", "Website", "Hlavní Odkaz");
 const emailIdx = headerIndex(headers, "Email", "E-mail");

 for (let i = 1; i < rows.length; i++) {
 const row = rows[i] ?? [];
 const name = firmaIdx >= 0 ? normalizeArchiveCompany(row[firmaIdx]) : "";
 if (name) empty.names.add(name);

 const dom =
 urlIdx >= 0 ? normalizeArchiveDomain(row[urlIdx]) : null;
 if (dom) empty.domains.add(dom);

 const email = emailIdx >= 0 ? (row[emailIdx] ?? "").trim().toLowerCase() : "";
 if (email && email.includes("@")) empty.emails.add(email);
 }
 } catch (err) {
 console.warn(`[sheets-archive] read ${title} failed:`, err);
 }
 }

 return empty;
}

function leadToRow(lead: {
 id: string;
 companyName: string;
 domain: string | null;
 contactEmail: string | null;
 email: string | null;
 contactPhone: string | null;
 phone: string | null;
 status: string;
 value: number | null;
 industry: string | null;
 author?: string | null;
 source?: string | null;
 placeId: string | null;
 createdAt: Date;
 updatedAt: Date;
}): string[] {
 const sourceLabel =
 (lead.source && SOURCE_TOOL_LABEL[lead.source]) ||
 (lead.placeId ? "Radar" : "Manuální");
 return [
 lead.id,
 lead.companyName,
 lead.domain ?? "",
 (lead.contactEmail ?? lead.email ?? "").trim(),
 (lead.contactPhone ?? lead.phone ?? "").trim(),
 STATUS_LABELS[lead.status] ?? lead.status,
 String(lead.value ?? 0),
 lead.industry ?? "",
 sourceLabel,
 (lead.author ?? "").trim(),
 lead.createdAt.toLocaleString("cs-CZ"),
 lead.updatedAt.toLocaleString("cs-CZ"),
 ];
}

/** Stavy CRM boardu — přímo jako spodní listy (hned po ruce). */
export const SKLYVO_STATUS_TABS = [
 { title: "Nový lead", status: "NEW" },
 { title: "Kontaktováno", status: "CONTACTED" },
 { title: "Follow up", status: "REPLIED" },
 { title: "Komunikace", status: "MEETING_SET" },
 { title: "Domluveno", status: "CLOSED_WON" },
 { title: "Nedomluveno", status: "CLOSED_LOST" },
 { title: "Breakup", status: "BREAK_UP" },
] as const;

const ALL_TAB = "Vše" as const;

/** Spodní listy = stavy + kompletní přehled. */
export const SKLYVO_CRM_TABS = [
 ...SKLYVO_STATUS_TABS.map((t) => t.title),
 ALL_TAB,
] as const;

/** Zdroje (Radar / Sniper / …) — filtrované pohledy na listu Vše. */
export const SKLYVO_SOURCE_VIEWS = [
 { title: "Radar", value: "Radar" },
 { title: "Sniper", value: "Sniper" },
 { title: "Manuální", value: "Manuální" },
] as const;

const TAB_COLORS: Record<string, { red: number; green: number; blue: number }> = {
 "Nový lead": { red: 0.45, green: 0.5, blue: 0.55 },
 Kontaktováno: { red: 0.23, green: 0.51, blue: 0.96 },
 "Follow up": { red: 0.96, green: 0.62, blue: 0.04 },
 Komunikace: { red: 0.55, green: 0.36, blue: 0.96 },
 Domluveno: { red: 0.06, green: 0.73, blue: 0.51 },
 Nedomluveno: { red: 0.94, green: 0.28, blue: 0.4 },
 Breakup: { red: 0.55, green: 0.27, blue: 0.07 },
 Vše: { red: 0.15, green: 0.23, blue: 0.35 },
};

const ZDROJ_COLUMN_INDEX = CRM_SHEET_HEADERS.indexOf("Zdroj");

export async function createCrmSpreadsheet(
 accessToken: string,
 title: string,
 _sheetName = ALL_TAB,
) {
 const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 properties: { title },
 sheets: SKLYVO_CRM_TABS.map((tabTitle, index) => ({
 properties: {
 title: tabTitle,
 index,
 tabColor: TAB_COLORS[tabTitle],
 },
 })),
 }),
 });

 const json = (await response.json()) as {
 spreadsheetId?: string;
 spreadsheetUrl?: string;
 error?: { message?: string };
 };

 if (!response.ok || !json.spreadsheetId) {
 throw new Error(json.error?.message ?? "Nepodařilo se vytvořit Google Sheet.");
 }

 return {
 spreadsheetId: json.spreadsheetId,
 spreadsheetUrl:
 json.spreadsheetUrl ??
 `https://docs.google.com/spreadsheets/d/${json.spreadsheetId}/edit`,
 };
}

async function sheetsBatchUpdate(
 accessToken: string,
 spreadsheetId: string,
 requests: Array<Record<string, unknown>>,
) {
 if (requests.length === 0) return;
 const response = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
 {
 method: "POST",
 headers: {
 Authorization: `Bearer ${accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({ requests }),
 },
 );
 if (!response.ok) {
 const err = (await response.json()) as { error?: { message?: string } };
 throw new Error(err.error?.message ?? "Nepodařilo se upravit Sheet.");
 }
}

async function fetchSheetProperties(accessToken: string, spreadsheetId: string) {
 const metaResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
 { headers: { Authorization: `Bearer ${accessToken}` } },
 );
 const meta = (await metaResponse.json()) as {
 sheets?: Array<{ properties?: { title?: string; sheetId?: number; index?: number } }>;
 error?: { message?: string };
 };
 if (!metaResponse.ok) {
 throw new Error(meta.error?.message ?? "Nepodařilo se načíst listy Sheetu.");
 }
 return meta.sheets ?? [];
}

async function ensureSklyvoCrmTabs(accessToken: string, spreadsheetId: string) {
 const desired = SKLYVO_CRM_TABS as readonly string[];
 const desiredSet = new Set<string>(desired);

 // ── 1) Přejmenovat legacy přehled → Vše (pokud Vše chybí) ──
 {
 const sheets = await fetchSheetProperties(accessToken, spreadsheetId);
 const titles = new Set(sheets.map((s) => s.properties?.title).filter(Boolean) as string[]);
 const renameRequests: Array<Record<string, unknown>> = [];

 if (!titles.has(ALL_TAB)) {
 for (const legacyTitle of ["Hromadné CRM", "CRM"] as const) {
 const legacy = sheets.find((s) => s.properties?.title === legacyTitle);
 if (legacy?.properties?.sheetId == null) continue;
 renameRequests.push({
 updateSheetProperties: {
 properties: {
 sheetId: legacy.properties.sheetId,
 title: ALL_TAB,
 tabColor: TAB_COLORS[ALL_TAB],
 },
 fields: "title,tabColor",
 },
 });
 break;
 }
 }
 await sheetsBatchUpdate(accessToken, spreadsheetId, renameRequests);
 }

 // ── 2) Nejdřív PŘIDAT chybějící listy (nikdy nemaž dřív — Google nepovolí 0 listů) ──
 {
 const sheets = await fetchSheetProperties(accessToken, spreadsheetId);
 const titles = new Set(sheets.map((s) => s.properties?.title).filter(Boolean) as string[]);
 const addRequests: Array<Record<string, unknown>> = [];
 for (const title of desired) {
 if (titles.has(title)) continue;
 addRequests.push({
 addSheet: {
 properties: { title, tabColor: TAB_COLORS[title] },
 },
 });
 }
 await sheetsBatchUpdate(accessToken, spreadsheetId, addRequests);
 }

 // ── 3) Pořadí + barvy ──
 {
 const sheets = await fetchSheetProperties(accessToken, spreadsheetId);
 const orderRequests: Array<Record<string, unknown>> = [];
 for (let index = 0; index < desired.length; index++) {
 const title = desired[index]!;
 const sheet = sheets.find((s) => s.properties?.title === title);
 if (sheet?.properties?.sheetId == null) continue;
 orderRequests.push({
 updateSheetProperties: {
 properties: {
 sheetId: sheet.properties.sheetId,
 index,
 tabColor: TAB_COLORS[title],
 },
 fields: "index,tabColor",
 },
 });
 }
 await sheetsBatchUpdate(accessToken, spreadsheetId, orderRequests);
 }

 // ── 4) Smazat přebytečné listy až když desired už existují (nikdy 0 listů) ──
 {
 const sheets = await fetchSheetProperties(accessToken, spreadsheetId);
 const desiredCount = sheets.filter(
 (s) => s.properties?.title && desiredSet.has(s.properties.title),
 ).length;
 if (desiredCount < desired.length) return;

 const deleteRequests: Array<Record<string, unknown>> = [];
 let remaining = sheets.length;

 for (const sheet of sheets) {
 const title = sheet.properties?.title;
 const sheetId = sheet.properties?.sheetId;
 if (!title || sheetId == null || desiredSet.has(title)) continue;
 if (
 title !== "Radar" &&
 title !== "Sniper" &&
 title !== "Autopilot" &&
 title !== "Hromadné CRM" &&
 title !== "CRM"
 ) {
 continue;
 }
 if (remaining <= 1) break;
 deleteRequests.push({ deleteSheet: { sheetId } });
 remaining -= 1;
 }

 await sheetsBatchUpdate(accessToken, spreadsheetId, deleteRequests);
 }
}

/** Filtrované pohledy podle zdroje na listu Vše. */
async function syncSourceFilterViews(input: {
 accessToken: string;
 spreadsheetId: string;
 sheetName: string;
 rowCount: number;
}) {
 if (ZDROJ_COLUMN_INDEX < 0) return;

 const metaResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}?fields=sheets.properties,sheets.filterViews`,
 { headers: { Authorization: `Bearer ${input.accessToken}` } },
 );
 if (!metaResponse.ok) return;

 const meta = (await metaResponse.json()) as {
 sheets?: Array<{
 properties?: { title?: string; sheetId?: number };
 filterViews?: Array<{ filterViewId?: number; title?: string }>;
 }>;
 };

 const sheet = meta.sheets?.find((s) => s.properties?.title === input.sheetName);
 if (!sheet?.properties?.sheetId) return;
 const sheetId = sheet.properties.sheetId;

 const managedTitles = new Set<string>([
 ...SKLYVO_SOURCE_VIEWS.map((v) => v.title as string),
 // staré statusové pohledy uklidit
 "Nový lead",
 "Kontaktováno",
 "Follow up",
 "Komunikace",
 "Domluveno",
 "Nedomluveno",
 "Autopilot",
 ]);
 const requests: Array<Record<string, unknown>> = [];

 for (const fv of sheet.filterViews ?? []) {
 if (fv.filterViewId != null && fv.title && managedTitles.has(fv.title)) {
 requests.push({ deleteFilterView: { filterId: fv.filterViewId } });
 }
 }

 const endRow = Math.max(input.rowCount, 2);
 const endCol = CRM_SHEET_HEADERS.length;

 for (const view of SKLYVO_SOURCE_VIEWS) {
 requests.push({
 addFilterView: {
 filter: {
 title: view.title,
 range: {
 sheetId,
 startRowIndex: 0,
 endRowIndex: endRow,
 startColumnIndex: 0,
 endColumnIndex: endCol,
 },
 filterSpecs: [
 {
 columnIndex: ZDROJ_COLUMN_INDEX,
 filterCriteria: {
 condition: {
 type: "TEXT_EQ",
 values: [{ userEnteredValue: view.value }],
 },
 },
 },
 ],
 },
 },
 });
 }

 try {
 await sheetsBatchUpdate(input.accessToken, input.spreadsheetId, requests);
 } catch (error) {
 console.error("syncSourceFilterViews:", error);
 }
}

async function clearAndWriteSheetValues(input: {
 accessToken: string;
 spreadsheetId: string;
 sheetName: string;
 values: string[][];
 columnRange?: string;
}) {
 const cols = input.columnRange ?? "A:L";
 const range = `'${input.sheetName.replace(/'/g, "''")}'!${cols}`;

 const clearResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
 {
 method: "POST",
 headers: {
 Authorization: `Bearer ${input.accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({}),
 },
 );
 if (!clearResponse.ok) {
 const err = (await clearResponse.json()) as { error?: { message?: string } };
 throw new Error(err.error?.message ?? `Nepodařilo se vyčistit list ${input.sheetName}.`);
 }

 const writeResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
 {
 method: "PUT",
 headers: {
 Authorization: `Bearer ${input.accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({ values: input.values }),
 },
 );
 if (!writeResponse.ok) {
 const err = (await writeResponse.json()) as { error?: { message?: string } };
 throw new Error(err.error?.message ?? `Nepodařilo se zapsat list ${input.sheetName}.`);
 }

 await applyCrmSheetFormatting({
 accessToken: input.accessToken,
 spreadsheetId: input.spreadsheetId,
 sheetName: input.sheetName,
 rowCount: input.values.length,
 });
}

export async function writeCrmLeadsToSheet(input: {
 accessToken: string;
 spreadsheetId: string;
 sheetName: string;
 workspaceId: string;
}) {
 const leads = await prisma.lead.findMany({
 where: { workspaceId: input.workspaceId },
 orderBy: { createdAt: "desc" },
 select: {
 id: true,
 companyName: true,
 domain: true,
 contactEmail: true,
 email: true,
 contactPhone: true,
 phone: true,
 status: true,
 value: true,
 industry: true,
 author: true,
 source: true,
 placeId: true,
 createdAt: true,
 updatedAt: true,
 },
 });

 const values: string[][] = [
 [...CRM_SHEET_HEADERS],
 ...leads.map((lead) => leadToRow(lead)),
 ];

 await clearAndWriteSheetValues({
 accessToken: input.accessToken,
 spreadsheetId: input.spreadsheetId,
 sheetName: input.sheetName,
 values,
 });

 return { rowCount: leads.length };
}

/** Sklyvo CRM: listy podle stavů (board) + Vše; zdroje jako filtrované pohledy. */
export async function writeSklyvoCrmWorkbook(input: {
 accessToken: string;
 spreadsheetId: string;
 workspaceId: string;
}) {
 await ensureSklyvoCrmTabs(input.accessToken, input.spreadsheetId);

 const leads = await prisma.lead.findMany({
 where: { workspaceId: input.workspaceId },
 orderBy: { createdAt: "desc" },
 select: {
 id: true,
 companyName: true,
 domain: true,
 contactEmail: true,
 email: true,
 contactPhone: true,
 phone: true,
 status: true,
 value: true,
 industry: true,
 author: true,
 source: true,
 placeId: true,
 createdAt: true,
 updatedAt: true,
 },
 });

 const byTab: Record<string, typeof leads> = {
 [ALL_TAB]: leads,
 };
 for (const { title, status } of SKLYVO_STATUS_TABS) {
 byTab[title] = leads.filter((l) => l.status === status);
 }

 for (const tab of SKLYVO_CRM_TABS) {
 const tabLeads = byTab[tab] ?? [];
 const values: string[][] = [
 [...CRM_SHEET_HEADERS],
 ...tabLeads.map((lead) => leadToRow(lead)),
 ];
 await clearAndWriteSheetValues({
 accessToken: input.accessToken,
 spreadsheetId: input.spreadsheetId,
 sheetName: tab,
 values,
 });
 }

 await syncSourceFilterViews({
 accessToken: input.accessToken,
 spreadsheetId: input.spreadsheetId,
 sheetName: ALL_TAB,
 rowCount: leads.length + 1,
 });

 return { rowCount: leads.length };
}

function leadToOutreachRow(
 lead: {
 companyName: string;
 domain: string | null;
 contactEmail: string | null;
 email: string | null;
 contactPhone: string | null;
 phone: string | null;
 status: string;
 source: string;
 createdAt: Date;
 },
 authorName: string,
): string[] {
 const url = lead.domain
 ? lead.domain.startsWith("http")
 ? lead.domain
 : `https://${lead.domain}`
 : "";
 return [
 lead.createdAt.toLocaleDateString("cs-CZ"),
 lead.companyName,
 SOURCE_TOOL_LABEL[lead.source] ?? lead.source,
 authorName,
 (lead.contactEmail ?? lead.email ?? "").trim(),
 (lead.contactPhone ?? lead.phone ?? "").trim(),
 url,
 STATUS_LABELS[lead.status] ?? lead.status,
 ];
}

async function writeOutreachTab(input: {
 accessToken: string;
 spreadsheetId: string;
 sheetName: string;
 rows: string[][];
}) {
 const range = `'${input.sheetName.replace(/'/g, "''")}'!A:H`;
 const clearResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
 {
 method: "POST",
 headers: {
 Authorization: `Bearer ${input.accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({}),
 },
 );
 if (!clearResponse.ok) {
 const err = (await clearResponse.json()) as { error?: { message?: string } };
 throw new Error(err.error?.message ?? `Nepodařilo se vyčistit list ${input.sheetName}.`);
 }

 const values = [[...OUTREACH_SHEET_HEADERS], ...input.rows];
 const writeResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
 {
 method: "PUT",
 headers: {
 Authorization: `Bearer ${input.accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({ values }),
 },
 );
 if (!writeResponse.ok) {
 const err = (await writeResponse.json()) as { error?: { message?: string } };
 throw new Error(err.error?.message ?? `Nepodařilo se zapsat list ${input.sheetName}.`);
 }

 return values.length - 1;
}

/** Sync do listů Radar + Sniper v napojené outreach tabulce. */
export async function writeSplitOutreachSheets(input: {
 accessToken: string;
 spreadsheetId: string;
 workspaceId: string;
 authorName?: string;
}) {
 const author = (input.authorName ?? "Sklyvo").trim() || "Sklyvo";
 const leads = await prisma.lead.findMany({
 where: { workspaceId: input.workspaceId },
 orderBy: { createdAt: "desc" },
 select: {
 companyName: true,
 domain: true,
 contactEmail: true,
 email: true,
 contactPhone: true,
 phone: true,
 status: true,
 source: true,
 author: true,
 createdAt: true,
 },
 });

 const radarRows = leads
 .filter((l) => l.source === "RADAR" || l.source === "AUTOPILOT")
 .map((l) => leadToOutreachRow(l, (l.author ?? author).trim() || author));
 const sniperRows = leads
 .filter((l) => l.source === "SNIPER" || l.source === "MANUAL")
 .map((l) => leadToOutreachRow(l, (l.author ?? author).trim() || author));

 const radarCount = await writeOutreachTab({
 accessToken: input.accessToken,
 spreadsheetId: input.spreadsheetId,
 sheetName: "Radar",
 rows: radarRows,
 });
 const sniperCount = await writeOutreachTab({
 accessToken: input.accessToken,
 spreadsheetId: input.spreadsheetId,
 sheetName: "Sniper",
 rows: sniperRows,
 });

 return { rowCount: radarCount + sniperCount, radarCount, sniperCount };
}

/** Pixel widths — ID stays in data but is hidden; focus on firma / web / email / phone. */
const COLUMN_WIDTHS_PX = [
 90, // ID (hidden)
 260, // Firma
 220, // Web
 280, // E-mail
 160, // Telefon
 130, // Stav
 110, // Hodnota
 140, // Obor
 100, // Zdroj
 140, // Autor
 160, // Vytvořeno
 160, // Aktualizováno
] as const;

async function getSheetIdByTitle(
 accessToken: string,
 spreadsheetId: string,
 sheetName: string,
): Promise<number | null> {
 const response = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
 { headers: { Authorization: `Bearer ${accessToken}` } },
 );
 const json = (await response.json()) as {
 sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
 error?: { message?: string };
 };
 if (!response.ok) {
 throw new Error(json.error?.message ?? "Nepodařilo se načíst metadata Sheetu.");
 }
 const match = json.sheets?.find((s) => s.properties?.title === sheetName);
 return match?.properties?.sheetId ?? json.sheets?.[0]?.properties?.sheetId ?? null;
}

async function applyCrmSheetFormatting(input: {
 accessToken: string;
 spreadsheetId: string;
 sheetName: string;
 rowCount: number;
}) {
 const sheetId = await getSheetIdByTitle(
 input.accessToken,
 input.spreadsheetId,
 input.sheetName,
 );
 if (sheetId === null) return;

 const lastCol = CRM_SHEET_HEADERS.length;
 const lastRow = Math.max(input.rowCount, 1);
 const dataEndRow = Math.max(lastRow, 2);

 const requests: Record<string, unknown>[] = [
 // Freeze header row
 {
 updateSheetProperties: {
 properties: {
 sheetId,
 gridProperties: { frozenRowCount: 1 },
 },
 fields: "gridProperties.frozenRowCount",
 },
 },
 // Hide technical ID column — still written for sync, not needed in day-to-day view
 {
 updateDimensionProperties: {
 range: {
 sheetId,
 dimension: "COLUMNS",
 startIndex: 0,
 endIndex: 1,
 },
 properties: { hiddenByUser: true },
 fields: "hiddenByUser",
 },
 },
 // Column widths
 ...COLUMN_WIDTHS_PX.map((pixelSize, index) => ({
 updateDimensionProperties: {
 range: {
 sheetId,
 dimension: "COLUMNS",
 startIndex: index,
 endIndex: index + 1,
 },
 properties: { pixelSize },
 fields: "pixelSize",
 },
 })),
 // Clear previous formatting on used range
 {
 repeatCell: {
 range: {
 sheetId,
 startRowIndex: 0,
 endRowIndex: dataEndRow,
 startColumnIndex: 0,
 endColumnIndex: lastCol,
 },
 cell: {
 userEnteredFormat: {
 backgroundColor: { red: 1, green: 1, blue: 1 },
 textFormat: {
 foregroundColor: { red: 0.12, green: 0.16, blue: 0.23 },
 fontFamily: "Arial",
 fontSize: 10,
 bold: false,
 },
 horizontalAlignment: "LEFT",
 verticalAlignment: "MIDDLE",
 wrapStrategy: "CLIP",
 },
 },
 fields:
 "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
 },
 },
 // Header style
 {
 repeatCell: {
 range: {
 sheetId,
 startRowIndex: 0,
 endRowIndex: 1,
 startColumnIndex: 0,
 endColumnIndex: lastCol,
 },
 cell: {
 userEnteredFormat: {
 backgroundColor: { red: 0.15, green: 0.39, blue: 0.92 },
 textFormat: {
 foregroundColor: { red: 1, green: 1, blue: 1 },
 fontFamily: "Arial",
 fontSize: 11,
 bold: true,
 },
 horizontalAlignment: "LEFT",
 verticalAlignment: "MIDDLE",
 wrapStrategy: "OVERFLOW_CELL",
 },
 },
 fields:
 "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
 },
 },
 // Zebra rows for data
 {
 addBanding: {
 bandedRange: {
 range: {
 sheetId,
 startRowIndex: 0,
 endRowIndex: dataEndRow,
 startColumnIndex: 0,
 endColumnIndex: lastCol,
 },
 rowProperties: {
 headerColor: { red: 0.15, green: 0.39, blue: 0.92 },
 firstBandColor: { red: 1, green: 1, blue: 1 },
 secondBandColor: { red: 0.94, green: 0.96, blue: 1 },
 },
 },
 },
 },
 // Filter on header (replaces existing filter if any)
 {
 setBasicFilter: {
 filter: {
 range: {
 sheetId,
 startRowIndex: 0,
 endRowIndex: dataEndRow,
 startColumnIndex: 0,
 endColumnIndex: lastCol,
 },
 },
 },
 },
 // Value column right-aligned
 {
 repeatCell: {
 range: {
 sheetId,
 startRowIndex: 1,
 endRowIndex: dataEndRow,
 startColumnIndex: 6,
 endColumnIndex: 7,
 },
 cell: {
 userEnteredFormat: {
 horizontalAlignment: "RIGHT",
 numberFormat: { type: "NUMBER", pattern: "#,##0" },
 },
 },
 fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
 },
 },
 // Comfortable row height for header
 {
 updateDimensionProperties: {
 range: {
 sheetId,
 dimension: "ROWS",
 startIndex: 0,
 endIndex: 1,
 },
 properties: { pixelSize: 36 },
 fields: "pixelSize",
 },
 },
 ];

 // Remove existing bandings first so re-sync doesn't stack duplicates
 const metaResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}?fields=sheets.bandedRanges,sheets.properties.sheetId`,
 { headers: { Authorization: `Bearer ${input.accessToken}` } },
 );
 const meta = (await metaResponse.json()) as {
 sheets?: Array<{
 properties?: { sheetId?: number };
 bandedRanges?: Array<{ bandedRangeId?: number }>;
 }>;
 };
 const clearBandingRequests =
 meta.sheets
 ?.filter((s) => s.properties?.sheetId === sheetId)
 .flatMap((s) => s.bandedRanges ?? [])
 .filter((b) => typeof b.bandedRangeId === "number")
 .map((b) => ({
 deleteBanding: { bandedRangeId: b.bandedRangeId },
 })) ?? [];

 const batchResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${input.spreadsheetId}:batchUpdate`,
 {
 method: "POST",
 headers: {
 Authorization: `Bearer ${input.accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 requests: [...clearBandingRequests, ...requests],
 }),
 },
 );

 if (!batchResponse.ok) {
 const err = (await batchResponse.json()) as { error?: { message?: string } };
 // Formatting is best-effort — data write already succeeded
 console.error("applyCrmSheetFormatting:", err.error?.message ?? batchResponse.status);
 }
}

async function spreadsheetLooksLikeSklyvoCrm(
 accessToken: string,
 spreadsheetId: string,
): Promise<boolean> {
 const metaResponse = await fetch(
 `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
 { headers: { Authorization: `Bearer ${accessToken}` } },
 );
 if (!metaResponse.ok) return false;
 const meta = (await metaResponse.json()) as {
 sheets?: Array<{ properties?: { title?: string } }>;
 };
 const titles = (meta.sheets ?? [])
 .map((s) => s.properties?.title ?? "")
 .filter(Boolean);
 return titles.some(
 (t) =>
 t === "CRM" ||
 t === "Hromadné CRM" ||
 t === "Vše" ||
 t === "Autopilot" ||
 t === "Nový lead" ||
 t === "Kontaktováno" ||
 t === "Domluveno" ||
 /^sklyvo/i.test(t) ||
 /^venegard/i.test(t),
 );
}

export async function syncWorkspaceCrmToSheets(workspaceId: string) {
 try {
 const auth = await getValidAccessToken(workspaceId);
 if (!auth) return { skipped: true as const };

 const title = auth.connection.spreadsheetTitle ?? "";
 const looksSklyvo =
 /(?:sklyvo|venegard)\s*crm/i.test(title) ||
 (await spreadsheetLooksLikeSklyvoCrm(
 auth.accessToken,
 auth.connection.spreadsheetId!,
 ));

 // Historická outreach DB jen když sync není na Sklyvo CRM sheet.
 const useOutreachSplit =
 Boolean(auth.connection.splitBySource) && !looksSklyvo;

 const result = useOutreachSplit
 ? await writeSplitOutreachSheets({
 accessToken: auth.accessToken,
 spreadsheetId: auth.connection.spreadsheetId!,
 workspaceId,
 })
 : await writeSklyvoCrmWorkbook({
 accessToken: auth.accessToken,
 spreadsheetId: auth.connection.spreadsheetId!,
 workspaceId,
 });

 await prisma.workspaceGoogleSheetsConnection.update({
 where: { workspaceId },
 data: {
 lastSyncedAt: new Date(),
 lastError: null,
 status: "CONNECTED",
 ...(!useOutreachSplit
 ? { sheetName: "Vše", splitBySource: false }
 : {}),
 },
 });

 return { success: true as const, rowCount: result.rowCount };
 } catch (error) {
 const message = error instanceof Error ? error.message : "Sync selhal.";
 await prisma.workspaceGoogleSheetsConnection
 .update({
 where: { workspaceId },
 data: { lastError: message, status: "ERROR" },
 })
 .catch(() => {});
 return { error: message };
 }
}
