import { envInt, normalizeDomainFromWebsite } from "@/lib/radar/normalize";

type HunterEmail = {
  value?: string;
  type?: string;
  confidence?: number;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
};

type HunterDomainSearchResponse = {
  data?: {
    domain?: string;
    emails?: HunterEmail[];
  };
  errors?: Array<{ details?: string; id?: string }>;
};

/**
 * Best public email for a company domain (Hunter Domain Search).
 * Gated by RADAR_HUNTER_MAX across a single orchestrate call via shared counter.
 */
export async function hunterBestEmailForDomain(
  domainRaw: string,
  usage: { used: number },
): Promise<string | null> {
  const apiKey = process.env.HUNTER_API_KEY?.trim();
  if (!apiKey) return null;

  const max = envInt("RADAR_HUNTER_MAX", 20);
  if (usage.used >= max) return null;

  const domain = normalizeDomainFromWebsite(domainRaw);
  if (!domain) return null;

  usage.used += 1;

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", "5");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const data = (await response.json()) as HunterDomainSearchResponse;
    if (!response.ok) return null;

    const emails = data.data?.emails ?? [];
    if (emails.length === 0) return null;

    const ranked = [...emails].sort((a, b) => {
      const ca = typeof a.confidence === "number" ? a.confidence : 0;
      const cb = typeof b.confidence === "number" ? b.confidence : 0;
      if (cb !== ca) return cb - ca;
      const ta = a.type === "generic" ? 0 : 1;
      const tb = b.type === "generic" ? 0 : 1;
      return tb - ta;
    });

    const best = ranked.find((e) => e.value?.includes("@"));
    return best?.value?.trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}
