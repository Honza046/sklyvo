/** Hostname without www, lowercase — matches CRM domain storage. */
export function normalizeDomainFromWebsite(
  raw: string | null | undefined,
): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.toLowerCase().replace(/^www\./i, "");
    return host || null;
  } catch {
    const cleaned =
      s
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        ?.trim()
        .toLowerCase() ?? "";
    return cleaned.replace(/^www\./i, "") || null;
  }
}

export function normalizeCompanyName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeLinkedInUrl(
  raw: string | null | undefined,
): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!u.hostname.includes("linkedin.com")) return null;
    u.hash = "";
    u.search = "";
    let path = u.pathname.replace(/\/+$/, "");
    if (!path) return null;
    return `https://www.linkedin.com${path}`;
  } catch {
    return null;
  }
}

export function isLinkedInUrl(raw: string | null | undefined): boolean {
  return Boolean(normalizeLinkedInUrl(raw));
}

export function websiteUrlFromDomain(domain: string | null | undefined): string {
  const d = (domain ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (!d) return "";
  return `https://${d.replace(/^www\./i, "")}`;
}

export function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
