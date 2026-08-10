import {
  envInt,
  normalizeDomainFromWebsite,
  normalizeLinkedInUrl,
  websiteUrlFromDomain,
} from "@/lib/radar/normalize";

type ProxycurlCompany = {
  name?: string | null;
  website?: string | null;
  linkedin_profile_url?: string | null;
  company_size?: string | null;
  industry?: string | null;
  hq?: { city?: string | null; country?: string | null } | null;
};

/**
 * Enrich a LinkedIn company URL via Proxycurl.
 */
export async function proxycurlEnrichCompany(
  linkedinUrlRaw: string,
  usage: { used: number },
): Promise<{
  name?: string;
  url?: string;
  linkedinUrl?: string;
  address?: string;
} | null> {
  const apiKey = process.env.PROXYCURL_API_KEY?.trim();
  if (!apiKey) return null;

  const max = envInt("RADAR_PROXYCURL_MAX", 10);
  if (usage.used >= max) return null;

  const linkedinUrl = normalizeLinkedInUrl(linkedinUrlRaw);
  if (!linkedinUrl || !/\/company\//i.test(linkedinUrl)) return null;

  usage.used += 1;

  const url = new URL("https://nubela.co/proxycurl/api/linkedin/company");
  url.searchParams.set("url", linkedinUrl);
  url.searchParams.set("use_cache", "if-present");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as ProxycurlCompany;

    const website =
      normalizeDomainFromWebsite(data.website ?? undefined) ?? null;
    const city = data.hq?.city?.trim();
    const country = data.hq?.country?.trim();
    const address = [city, country].filter(Boolean).join(", ");

    return {
      name: data.name?.trim() || undefined,
      url: website ? websiteUrlFromDomain(website) : undefined,
      linkedinUrl:
        normalizeLinkedInUrl(data.linkedin_profile_url ?? linkedinUrl) ??
        linkedinUrl,
      address: address || undefined,
    };
  } catch {
    return null;
  }
}
