/**
 * Deep website contact scrape — e-mail + telefon z homepage a kontaktních stránek.
 * Sdílené mezi Radar a CRM bulk enrich.
 */

import { assertSafeHttpUrl, safeFetchHtml } from "@/lib/ssrf-guard";

const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_CHARS = 400_000;

const BROWSER_UA =
 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CONTACT_EMAIL_LOCAL_PARTS = [
 "info",
 "kontakt",
 "contact",
 "office",
 "hello",
 "ahoj",
 "recepce",
 "support",
 "sales",
 "obchod",
 "mail",
 "kancelar",
 "kancelář",
 "poptavky",
 "poptávky",
];

/** Cesty typické pro CZ/SK/EN kontaktní stránky. */
const DEEP_CONTACT_PATHS = [
 "/kontakt",
 "/kontakty",
 "/contact",
 "/contacts",
 "/contact-us",
 "/contactus",
 "/o-nas",
 "/o-nas/",
 "/about",
 "/about-us",
 "/firma",
 "/company",
 "/impressum",
 "/imprint",
 "/napiste-nam",
 "/napiste",
 "/cs/kontakt",
 "/en/contact",
];

/** Extra cesty pro důkladnější CRM re-scan. */
const THOROUGH_CONTACT_PATHS = [
 ...DEEP_CONTACT_PATHS,
 "/kontaktujte-nas",
 "/kontaktujte",
 "/write-us",
 "/get-in-touch",
 "/team",
 "/tym",
 "/tým",
 "/people",
 "/lide",
 "/lidé",
 "/staff",
 "/footer",
 "/cs/kontakty",
 "/en/contacts",
 "/sk/kontakt",
 "/de/kontakt",
 "/de/impressum",
 "/privacy",
 "/ochrana-udaju",
 "/gdpr",
];

export type ScrapeWebsiteContactsOptions = {
 /** Více stránek, delší timeout — pro CRM „doplnit kontakt“. */
 thorough?: boolean;
};

export type ScrapedWebsiteContacts = {
 email: string | null;
 phone: string | null;
 pagesChecked: number;
};

export function parseWebsiteUrl(websiteUri: string): URL | null {
 return assertSafeHttpUrl(websiteUri);
}

function isValidScrapedEmail(email: string): boolean {
 const lower = email.toLowerCase();
 return (
 !lower.endsWith(".png") &&
 !lower.endsWith(".jpg") &&
 !lower.endsWith(".gif") &&
 !lower.endsWith(".webp") &&
 !lower.includes("sentry") &&
 !lower.includes("example.com") &&
 !lower.includes("wixpress.com") &&
 !lower.includes("schema.org") &&
 !lower.includes("email.com") &&
 !lower.includes("domain.com") &&
 !lower.includes("yourdomain") &&
 !lower.includes("sentry.io") &&
 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
 );
}

function pickBestContactEmail(emails: string[]): string | null {
 const valid = emails.map((e) => e.trim()).filter(isValidScrapedEmail);
 if (valid.length === 0) return null;

 const preferred = valid.find((email) => {
 const local = email.split("@")[0]?.toLowerCase() ?? "";
 return CONTACT_EMAIL_LOCAL_PARTS.some(
 (part) =>
 local === part ||
 local.startsWith(`${part}.`) ||
 local.startsWith(`${part}-`) ||
 local.startsWith(`${part}_`),
 );
 });

 return preferred ?? valid[0] ?? null;
}

function extractMailtoEmails(html: string): string[] {
 const found: string[] = [];
 const re = /href\s*=\s*["']mailto:([^"'?#]+)/gi;
 let match: RegExpExecArray | null;
 while ((match = re.exec(html)) !== null) {
 const raw = decodeURIComponent(match[1]!.trim()).split("?")[0]?.trim() ?? "";
 if (raw.includes("@")) found.push(raw);
 }
 return found;
}

export function extractEmailFromHtml(html: string): string | null {
 const mailtoEmails = extractMailtoEmails(html);
 if (mailtoEmails.length > 0) {
 return pickBestContactEmail(mailtoEmails);
 }

 const emails = html.match(/[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g);
 if (!emails || emails.length === 0) return null;
 return pickBestContactEmail(emails);
}

function extractTelHrefPhone(html: string): string | null {
 const re = /href\s*=\s*["']tel:\s*([^"']+)["']/gi;
 let m: RegExpExecArray | null;
 while ((m = re.exec(html)) !== null) {
 let v = decodeURIComponent(m[1]!.trim());
 v = v.replace(/^tel:/i, "").trim();
 v = v.split(";")[0]?.trim() ?? v;
 if (v.length < 7) continue;
 if (/^(javascript|void|#)/i.test(v)) continue;
 return normalizePhoneDisplay(v);
 }
 return null;
}

/** CZ/SK/intl telefony z textu (ne jen tel: odkazy). */
function extractTextPhones(html: string): string | null {
 const text = html
 .replace(/<script[\s\S]*?<\/script>/gi, " ")
 .replace(/<style[\s\S]*?<\/style>/gi, " ")
 .replace(/<[^>]+>/g, " ")
 .replace(/&nbsp;/gi, " ")
 .replace(/\s+/g, " ");

 const patterns = [
 /\+420[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g,
 /\+421[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g,
 /(?:^|[^\d])((?:\+|00)?420[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3})(?:[^\d]|$)/g,
 /(?:^|[^\d])([67]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})(?:[^\d]|$)/g,
 ];

 for (const re of patterns) {
 const m = text.match(re);
 if (!m) continue;
 for (const raw of m) {
 const digits = raw.replace(/\D/g, "");
 if (digits.length < 9 || digits.length > 15) continue;
 // reject years / IČ-like
 if (/^(19|20)\d{2}$/.test(digits)) continue;
 return normalizePhoneDisplay(raw.replace(/^[^\d+]+|[^\d]+$/g, "").trim());
 }
 }
 return null;
}

function normalizePhoneDisplay(raw: string): string {
 return raw.replace(/\s+/g, " ").trim();
}

export function extractPhoneFromHtml(html: string): string | null {
 return extractTelHrefPhone(html) ?? extractTextPhones(html);
}

/** Najde další kontaktní URL na stejné doméně z odkazů na homepage. */
function discoverContactLinks(html: string, origin: string, limit = 6): string[] {
 const found: string[] = [];
 const re = /href\s*=\s*["']([^"']+)["']/gi;
 let m: RegExpExecArray | null;
 const keywords =
 /kontakt|contact|about|o-nas|onas|impressum|firma|napiste|poptavk|en\/contact|cs\/kontakt|team|tym|tým|people|gdpr|privacy|ochrana/i;

 while ((m = re.exec(html)) !== null) {
 const href = (m[1] ?? "").trim();
 if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
 continue;
 }
 if (!keywords.test(href)) continue;
 try {
 const abs = new URL(href, origin);
 if (abs.origin !== origin) continue;
 found.push(abs.href.split("#")[0]!);
 } catch {
 /* ignore */
 }
 }
 return Array.from(new Set(found)).slice(0, limit);
}

function normalizeFetchKey(url: string): string {
 try {
 const u = new URL(url);
 const path = u.pathname.replace(/\/$/, "") || "";
 return `${u.origin}${path}`.toLowerCase();
 } catch {
 return url.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
 }
}

async function fetchPageHtml(
 url: string,
 timeoutMs = FETCH_TIMEOUT_MS,
): Promise<string | null> {
 const fetched = await safeFetchHtml(url, {
 timeoutMs,
 maxBodyChars: MAX_BODY_CHARS,
 headers: {
 "User-Agent": BROWSER_UA,
 Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
 },
 });
 if (!fetched.ok) return null;
 return fetched.html;
}

async function fetchPageHtmlOnce(
 url: string,
 seen: Set<string>,
 timeoutMs = FETCH_TIMEOUT_MS,
): Promise<string | null> {
 const key = normalizeFetchKey(url);
 if (seen.has(key)) return null;
 seen.add(key);
 return fetchPageHtml(url, timeoutMs);
}

/**
 * Deep scrape: homepage → objevené kontaktní odkazy → standardní cesty (/kontakt, /contact, …).
 * `thorough` projede více podstránek (CRM doplnění kontaktu).
 */
export async function scrapeWebsiteContacts(
 websiteUri: string,
 options?: ScrapeWebsiteContactsOptions,
): Promise<ScrapedWebsiteContacts> {
 const thorough = Boolean(options?.thorough);
 const timeoutMs = thorough ? 8_000 : FETCH_TIMEOUT_MS;
 const maxDiscovered = thorough ? 14 : 6;
 const paths = thorough ? THOROUGH_CONTACT_PATHS : DEEP_CONTACT_PATHS;

 const parsed = parseWebsiteUrl(websiteUri);
 if (!parsed) {
 return { email: null, phone: null, pagesChecked: 0 };
 }

 const homepage = parsed.href.split("#")[0]!;
 const origin = parsed.origin;
 let email: string | null = null;
 let phone: string | null = null;
 let pagesChecked = 0;

 const seen = new Set<string>();
 const queue: string[] = [homepage];

 for (const path of paths) {
 queue.push(`${origin}${path}`);
 }

 const homeHtml = await fetchPageHtmlOnce(homepage, seen, timeoutMs);
 if (homeHtml) {
 pagesChecked += 1;
 email = extractEmailFromHtml(homeHtml);
 phone = extractPhoneFromHtml(homeHtml);
 for (const link of discoverContactLinks(homeHtml, origin, maxDiscovered)) {
 queue.push(link);
 }
 }

 // homepage už je ve seen — zbytek fronty
 const rest = queue.filter((u) => !seen.has(normalizeFetchKey(u)));
 for (const pageUrl of rest) {
 if (email && phone) break;
 const html = await fetchPageHtmlOnce(pageUrl, seen, timeoutMs);
 if (!html) continue;
 pagesChecked += 1;
 if (!email) email = extractEmailFromHtml(html);
 if (!phone) phone = extractPhoneFromHtml(html);
 }

 return { email, phone, pagesChecked };
}

export async function mapPool<T, R>(
 items: T[],
 concurrency: number,
 worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
 const results: R[] = new Array(items.length);
 let next = 0;

 async function run() {
 while (next < items.length) {
 const i = next++;
 results[i] = await worker(items[i]!, i);
 }
 }

 const n = Math.max(1, Math.min(concurrency, items.length || 1));
 await Promise.all(Array.from({ length: n }, () => run()));
 return results;
}
