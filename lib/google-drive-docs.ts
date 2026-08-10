import { getGoogleSheetsAccessToken } from "@/lib/google-sheets-sync";
import type { OfferGeneratorInput } from "@/lib/offer-pdf";

export type GoogleDriveFileRow = {
 id: string;
 name: string;
 mimeType: string;
 modifiedTime: string | null;
 sizeBytes: number | null;
 webViewLink: string | null;
 isGoogleDoc: boolean;
 isFolder: boolean;
};

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";

export type ListDriveFilesOptions = {
 query?: string;
 folderId?: string | null;
};

export async function listWorkspaceDriveFiles(
 workspaceId: string,
 options?: string | ListDriveFilesOptions,
): Promise<{ files: GoogleDriveFileRow[] } | { error: string }> {
 const accessToken = await getGoogleSheetsAccessToken(workspaceId);
 if (!accessToken) {
 return { error: "Google účet není připojen. Připojte Google v Nastavení nebo zde." };
 }

 const opts: ListDriveFilesOptions =
 typeof options === "string" ? { query: options } : options ?? {};
 const needle = opts.query?.trim();
 const folderId = opts.folderId?.trim() || null;

 const qParts = ["trashed = false"];
 if (needle) {
 const safe = needle.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
 qParts.push(`name contains '${safe}'`);
 } else {
 // Browse mode: show children of folder (or My Drive root)
 const parent = folderId ? folderId.replace(/'/g, "\\'") : "root";
 qParts.push(`'${parent}' in parents`);
 }

 const params = new URLSearchParams({
 q: qParts.join(" and "),
 pageSize: "80",
 // Folders first, then newest
 orderBy: "folder,modifiedTime desc",
 fields: "files(id,name,mimeType,modifiedTime,size,webViewLink)",
 supportsAllDrives: "true",
 includeItemsFromAllDrives: "true",
 });

 const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
 headers: { Authorization: `Bearer ${accessToken}` },
 });
 const json = (await response.json()) as {
 files?: Array<{
 id?: string;
 name?: string;
 mimeType?: string;
 modifiedTime?: string;
 size?: string;
 webViewLink?: string;
 }>;
 error?: { message?: string };
 };

 if (!response.ok) {
 return {
 error:
 json.error?.message ||
 "Nepodařilo se načíst soubory z Google Drive. Zkuste účet znovu připojit (nová oprávnění).",
 };
 }

 const files: GoogleDriveFileRow[] = (json.files ?? [])
 .filter((f) => f.id && f.name)
 .map((f) => {
 const mimeType = f.mimeType || "application/octet-stream";
 return {
 id: f.id!,
 name: f.name!,
 mimeType,
 modifiedTime: f.modifiedTime ?? null,
 sizeBytes: f.size ? Number(f.size) : null,
 webViewLink: f.webViewLink ?? null,
 isGoogleDoc: mimeType === GOOGLE_DOC_MIME,
 isFolder: mimeType === GOOGLE_FOLDER_MIME,
 };
 });

 return { files };
}

export async function downloadDriveFileBytes(
 workspaceId: string,
 fileId: string,
 mimeType: string,
): Promise<
 | { bytes: Uint8Array; fileName: string; contentType: string }
 | { error: string }
> {
 const accessToken = await getGoogleSheetsAccessToken(workspaceId);
 if (!accessToken) {
 return { error: "Google účet není připojen." };
 }

 const metaRes = await fetch(
 `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`,
 { headers: { Authorization: `Bearer ${accessToken}` } },
 );
 const meta = (await metaRes.json()) as {
 name?: string;
 mimeType?: string;
 size?: string;
 error?: { message?: string };
 };
 if (!metaRes.ok) {
 return { error: meta.error?.message || "Soubor na Drive nebyl nalezen." };
 }

 const name = meta.name || "soubor";
 const type = meta.mimeType || mimeType;
 const isGoogleNative = type.startsWith("application/vnd.google-apps.");

 let downloadUrl: string;
 let contentType: string;
 let fileName = name;

 if (isGoogleNative) {
 downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent("application/pdf")}`;
 contentType = "application/pdf";
 if (!fileName.toLowerCase().endsWith(".pdf")) {
 fileName = `${fileName}.pdf`;
 }
 } else {
 downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
 contentType = type || "application/octet-stream";
 }

 const fileRes = await fetch(downloadUrl, {
 headers: { Authorization: `Bearer ${accessToken}` },
 });
 if (!fileRes.ok) {
 const errText = await fileRes.text().catch(() => "");
 return {
 error:
 errText.slice(0, 200) ||
 "Stažení z Google Drive selhalo. Zkontrolujte oprávnění a zkuste znovu připojit účet.",
 };
 }

 const buffer = new Uint8Array(await fileRes.arrayBuffer());
 if (buffer.byteLength > 20 * 1024 * 1024) {
 return { error: "Soubor je příliš velký (max. 20 MB)." };
 }

 return { bytes: buffer, fileName, contentType };
}

function buildDocPlainText(payload: OfferGeneratorInput): string {
 const kind = payload.type === "contract" ? "SMLOUVA" : "NABÍDKA";
 const lines = [
 kind,
 "",
 `Předmět: ${payload.subject}`,
 payload.clientCompany ? `Firma klienta: ${payload.clientCompany}` : null,
 payload.clientName ? `Kontakt: ${payload.clientName}` : null,
 payload.issuerCompany ? `Dodavatel: ${payload.issuerCompany}` : null,
 payload.issuerName ? `Zpracoval: ${payload.issuerName}` : null,
 "",
 "Popis / rozsah:",
 payload.description || "—",
 "",
 payload.amount
 ? `Částka: ${payload.amount} ${payload.currency || "CZK"}`
 : null,
 payload.validUntil ? `Platnost do: ${payload.validUntil}` : null,
 payload.paymentTerms ? `Splatnost: ${payload.paymentTerms}` : null,
 payload.notes ? `\nPoznámky / podmínky:\n${payload.notes}` : null,
 "",
 "Dokument vytvořen ve Sklyvo Generátoru.",
 ];
 return lines.filter((line) => line != null).join("\n");
}

export async function createGoogleDocFromOffer(
 workspaceId: string,
 payload: OfferGeneratorInput,
): Promise<{ docId: string; docUrl: string } | { error: string }> {
 const accessToken = await getGoogleSheetsAccessToken(workspaceId);
 if (!accessToken) {
 return { error: "Google účet není připojen. Připojte Google a zkuste znovu." };
 }

 const title =
 payload.subject.trim() ||
 (payload.type === "contract" ? "Smlouva" : "Nabídka");

 const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({ title }),
 });
 const created = (await createRes.json()) as {
 documentId?: string;
 error?: { message?: string };
 };
 if (!createRes.ok || !created.documentId) {
 return {
 error:
 created.error?.message ||
 "Vytvoření Google Doc selhalo. Znovu připojte Google účet (nová oprávnění Docs).",
 };
 }

 const text = buildDocPlainText(payload);
 const updateRes = await fetch(
 `https://docs.googleapis.com/v1/documents/${encodeURIComponent(created.documentId)}:batchUpdate`,
 {
 method: "POST",
 headers: {
 Authorization: `Bearer ${accessToken}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 requests: [
 {
 insertText: {
 location: { index: 1 },
 text,
 },
 },
 ],
 }),
 },
 );

 if (!updateRes.ok) {
 const err = (await updateRes.json().catch(() => null)) as {
 error?: { message?: string };
 } | null;
 return {
 error: err?.error?.message || "Nepodařilo se zapsat obsah do Google Doc.",
 };
 }

 return {
 docId: created.documentId,
 docUrl: `https://docs.google.com/document/d/${created.documentId}/edit`,
 };
}

export async function listWorkspaceGoogleDocs(
 workspaceId: string,
 query?: string,
): Promise<{ files: GoogleDriveFileRow[] } | { error: string }> {
 const accessToken = await getGoogleSheetsAccessToken(workspaceId);
 if (!accessToken) {
 return { error: "Google účet není připojen. Připojte Google Docs v Generátoru nebo Úložišti." };
 }

 const qParts = [
 "trashed = false",
 `mimeType = '${GOOGLE_DOC_MIME}'`,
 ];
 const needle = query?.trim();
 if (needle) {
 const safe = needle.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
 qParts.push(`name contains '${safe}'`);
 }

 const params = new URLSearchParams({
 q: qParts.join(" and "),
 pageSize: "30",
 orderBy: "modifiedTime desc",
 fields: "files(id,name,mimeType,modifiedTime,size,webViewLink)",
 supportsAllDrives: "true",
 includeItemsFromAllDrives: "true",
 });

 const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
 headers: { Authorization: `Bearer ${accessToken}` },
 });
 const json = (await response.json()) as {
 files?: Array<{
 id?: string;
 name?: string;
 mimeType?: string;
 modifiedTime?: string;
 size?: string;
 webViewLink?: string;
 }>;
 error?: { message?: string };
 };

 if (!response.ok) {
 return {
 error:
 json.error?.message ||
 "Nepodařilo se načíst Google Docs. Zkuste účet znovu připojit.",
 };
 }

 const files: GoogleDriveFileRow[] = (json.files ?? [])
 .filter((f) => f.id && f.name)
 .map((f) => ({
 id: f.id!,
 name: f.name!,
 mimeType: f.mimeType || GOOGLE_DOC_MIME,
 modifiedTime: f.modifiedTime ?? null,
 sizeBytes: f.size ? Number(f.size) : null,
 webViewLink:
 f.webViewLink ??
 `https://docs.google.com/document/d/${f.id}/edit`,
 isGoogleDoc: true,
 isFolder: false,
 }));

 return { files };
}
