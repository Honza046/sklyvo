/**
 * Favicon URL for a company domain — stored on Lead and shown in CRM avatars.
 * Uses Google's public favicon service (stable, no SSRF to customer sites).
 */

export function hostnameFromWebsite(value: string | null | undefined): string | null {
 const raw = (value ?? "").trim();
 if (!raw) return null;
 try {
 const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
 const host = new URL(withProtocol).hostname.replace(/^www\./i, "").toLowerCase();
 if (!host || !host.includes(".")) return null;
 return host;
 } catch {
 const cleaned = raw
 .replace(/^https?:\/\//i, "")
 .replace(/^www\./i, "")
 .split("/")[0]
 ?.trim()
 .toLowerCase();
 if (!cleaned || !cleaned.includes(".")) return null;
 return cleaned;
 }
}

/** Persistent favicon URL for a lead domain / website. */
export function buildLeadFaviconUrl(
 domainOrUrl: string | null | undefined,
 size: 32 | 64 | 128 = 64,
): string | null {
 const host = hostnameFromWebsite(domainOrUrl);
 if (!host) return null;
 return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}
