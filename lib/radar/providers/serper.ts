import {
  envInt,
  isLinkedInUrl,
  normalizeDomainFromWebsite,
  normalizeLinkedInUrl,
} from "@/lib/radar/normalize";
import type { RadarProviderHit } from "@/lib/radar/types";

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerperResponse = {
  organic?: SerperOrganic[];
  error?: string;
};

function stripCompanyTitle(title: string): string {
  return title
    .replace(/\s*[|\-–—:].*$/, "")
    .replace(/\s+(-|–|—)\s+LinkedIn.*$/i, "")
    .replace(/\s*\|\s*LinkedIn.*$/i, "")
    .replace(/\s+on LinkedIn.*$/i, "")
    .trim();
}

function glFromRegion(regionCode: string | null | undefined): string | undefined {
  const c = (regionCode ?? "").trim().toLowerCase();
  if (!c) return undefined;
  return c;
}

async function serperSearch(
  apiKey: string,
  q: string,
  num: number,
  regionCode?: string | null,
): Promise<{ hits: SerperOrganic[]; error?: string }> {
  const body: Record<string, unknown> = {
    q,
    num: Math.min(20, Math.max(1, num)),
  };
  const gl = glFromRegion(regionCode);
  if (gl) body.gl = gl;

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as SerperResponse;
  if (!response.ok) {
    return {
      hits: [],
      error: data.error || `Serper chyba (${response.status}).`,
    };
  }
  return { hits: data.organic ?? [] };
}

function organicToHit(item: SerperOrganic): RadarProviderHit | null {
  const link = (item.link ?? "").trim();
  if (!link) return null;
  const title = stripCompanyTitle(item.title ?? "").trim();
  if (!title) return null;

  if (isLinkedInUrl(link)) {
    const linkedinUrl = normalizeLinkedInUrl(link);
    if (!linkedinUrl) return null;
    if (!/linkedin\.com\/(company|in)\//i.test(linkedinUrl)) return null;
    return {
      name: title,
      address: "",
      rating: null,
      placeId: null,
      url: "",
      phone: "",
      email: null,
      placeTypes: [],
      linkedinUrl,
      source: "linkedin",
    };
  }

  const domain = normalizeDomainFromWebsite(link);
  if (!domain) return null;
  // Skip obvious non-company SERP noise
  if (
    /^(wikipedia\.org|youtube\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com)/i.test(
      domain,
    )
  ) {
    return null;
  }

  return {
    name: title,
    address: item.snippet?.trim() || "",
    rating: null,
    placeId: null,
    url: `https://${domain}`,
    phone: "",
    email: null,
    placeTypes: [],
    linkedinUrl: null,
    source: "web",
  };
}

/**
 * Web + LinkedIn discovery via Serper Google Search.
 * LinkedIn hits come from a dedicated query when `includeLinkedIn` is true.
 */
export async function searchSerperForRadar(args: {
  query: string;
  limit: number;
  regionCode?: string | null;
  includeWeb?: boolean;
  includeLinkedIn?: boolean;
}): Promise<{ hits: RadarProviderHit[]; error?: string; calls: number }> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    return { hits: [], error: "Chybí SERPER_API_KEY.", calls: 0 };
  }

  const maxCalls = envInt("RADAR_SERPER_MAX", 10);
  const perQuery = Math.min(args.limit, 10);
  const hits: RadarProviderHit[] = [];
  const seen = new Set<string>();
  let calls = 0;
  let lastError: string | undefined;

  const pushHit = (hit: RadarProviderHit) => {
    const key =
      hit.linkedinUrl ||
      normalizeDomainFromWebsite(hit.url) ||
      hit.name.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    hits.push(hit);
  };

  const run = async (q: string) => {
    if (calls >= maxCalls || hits.length >= args.limit) return;
    calls += 1;
    const page = await serperSearch(apiKey, q, perQuery, args.regionCode);
    if (page.error) {
      lastError = page.error;
      return;
    }
    for (const organic of page.hits) {
      if (hits.length >= args.limit) break;
      const hit = organicToHit(organic);
      if (hit) pushHit(hit);
    }
  };

  const q = args.query.trim();
  if (args.includeWeb !== false) {
    await run(`${q} oficiální web firma`);
    if (hits.length < args.limit) {
      await run(q);
    }
  }

  if (args.includeLinkedIn !== false && hits.length < args.limit) {
    await run(`${q} site:linkedin.com/company`);
  }

  if (hits.length === 0 && lastError) {
    return { hits: [], error: lastError, calls };
  }

  return { hits: hits.slice(0, args.limit), calls };
}
