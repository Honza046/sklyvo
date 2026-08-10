/**
 * Fakturoid API v3 — Client Credentials + invoices/subjects.
 * @see https://www.fakturoid.cz/api/v3
 */

const FAKTUROID_API = "https://app.fakturoid.cz/api/v3";

export function getFakturoidUserAgent(): string {
 const ua = process.env.FAKTUROID_USER_AGENT?.trim();
 if (ua) return ua;
 return "Sklyvo (podpora@venegard.com)";
}

export type FakturoidTokenResponse = {
 access_token: string;
 token_type: string;
 expires_in: number;
};

export type FakturoidAccount = {
 slug: string;
 name: string;
};

export type FakturoidUser = {
 email?: string;
 full_name?: string;
 accounts?: FakturoidAccount[];
};

export type FakturoidSubject = {
 id: number;
 name: string;
 registration_no?: string | null;
 email?: string | null;
};

export type FakturoidInvoice = {
 id: number;
 number?: string;
 html_url?: string;
 public_html_url?: string;
 subject_id?: number;
};

function basicAuthHeader(clientId: string, clientSecret: string): string {
 return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function fetchFakturoidToken(
 clientId: string,
 clientSecret: string,
): Promise<FakturoidTokenResponse> {
 const res = await fetch(`${FAKTUROID_API}/oauth/token`, {
 method: "POST",
 headers: {
 Authorization: basicAuthHeader(clientId, clientSecret),
 "Content-Type": "application/json",
 Accept: "application/json",
 "User-Agent": getFakturoidUserAgent(),
 },
 body: JSON.stringify({ grant_type: "client_credentials" }),
 });

 const body = (await res.json().catch(() => null)) as
 | FakturoidTokenResponse
 | { error?: string; error_description?: string }
 | null;

 if (!res.ok) {
 const msg =
 body && "error_description" in body && body.error_description
 ? body.error_description
 : body && "error" in body && body.error
 ? String(body.error)
 : `Fakturoid token error (${res.status})`;
 throw new Error(msg);
 }

 if (!body || !("access_token" in body) || !body.access_token) {
 throw new Error("Fakturoid nevrátil access token.");
 }

 return body;
}

async function fakturoidFetch<T>(
 path: string,
 accessToken: string,
 init?: RequestInit,
): Promise<T> {
 const res = await fetch(`${FAKTUROID_API}${path}`, {
 ...init,
 headers: {
 Authorization: `Bearer ${accessToken}`,
 Accept: "application/json",
 "Content-Type": "application/json",
 "User-Agent": getFakturoidUserAgent(),
 ...(init?.headers ?? {}),
 },
 });

 const text = await res.text();
 let json: unknown = null;
 if (text) {
 try {
 json = JSON.parse(text);
 } catch {
 json = null;
 }
 }

 if (!res.ok) {
 const errors =
 json && typeof json === "object" && json !== null && "errors" in json
 ? JSON.stringify((json as { errors: unknown }).errors)
 : text.slice(0, 300);
 throw new Error(
 errors
 ? `Fakturoid ${res.status}: ${errors}`
 : `Fakturoid požadavek selhal (${res.status}).`,
 );
 }

 return json as T;
}

export async function fetchFakturoidUser(accessToken: string): Promise<FakturoidUser> {
 return fakturoidFetch<FakturoidUser>("/user.json", accessToken);
}

export async function searchFakturoidSubjects(
 accessToken: string,
 slug: string,
 query: string,
): Promise<FakturoidSubject[]> {
 const q = encodeURIComponent(query.trim());
 if (!q) return [];
 return fakturoidFetch<FakturoidSubject[]>(
 `/accounts/${encodeURIComponent(slug)}/subjects/search.json?query=${q}`,
 accessToken,
 );
}

export async function createFakturoidSubject(
 accessToken: string,
 slug: string,
 input: {
 name: string;
 full_name?: string;
 email?: string;
 registration_no?: string;
 vat_no?: string;
 },
): Promise<FakturoidSubject> {
 return fakturoidFetch<FakturoidSubject>(
 `/accounts/${encodeURIComponent(slug)}/subjects.json`,
 accessToken,
 {
 method: "POST",
 body: JSON.stringify(input),
 },
 );
}

export async function createFakturoidInvoice(
 accessToken: string,
 slug: string,
 input: {
 subject_id: number;
 currency?: string;
 due?: number;
 note?: string;
 lines: Array<{
 name: string;
 quantity?: string | number;
 unit_price: string | number;
 vat_rate?: string | number;
 }>;
 },
): Promise<FakturoidInvoice> {
 return fakturoidFetch<FakturoidInvoice>(
 `/accounts/${encodeURIComponent(slug)}/invoices.json`,
 accessToken,
 {
 method: "POST",
 body: JSON.stringify({
 document_type: "invoice",
 ...input,
 }),
 },
 );
}

/** "14 dní" / "7 dní" / "ihned" → počet dní splatnosti */
export function parsePaymentDueDays(paymentTerms: string): number {
 const raw = paymentTerms.trim().toLowerCase();
 if (!raw || raw.includes("ihned") || raw === "0") return 0;
 const match = raw.match(/(\d+)/);
 if (match) return Number(match[1]);
 return 14;
}

/** "12 500 Kč" / "12500.50" → number string for API */
export function parseAmountToUnitPrice(amount: string): string | null {
 const cleaned = amount
 .replace(/\s/g, "")
 .replace(/,/g, ".")
 .replace(/[^\d.]/g, "");
 if (!cleaned) return null;
 const n = Number(cleaned);
 if (!Number.isFinite(n) || n < 0) return null;
 return n.toFixed(2);
}

export function invoicePublicUrl(invoice: FakturoidInvoice, slug: string): string | null {
 if (invoice.public_html_url) return invoice.public_html_url;
 if (invoice.html_url) return invoice.html_url;
 if (invoice.id) {
 return `https://app.fakturoid.cz/${encodeURIComponent(slug)}/invoices/${invoice.id}`;
 }
 return null;
}
