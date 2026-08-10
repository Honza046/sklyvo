import { lookup } from "dns/promises";
import { isIP } from "net";

/** Hostnames / IPs that must never be fetched by the server (SSRF). */
export function isBlockedHostname(hostname: string): boolean {
 const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
 if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
 if (h === "0.0.0.0" || h === "::1" || h === "::") return true;
 if (h === "metadata.google.internal") return true;
 if (h.endsWith(".internal") || h.endsWith(".intranet")) return true;

 if (isIP(h)) {
 return isBlockedIpLiteral(h);
 }

 if (/^127\.\d+\.\d+\.\d+$/.test(h)) return true;
 if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
 if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
 if (/^169\.254\.\d+\.\d+$/.test(h)) return true;
 const m = /^172\.(\d+)\.\d+\.\d+$/.exec(h);
 if (m) {
 const n = Number(m[1]);
 if (n >= 16 && n <= 31) return true;
 }
 // AWS / GCP metadata often via hostname or link-local
 if (h === "169.254.169.254") return true;
 return false;
}

function isBlockedIpLiteral(ip: string): boolean {
 if (ip === "::1" || ip === "::" || ip === "0.0.0.0") return true;
 if (ip.startsWith("127.")) return true;
 if (ip.startsWith("10.")) return true;
 if (ip.startsWith("192.168.")) return true;
 if (ip.startsWith("169.254.")) return true;
 const m = /^172\.(\d+)\./.exec(ip);
 if (m) {
 const n = Number(m[1]);
 if (n >= 16 && n <= 31) return true;
 }
 // IPv6 ULA / link-local
 if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return true;
 if (ip.toLowerCase().startsWith("fe80:")) return true;
 return false;
}

export function assertSafeHttpUrl(raw: string): URL | null {
 const withProtocol = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
 let u: URL;
 try {
 u = new URL(withProtocol);
 } catch {
 return null;
 }
 if (!["http:", "https:"].includes(u.protocol)) return null;
 if (u.username || u.password) return null;
 if (isBlockedHostname(u.hostname)) return null;
 return u;
}

/** Resolve DNS and reject if any A/AAAA is private / metadata. */
export async function assertResolvedHostIsPublic(hostname: string): Promise<boolean> {
 if (isBlockedHostname(hostname)) return false;
 if (isIP(hostname)) return !isBlockedIpLiteral(hostname);
 try {
 const records = await lookup(hostname, { all: true, verbatim: true });
 if (!records.length) return false;
 for (const rec of records) {
 if (isBlockedIpLiteral(rec.address)) return false;
 }
 return true;
 } catch {
 return false;
 }
}

/**
 * Safe fetch: validates URL, resolves DNS, follows redirects manually with re-checks.
 */
export async function safeFetchHtml(
 urlRaw: string,
 options: {
 timeoutMs: number;
 maxBodyChars: number;
 headers?: HeadersInit;
 maxRedirects?: number;
 },
): Promise<{ ok: true; url: string; html: string; status: number } | { ok: false; reason: string }> {
 const maxRedirects = options.maxRedirects ?? 5;
 let current = assertSafeHttpUrl(urlRaw);
 if (!current) return { ok: false, reason: "blocked_or_invalid_url" };

 for (let hop = 0; hop <= maxRedirects; hop += 1) {
 if (!(await assertResolvedHostIsPublic(current.hostname))) {
 return { ok: false, reason: "blocked_dns" };
 }

 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), options.timeoutMs);
 try {
 const res = await fetch(current.toString(), {
 signal: controller.signal,
 redirect: "manual",
 headers: options.headers,
 });

 if ([301, 302, 303, 307, 308].includes(res.status)) {
 const loc = res.headers.get("location");
 if (!loc) return { ok: false, reason: "redirect_missing" };
 const next = assertSafeHttpUrl(new URL(loc, current).toString());
 if (!next) return { ok: false, reason: "redirect_blocked" };
 current = next;
 continue;
 }

 if (!res.ok) return { ok: false, reason: `http_${res.status}` };

 // Final URL after opaque redirects (some runtimes still rewrite)
 if (res.url) {
 const finalUrl = assertSafeHttpUrl(res.url);
 if (!finalUrl) return { ok: false, reason: "final_url_blocked" };
 if (!(await assertResolvedHostIsPublic(finalUrl.hostname))) {
 return { ok: false, reason: "final_dns_blocked" };
 }
 }

 const html = (await res.text()).slice(0, options.maxBodyChars);
 return { ok: true, url: current.toString(), html, status: res.status };
 } catch {
 return { ok: false, reason: "fetch_error" };
 } finally {
 clearTimeout(timer);
 }
 }

 return { ok: false, reason: "too_many_redirects" };
}
