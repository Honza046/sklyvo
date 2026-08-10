import { isStandaloneCompanyWebsite } from "@/lib/radar-website-quality";
import { scrapeWebsiteContacts } from "@/lib/website-contacts";
import {
  normalizeCompanyName,
  normalizeDomainFromWebsite,
  normalizeLinkedInUrl,
} from "@/lib/radar/normalize";
import { hunterBestEmailForDomain } from "@/lib/radar/providers/hunter";
import {
  collectGooglePlacesForQuery,
  placesToProviderHits,
  type CrmExclusionKeys,
} from "@/lib/radar/providers/places";
import { proxycurlEnrichCompany } from "@/lib/radar/providers/proxycurl";
import { searchSerperForRadar } from "@/lib/radar/providers/serper";
import {
  DEFAULT_RADAR_SOURCES,
  type RadarDiscoverySource,
  type RadarLead,
  type RadarOrchestrateInput,
  type RadarProviderHit,
  type RadarSourceFlags,
} from "@/lib/radar/types";

function resolveSources(
  partial?: Partial<RadarSourceFlags>,
): RadarSourceFlags {
  return {
    places: partial?.places ?? DEFAULT_RADAR_SOURCES.places,
    web: partial?.web ?? DEFAULT_RADAR_SOURCES.web,
    linkedin: partial?.linkedin ?? DEFAULT_RADAR_SOURCES.linkedin,
  };
}

function mergeHits(hits: RadarProviderHit[]): Array<
  RadarProviderHit & { sources: RadarDiscoverySource[] }
> {
  type Acc = RadarProviderHit & { sources: Set<RadarDiscoverySource> };
  const byKey = new Map<string, Acc>();

  const keyFor = (hit: RadarProviderHit): string => {
    const domain = normalizeDomainFromWebsite(hit.url);
    if (domain) return `d:${domain}`;
    const placeId = hit.placeId?.trim();
    if (placeId) return `p:${placeId}`;
    const li = normalizeLinkedInUrl(hit.linkedinUrl);
    if (li) return `l:${li}`;
    return `n:${normalizeCompanyName(hit.name)}`;
  };

  for (const hit of hits) {
    const key = keyFor(hit);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...hit,
        placeTypes: [...(hit.placeTypes ?? [])],
        sources: new Set([hit.source]),
      });
      continue;
    }

    existing.sources.add(hit.source);
    existing.name = existing.name || hit.name;
    existing.address = existing.address || hit.address || "";
    existing.rating = existing.rating ?? hit.rating ?? null;
    existing.placeId = existing.placeId || hit.placeId || null;
    existing.url = existing.url || hit.url || "";
    existing.phone = existing.phone || hit.phone || "";
    existing.email = existing.email || hit.email || null;
    existing.placeTypes = Array.from(
      new Set([...(existing.placeTypes ?? []), ...(hit.placeTypes ?? [])]),
    );
    existing.linkedinUrl =
      normalizeLinkedInUrl(existing.linkedinUrl) ||
      normalizeLinkedInUrl(hit.linkedinUrl) ||
      null;
    existing.source = existing.sources.has("places")
      ? "places"
      : existing.sources.has("linkedin")
        ? "linkedin"
        : "web";
  }

  return Array.from(byKey.values()).map((row) => ({
    ...row,
    sources: Array.from(row.sources),
  }));
}

async function enrichHits(
  hits: Array<RadarProviderHit & { sources: RadarDiscoverySource[] }>,
  opts: { deepScan: boolean; limit: number },
  hunterUsage: { used: number },
  proxyUsage: { used: number },
): Promise<RadarLead[]> {
  const enriched = await Promise.all(
    hits.slice(0, Math.max(opts.limit * 2, opts.limit)).map(async (hit, index) => {
      let name = hit.name;
      let url = (hit.url ?? "").trim();
      let phone = (hit.phone ?? "").trim();
      let email = hit.email?.trim() || null;
      let linkedinUrl = normalizeLinkedInUrl(hit.linkedinUrl);
      let address = hit.address ?? "";

      if (linkedinUrl && (!url || !name || name === "Neznámá firma")) {
        const px = await proxycurlEnrichCompany(linkedinUrl, proxyUsage);
        if (px) {
          if (px.name) name = px.name;
          if (px.url && !url) url = px.url;
          if (px.linkedinUrl) linkedinUrl = px.linkedinUrl;
          if (px.address && !address) address = px.address;
        }
      }

      if (url) {
        const scraped = await scrapeWebsiteContacts(url, {
          thorough: opts.deepScan,
        });
        if (!email && scraped.email) email = scraped.email;
        if (!phone && scraped.phone) phone = scraped.phone;
      }

      if (!email && url) {
        const domain = normalizeDomainFromWebsite(url);
        if (domain) {
          const hunted = await hunterBestEmailForDomain(domain, hunterUsage);
          if (hunted) email = hunted;
        }
      }

      const placeId = hit.placeId?.trim() || null;
      const id =
        placeId ||
        linkedinUrl ||
        normalizeDomainFromWebsite(url) ||
        `radar_${index}`;

      return {
        id,
        name,
        address: address || "Adresa není k dispozici",
        rating: hit.rating ?? null,
        placeId,
        url,
        phone,
        email,
        placeTypes: hit.placeTypes ?? [],
        linkedinUrl,
        discoverySources: hit.sources.length > 0 ? hit.sources : [hit.source],
      } satisfies RadarLead;
    }),
  );

  return enriched
    .filter((lead) => {
      if (lead.placeId || lead.discoverySources.includes("places")) return true;
      if (lead.linkedinUrl) return true;
      if (lead.url && isStandaloneCompanyWebsite(lead.url)) return true;
      return false;
    })
    .slice(0, opts.limit);
}

function hitInCrm(
  hit: RadarProviderHit,
  crmKeys: CrmExclusionKeys | null,
): boolean {
  if (!crmKeys) return false;
  const placeId = hit.placeId?.trim();
  if (placeId && crmKeys.placeIds.has(placeId)) return true;
  const domain = normalizeDomainFromWebsite(hit.url);
  if (domain && crmKeys.domains.has(domain)) return true;
  const name = normalizeCompanyName(hit.name);
  if (name && crmKeys.names.has(name)) return true;
  return false;
}

/**
 * Multi-source Radar: Places + Serper (web/LinkedIn) → merge → scrape/Hunter/Proxycurl.
 */
export async function orchestrateRadarSearch(
  input: RadarOrchestrateInput,
): Promise<{ results: RadarLead[]; error?: string }> {
  const sources = resolveSources(input.sources);
  if (!sources.places && !sources.web && !sources.linkedin) {
    return { results: [], error: "Zapni alespoň jeden zdroj hledání." };
  }

  const requestedLimit = Math.max(1, input.limit);
  const crmKeys = input.crmKeys ?? null;
  const hits: RadarProviderHit[] = [];
  const errors: string[] = [];

  const tasks: Promise<void>[] = [];

  if (sources.places) {
    tasks.push(
      (async () => {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
        if (!apiKey) {
          errors.push("Chybí GOOGLE_PLACES_API_KEY.");
          return;
        }
        const { places, error } = await collectGooglePlacesForQuery(
          apiKey,
          input.query,
          requestedLimit,
          crmKeys,
          input.regionCode,
        );
        if (error && places.length === 0) {
          errors.push(error);
          return;
        }
        hits.push(...placesToProviderHits(places));
      })(),
    );
  }

  if (sources.web || sources.linkedin) {
    tasks.push(
      (async () => {
        const { hits: serperHits, error } = await searchSerperForRadar({
          query: input.query,
          limit: requestedLimit,
          regionCode: input.regionCode,
          includeWeb: sources.web,
          includeLinkedIn: sources.linkedin,
        });
        if (error && serperHits.length === 0) {
          // Soft-fail when Places already returned results
          errors.push(error);
          return;
        }
        for (const hit of serperHits) {
          if (hit.source === "linkedin" && !sources.linkedin) continue;
          if (hit.source === "web" && !sources.web) continue;
          if (hitInCrm(hit, crmKeys)) continue;
          hits.push(hit);
        }
      })(),
    );
  }

  await Promise.all(tasks);

  if (hits.length === 0) {
    return {
      results: [],
      error: errors[0] || "Nic jsme nenašli. Zkus upravit dotaz.",
    };
  }

  const merged = mergeHits(hits).filter((h) => !hitInCrm(h, crmKeys));
  const hunterUsage = { used: 0 };
  const proxyUsage = { used: 0 };
  const results = await enrichHits(
    merged,
    {
      deepScan: input.deepScan === true,
      limit: requestedLimit,
    },
    hunterUsage,
    proxyUsage,
  );

  console.info("[radar] provider usage", {
    query: input.query,
    places: sources.places,
    web: sources.web,
    linkedin: sources.linkedin,
    hits: hits.length,
    merged: merged.length,
    results: results.length,
    hunterCalls: hunterUsage.used,
    proxycurlCalls: proxyUsage.used,
    deepScan: input.deepScan === true,
  });

  if (results.length === 0) {
    return {
      results: [],
      error: errors[0] || "Po filtraci nezůstaly použitelné firmy.",
    };
  }

  return { results };
}
