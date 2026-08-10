import {
  COUNTRY_LOCATION_BIAS,
  addressMatchesCountry,
  normalizeCountryCode,
  placesLanguageFromCountry,
  rewriteRadarQueryForPlaces,
} from "@/lib/country-language";
import {
  broadenRadarQuery,
  filterStandaloneCompanyPlaces,
  isStandaloneCompanyWebsite,
} from "@/lib/radar-website-quality";
import {
  normalizeCompanyName,
  normalizeDomainFromWebsite,
} from "@/lib/radar/normalize";
import type { RadarProviderHit } from "@/lib/radar/types";

export type GooglePlaceV2 = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  primaryType?: string;
  types?: string[];
};

type GoogleTextSearchV2Response = {
  places?: GooglePlaceV2[];
  nextPageToken?: string;
  error?: { message?: string };
};

export type CrmExclusionKeys = {
  placeIds: Set<string>;
  domains: Set<string>;
  names: Set<string>;
};

const GOOGLE_SEARCH_PAGE_SIZE = 20;
const GOOGLE_SEARCH_MAX_RAW_PLACES = 100;
const GOOGLE_SEARCH_MAX_PAGES = 5;

export function googlePlaceIsInCrm(
  item: GooglePlaceV2,
  keys: CrmExclusionKeys,
): boolean {
  const pid = item.id?.trim();
  if (pid && keys.placeIds.has(pid)) return true;

  const nameKey = normalizeCompanyName(item.displayName?.text);
  if (nameKey && keys.names.has(nameKey)) return true;

  const dom = normalizeDomainFromWebsite(item.websiteUri);
  if (dom && keys.domains.has(dom)) return true;

  return false;
}

async function fetchGooglePlacesSearchTextPage(
  apiKey: string,
  textQuery: string,
  pageToken?: string,
  options?: { regionCode?: string | null; languageCode?: string | null },
): Promise<{
  places: GooglePlaceV2[];
  nextPageToken?: string;
  error?: string;
}> {
  const body: Record<string, unknown> = {
    textQuery,
    pageSize: GOOGLE_SEARCH_PAGE_SIZE,
  };
  if (pageToken) {
    body.pageToken = pageToken;
  }
  const regionCode = normalizeCountryCode(options?.regionCode);
  if (regionCode) {
    body.regionCode = regionCode;
    const bias = COUNTRY_LOCATION_BIAS[regionCode];
    if (bias && !pageToken) {
      body.locationBias = {
        rectangle: bias.viewport,
      };
    }
  }
  const languageCode = options?.languageCode?.trim();
  if (languageCode) {
    body.languageCode = languageCode;
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.internationalPhoneNumber,places.rating,places.primaryType,places.types",
      },
      body: JSON.stringify(body),
    },
  );

  const data = (await response.json()) as GoogleTextSearchV2Response;

  if (!response.ok) {
    return {
      places: [],
      error: data.error?.message || `Google API chyba (${response.status}).`,
    };
  }

  return {
    places: data.places ?? [],
    nextPageToken: data.nextPageToken,
  };
}

function placeMatchesSelectedCountry(
  place: GooglePlaceV2,
  regionCode: string | null,
): boolean {
  if (!regionCode) return true;
  return addressMatchesCountry(
    place.formattedAddress,
    place.internationalPhoneNumber,
    regionCode,
  );
}

export async function collectGooglePlacesForQuery(
  apiKey: string,
  textQuery: string,
  requestedLimit: number,
  crmKeys: CrmExclusionKeys | null,
  regionCode?: string | null,
): Promise<{ places: GooglePlaceV2[]; error?: string }> {
  const normalizedQuery = textQuery.trim();
  if (!normalizedQuery) {
    return { places: [], error: "Prázdný dotaz." };
  }

  const resolvedRegion = normalizeCountryCode(regionCode);
  const placesOpts = {
    regionCode: resolvedRegion,
    languageCode: placesLanguageFromCountry(resolvedRegion) ?? null,
  };

  const collected: GooglePlaceV2[] = [];
  const seenPlaceIds = new Set<string>();
  let pageToken: string | undefined;
  let pageIndex = 0;
  let lastError: string | undefined;

  const rewritten = rewriteRadarQueryForPlaces(normalizedQuery, resolvedRegion);
  const queryVariants = Array.from(
    new Set([
      rewritten,
      ...broadenRadarQuery(rewritten),
      ...broadenRadarQuery(normalizedQuery),
    ]),
  );

  const usableFromCollected = () => {
    let list = collected;
    if (crmKeys) {
      list = list.filter((place) => !googlePlaceIsInCrm(place, crmKeys));
    }
    list = list.filter((p) => isStandaloneCompanyWebsite(p.websiteUri));
    list = list.filter((p) => placeMatchesSelectedCountry(p, resolvedRegion));
    return filterStandaloneCompanyPlaces(list);
  };

  for (const variant of queryVariants) {
    pageToken = undefined;
    pageIndex = 0;

    while (
      collected.length < GOOGLE_SEARCH_MAX_RAW_PLACES &&
      pageIndex < GOOGLE_SEARCH_MAX_PAGES
    ) {
      pageIndex += 1;
      const page = await fetchGooglePlacesSearchTextPage(
        apiKey,
        variant,
        pageToken,
        placesOpts,
      );

      if (page.error) {
        lastError = page.error;
        break;
      }

      for (const p of page.places) {
        if (collected.length >= GOOGLE_SEARCH_MAX_RAW_PLACES) break;
        const pid = p.id?.trim();
        if (pid) {
          if (seenPlaceIds.has(pid)) continue;
          seenPlaceIds.add(pid);
        } else {
          const key = `${normalizeCompanyName(p.displayName?.text)}|${normalizeDomainFromWebsite(p.websiteUri) ?? ""}`;
          if (seenPlaceIds.has(key)) continue;
          seenPlaceIds.add(key);
        }
        collected.push(p);
      }

      const usable = usableFromCollected();
      if (usable.length >= requestedLimit) {
        return { places: usable.slice(0, requestedLimit) };
      }
      if (!page.nextPageToken) break;
      if (page.places.length === 0) break;

      pageToken = page.nextPageToken;
      await new Promise((r) => setTimeout(r, 150));
    }

    const usableSoFar = usableFromCollected();
    if (usableSoFar.length >= requestedLimit) {
      return { places: usableSoFar.slice(0, requestedLimit) };
    }
  }

  const usable = usableFromCollected();

  if (usable.length === 0 && collected.length === 0 && lastError) {
    return { places: [], error: lastError };
  }

  if (usable.length === 0 && resolvedRegion) {
    return {
      places: [],
      error:
        "V této zemi jsme nenašli firmy s vlastním webem. Zkus obecnější dotaz (např. „online shop London“) nebo jiný počet výsledků.",
    };
  }

  return { places: usable.slice(0, requestedLimit) };
}

export function placesToProviderHits(places: GooglePlaceV2[]): RadarProviderHit[] {
  return places.map((item) => ({
    name: item.displayName?.text || "Neznámá firma",
    address: item.formattedAddress || "Adresa není k dispozici",
    rating: typeof item.rating === "number" ? item.rating : null,
    placeId: item.id?.trim() || null,
    url: item.websiteUri ?? "",
    phone: (item.internationalPhoneNumber ?? "").trim(),
    email: null,
    placeTypes: [
      ...(item.primaryType ? [item.primaryType] : []),
      ...(Array.isArray(item.types) ? item.types : []),
    ],
    linkedinUrl: null,
    source: "places" as const,
  }));
}
