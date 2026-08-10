import { prisma } from "@/lib/prisma";
import { getMicrosoftOAuthConfig } from "@/lib/microsoft-oauth";
import { decryptSecret, encryptSecret } from "@/lib/email-connection-crypto";
import type { OfferGeneratorInput } from "@/lib/offer-pdf";

export type OneDriveFileRow = {
 id: string;
 name: string;
 mimeType: string;
 modifiedTime: string | null;
 sizeBytes: number | null;
 webUrl: string | null;
 isFolder: boolean;
};

async function getMicrosoftConnection(workspaceId: string) {
 return prisma.workspaceMicrosoftConnection.findUnique({
 where: { workspaceId },
 });
}

export async function getMicrosoftAccessToken(
 workspaceId: string,
): Promise<string | null> {
 const connection = await getMicrosoftConnection(workspaceId);
 if (
 !connection ||
 connection.status !== "CONNECTED" ||
 (!connection.msAccessToken && !connection.msRefreshToken)
 ) {
 return null;
 }

 const expiresAt = connection.msTokenExpiresAt?.getTime() ?? 0;
 const stillValid =
 connection.msAccessToken && expiresAt > Date.now() + 60_000;
 if (stillValid) {
 return decryptSecret(connection.msAccessToken);
 }

 const refreshPlain = decryptSecret(connection.msRefreshToken);
 if (!refreshPlain) {
 return decryptSecret(connection.msAccessToken);
 }

 const { clientId, clientSecret, redirectUri, tokenUrl, scope } =
 getMicrosoftOAuthConfig();
 if (!clientId || !clientSecret) return null;

 const response = await fetch(tokenUrl, {
 method: "POST",
 headers: { "Content-Type": "application/x-www-form-urlencoded" },
 body: new URLSearchParams({
 client_id: clientId,
 client_secret: clientSecret,
 refresh_token: refreshPlain,
 grant_type: "refresh_token",
 redirect_uri: redirectUri,
 scope,
 }),
 });

 const json = (await response.json()) as {
 access_token?: string;
 refresh_token?: string;
 expires_in?: number;
 error_description?: string;
 };

 if (!response.ok || !json.access_token) {
 await prisma.workspaceMicrosoftConnection.update({
 where: { workspaceId },
 data: {
 status: "ERROR",
 lastError: json.error_description || "Obnovení Microsoft tokenu selhalo.",
 },
 });
 return null;
 }

 const expires =
 typeof json.expires_in === "number"
 ? new Date(Date.now() + json.expires_in * 1000)
 : null;

 await prisma.workspaceMicrosoftConnection.update({
 where: { workspaceId },
 data: {
 status: "CONNECTED",
 msAccessToken: encryptSecret(json.access_token),
 ...(json.refresh_token
 ? { msRefreshToken: encryptSecret(json.refresh_token) }
 : {}),
 msTokenExpiresAt: expires,
 lastError: null,
 },
 });

 return json.access_token;
}

export async function listOneDriveFiles(
 workspaceId: string,
 query?: string,
): Promise<{ files: OneDriveFileRow[] } | { error: string }> {
 const accessToken = await getMicrosoftAccessToken(workspaceId);
 if (!accessToken) {
 return { error: "Microsoft účet není připojen." };
 }

 const needle = query?.trim();
 let url: string;
 if (needle) {
 const safe = needle.replace(/'/g, "''").slice(0, 80);
 url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${safe}')?$top=40&$select=id,name,file,folder,size,lastModifiedDateTime,webUrl`;
 } else {
 url =
 "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=40&$orderby=lastModifiedDateTime%20desc&$select=id,name,file,folder,size,lastModifiedDateTime,webUrl";
 }

 const response = await fetch(url, {
 headers: { Authorization: `Bearer ${accessToken}` },
 });
 const json = (await response.json()) as {
 value?: Array<{
 id?: string;
 name?: string;
 file?: { mimeType?: string };
 folder?: unknown;
 size?: number;
 lastModifiedDateTime?: string;
 webUrl?: string;
 }>;
 error?: { message?: string };
 };

 if (!response.ok) {
 return {
 error:
 json.error?.message ||
 "Nepodařilo se načíst OneDrive. Zkuste účet znovu připojit.",
 };
 }

 const files: OneDriveFileRow[] = (json.value ?? [])
 .filter((item) => item.id && item.name && !item.folder)
 .map((item) => ({
 id: item.id!,
 name: item.name!,
 mimeType: item.file?.mimeType || "application/octet-stream",
 modifiedTime: item.lastModifiedDateTime ?? null,
 sizeBytes: typeof item.size === "number" ? item.size : null,
 webUrl: item.webUrl ?? null,
 isFolder: false,
 }));

 return { files };
}

export async function downloadOneDriveFileBytes(
 workspaceId: string,
 fileId: string,
): Promise<
 | { bytes: Uint8Array; fileName: string; contentType: string }
 | { error: string }
> {
 const accessToken = await getMicrosoftAccessToken(workspaceId);
 if (!accessToken) return { error: "Microsoft účet není připojen." };

 const metaRes = await fetch(
 `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}?$select=id,name,file,size`,
 { headers: { Authorization: `Bearer ${accessToken}` } },
 );
 const meta = (await metaRes.json()) as {
 name?: string;
 file?: { mimeType?: string };
 size?: number;
 error?: { message?: string };
 };
 if (!metaRes.ok) {
 return { error: meta.error?.message || "Soubor na OneDrive nenalezen." };
 }

 const contentRes = await fetch(
 `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`,
 { headers: { Authorization: `Bearer ${accessToken}` }, redirect: "follow" },
 );
 if (!contentRes.ok) {
 return { error: "Stažení z OneDrive selhalo." };
 }

 const bytes = new Uint8Array(await contentRes.arrayBuffer());
 if (bytes.byteLength > 20 * 1024 * 1024) {
 return { error: "Soubor je příliš velký (max. 20 MB)." };
 }

 return {
 bytes,
 fileName: meta.name || "soubor",
 contentType: meta.file?.mimeType || "application/octet-stream",
 };
}

function escapeRtf(text: string): string {
 return text
 .replace(/\\/g, "\\\\")
 .replace(/\{/g, "\\{")
 .replace(/\}/g, "\\}")
 .replace(/\n/g, "\\par\n");
}

function buildOfferRtf(payload: OfferGeneratorInput): string {
 const kind = payload.type === "contract" ? "SMLOUVA" : "NABIDKA";
 const body = [
 kind,
 "",
 `Predmet: ${payload.subject}`,
 payload.clientCompany ? `Firma klienta: ${payload.clientCompany}` : "",
 payload.clientName ? `Kontakt: ${payload.clientName}` : "",
 payload.issuerCompany ? `Dodavatel: ${payload.issuerCompany}` : "",
 "",
 "Popis / rozsah:",
 payload.description || "-",
 "",
 payload.amount
 ? `Castka: ${payload.amount} ${payload.currency || "CZK"}`
 : "",
 payload.validUntil ? `Platnost do: ${payload.validUntil}` : "",
 payload.paymentTerms ? `Splatnost: ${payload.paymentTerms}` : "",
 payload.notes ? `\nPoznamky:\n${payload.notes}` : "",
 "",
 "Dokument vytvoren ve Sklyvo Generatoru.",
 ]
 .filter(Boolean)
 .join("\n");

 return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 ${escapeRtf(body)}}`;
}

function buildCrmCsv(
 rows: Array<{
 company: string;
 email: string;
 phone: string;
 url: string;
 status: string;
 author: string;
 }>,
): string {
 const header = ["Firma", "E-mail", "Telefon", "Web", "Status", "Autor"];
 const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
 const lines = [
 header.map(escape).join(";"),
 ...rows.map((r) =>
 [r.company, r.email, r.phone, r.url, r.status, r.author].map(escape).join(";"),
 ),
 ];
 // BOM for Excel
 return `\uFEFF${lines.join("\n")}`;
}

async function uploadToOneDrive(
 accessToken: string,
 fileName: string,
 bytes: Uint8Array,
 contentType: string,
): Promise<{ id: string; webUrl: string } | { error: string }> {
 const safeName = fileName.replace(/[\\/:*?"<>|]/g, "_");
 const response = await fetch(
 `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(safeName)}:/content`,
 {
 method: "PUT",
 headers: {
 Authorization: `Bearer ${accessToken}`,
 "Content-Type": contentType,
 },
 body: Buffer.from(bytes),
 },
 );
 const json = (await response.json()) as {
 id?: string;
 webUrl?: string;
 error?: { message?: string };
 };
 if (!response.ok || !json.id) {
 return {
 error: json.error?.message || "Upload do OneDrive selhal.",
 };
 }
 return { id: json.id, webUrl: json.webUrl || "" };
}

export async function createWordDocInOneDrive(
 workspaceId: string,
 payload: OfferGeneratorInput,
): Promise<{ fileId: string; webUrl: string } | { error: string }> {
 const accessToken = await getMicrosoftAccessToken(workspaceId);
 if (!accessToken) return { error: "Microsoft účet není připojen." };

 const label = payload.type === "contract" ? "Smlouva" : "Nabidka";
 const base =
 payload.clientCompany || payload.clientName || payload.subject || "dokument";
 const fileName = `${label}-${base}`.slice(0, 80) + ".rtf";
 const rtf = buildOfferRtf(payload);
 const uploaded = await uploadToOneDrive(
 accessToken,
 fileName,
 new TextEncoder().encode(rtf),
 "application/rtf",
 );
 if ("error" in uploaded) return uploaded;
 return { fileId: uploaded.id, webUrl: uploaded.webUrl };
}

export async function exportCrmCsvToOneDrive(
 workspaceId: string,
 rows: Array<{
 company: string;
 email: string;
 phone: string;
 url: string;
 status: string;
 author: string;
 }>,
): Promise<{ fileId: string; webUrl: string; fileName: string } | { error: string }> {
 const accessToken = await getMicrosoftAccessToken(workspaceId);
 if (!accessToken) return { error: "Microsoft účet není připojen." };

 const stamp = new Date().toISOString().slice(0, 10);
 const fileName = `Sklyvo-CRM-${stamp}.csv`;
 const csv = buildCrmCsv(rows);
 const uploaded = await uploadToOneDrive(
 accessToken,
 fileName,
 new TextEncoder().encode(csv),
 "text/csv",
 );
 if ("error" in uploaded) return uploaded;
 return { fileId: uploaded.id, webUrl: uploaded.webUrl, fileName };
}
