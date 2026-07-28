/** ISO 3166-1 alpha-2 region codes used by Google Places `regionCode`. */

export type RadarCountryOption = {
  code: string;
  label: string;
  /** Native / local language for Sniper codes. */
  nativeLanguage: string;
  /** Places API languageCode hint for result labels. */
  placesLanguageCode: string;
};

export const RADAR_COUNTRY_OPTIONS: RadarCountryOption[] = [
  { code: "CZ", label: "Česko", nativeLanguage: "cs", placesLanguageCode: "cs" },
  { code: "SK", label: "Slovensko", nativeLanguage: "sk", placesLanguageCode: "sk" },
  { code: "DE", label: "Německo", nativeLanguage: "de", placesLanguageCode: "de" },
  { code: "AT", label: "Rakousko", nativeLanguage: "de", placesLanguageCode: "de" },
  { code: "PL", label: "Polsko", nativeLanguage: "pl", placesLanguageCode: "pl" },
  { code: "GB", label: "Velká Británie", nativeLanguage: "en", placesLanguageCode: "en" },
  { code: "US", label: "USA", nativeLanguage: "en", placesLanguageCode: "en" },
  { code: "IE", label: "Irsko", nativeLanguage: "en", placesLanguageCode: "en" },
  { code: "FR", label: "Francie", nativeLanguage: "fr", placesLanguageCode: "fr" },
  { code: "ES", label: "Španělsko", nativeLanguage: "es", placesLanguageCode: "es" },
  { code: "IT", label: "Itálie", nativeLanguage: "it", placesLanguageCode: "it" },
  { code: "NL", label: "Nizozemsko", nativeLanguage: "nl", placesLanguageCode: "nl" },
  { code: "BE", label: "Belgie", nativeLanguage: "nl", placesLanguageCode: "nl" },
  { code: "CH", label: "Švýcarsko", nativeLanguage: "de", placesLanguageCode: "de" },
];

/** Sentinel for “no country bias” in UI / Places. */
export const RADAR_COUNTRY_NONE = "NONE";

export const DEFAULT_RADAR_COUNTRY = "CZ";

export const RADAR_COUNTRY_STORAGE_KEY = "venegard-radar-country";

const COUNTRY_BY_CODE = new Map(
  RADAR_COUNTRY_OPTIONS.map((c) => [c.code.toUpperCase(), c] as const),
);

export function normalizeCountryCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (!code || code === RADAR_COUNTRY_NONE) return null;
  return COUNTRY_BY_CODE.has(code) ? code : null;
}

export function getRadarCountryOption(code: string | null | undefined): RadarCountryOption | null {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return null;
  return COUNTRY_BY_CODE.get(normalized) ?? null;
}

/** Sniper language code from country (fallback cs). */
export function nativeLanguageFromCountry(code: string | null | undefined): string {
  return getRadarCountryOption(code)?.nativeLanguage ?? "cs";
}

export function placesLanguageFromCountry(code: string | null | undefined): string | undefined {
  return getRadarCountryOption(code)?.placesLanguageCode;
}

export function countryLabel(code: string | null | undefined): string | null {
  return getRadarCountryOption(code)?.label ?? null;
}

/** Soft country bias for Places Text Search (circle max radius is 50 km — use viewport). */
export const COUNTRY_LOCATION_BIAS: Record<
  string,
  {
    englishName: string;
    /** Approximate country bounding box for locationBias.rectangle */
    viewport: {
      low: { latitude: number; longitude: number };
      high: { latitude: number; longitude: number };
    };
  }
> = {
  CZ: {
    englishName: "Czechia",
    viewport: { low: { latitude: 48.55, longitude: 12.09 }, high: { latitude: 51.06, longitude: 18.86 } },
  },
  SK: {
    englishName: "Slovakia",
    viewport: { low: { latitude: 47.73, longitude: 16.83 }, high: { latitude: 49.61, longitude: 22.57 } },
  },
  DE: {
    englishName: "Germany",
    viewport: { low: { latitude: 47.27, longitude: 5.87 }, high: { latitude: 55.06, longitude: 15.04 } },
  },
  AT: {
    englishName: "Austria",
    viewport: { low: { latitude: 46.37, longitude: 9.53 }, high: { latitude: 49.02, longitude: 17.16 } },
  },
  PL: {
    englishName: "Poland",
    viewport: { low: { latitude: 49.0, longitude: 14.12 }, high: { latitude: 54.84, longitude: 24.15 } },
  },
  GB: {
    englishName: "United Kingdom",
    viewport: { low: { latitude: 49.86, longitude: -8.65 }, high: { latitude: 60.86, longitude: 1.77 } },
  },
  US: {
    englishName: "United States",
    viewport: { low: { latitude: 24.4, longitude: -125.0 }, high: { latitude: 49.4, longitude: -66.9 } },
  },
  IE: {
    englishName: "Ireland",
    viewport: { low: { latitude: 51.4, longitude: -10.5 }, high: { latitude: 55.4, longitude: -5.9 } },
  },
  FR: {
    englishName: "France",
    viewport: { low: { latitude: 41.3, longitude: -5.2 }, high: { latitude: 51.1, longitude: 9.6 } },
  },
  ES: {
    englishName: "Spain",
    viewport: { low: { latitude: 35.9, longitude: -9.3 }, high: { latitude: 43.8, longitude: 4.3 } },
  },
  IT: {
    englishName: "Italy",
    viewport: { low: { latitude: 36.6, longitude: 6.6 }, high: { latitude: 47.1, longitude: 18.5 } },
  },
  NL: {
    englishName: "Netherlands",
    viewport: { low: { latitude: 50.75, longitude: 3.3 }, high: { latitude: 53.7, longitude: 7.23 } },
  },
  BE: {
    englishName: "Belgium",
    viewport: { low: { latitude: 49.5, longitude: 2.5 }, high: { latitude: 51.5, longitude: 6.4 } },
  },
  CH: {
    englishName: "Switzerland",
    viewport: { low: { latitude: 45.8, longitude: 5.95 }, high: { latitude: 47.8, longitude: 10.5 } },
  },
};

/** Address / phone hints that identify a country (positive match). */
const COUNTRY_ADDRESS_POSITIVE: Record<string, RegExp[]> = {
  CZ: [
    /\bczechia\b/i,
    /\bczech republic\b/i,
    /\bčeská republika\b/i,
    /\bčesko\b/i,
    /\bpraha\b/i,
    /\bprague\b/i,
    /\bbrno\b/i,
    /\bostrava\b/i,
    /\+\s*420\b/,
  ],
  SK: [/\bslovakia\b/i, /\bslovensko\b/i, /\bbratislava\b/i, /\+\s*421\b/],
  DE: [
    /\bgermany\b/i,
    /\bdeutschland\b/i,
    /\bněmecko\b/i,
    /\bberlin\b/i,
    /\bmünchen\b/i,
    /\bmunich\b/i,
    /\bhamburg\b/i,
    /\+\s*49\b/,
  ],
  AT: [/\baustria\b/i, /\bösterreich\b/i, /\brakousko\b/i, /\bvienna\b/i, /\bwien\b/i, /\+\s*43\b/],
  PL: [/\bpoland\b/i, /\bpolska\b/i, /\bpolsko\b/i, /\bwarsaw\b/i, /\bwarszawa\b/i, /\+\s*48\b/],
  GB: [
    /\bunited kingdom\b/i,
    /\bgreat britain\b/i,
    /\bengland\b/i,
    /\bscotland\b/i,
    /\bwales\b/i,
    /\blondon\b/i,
    /,\s*uk\b/i,
    /\+\s*44\b/,
  ],
  US: [/\bunited states\b/i, /\busa\b/i, /\bnew york\b/i, /\bcalifornia\b/i, /\+\s*1\b/],
  IE: [/\bireland\b/i, /\béire\b/i, /\bdublin\b/i, /\+\s*353\b/],
  FR: [/\bfrance\b/i, /\bfrancie\b/i, /\bparis\b/i, /\+\s*33\b/],
  ES: [/\bspain\b/i, /\bespaña\b/i, /\bšpanělsko\b/i, /\bmadrid\b/i, /\bbarcelona\b/i, /\+\s*34\b/],
  IT: [/\bitaly\b/i, /\bitalia\b/i, /\bitálie\b/i, /\brome\b/i, /\bmilan\b/i, /\+\s*39\b/],
  NL: [/\bnetherlands\b/i, /\bholland\b/i, /\bnizozemsko\b/i, /\bamsterdam\b/i, /\+\s*31\b/],
  BE: [/\bbelgium\b/i, /\bbelgie\b/i, /\bbrussels\b/i, /\+\s*32\b/],
  CH: [/\bswitzerland\b/i, /\bschweiz\b/i, /\bsuisse\b/i, /\bzurich\b/i, /\+\s*41\b/],
};

/**
 * True if address/phone clearly belongs to `countryCode`.
 * Rejects when another country's markers dominate (e.g. Prague while GB selected).
 */
export function addressMatchesCountry(
  address: string | null | undefined,
  phone: string | null | undefined,
  countryCode: string | null | undefined,
): boolean {
  const code = normalizeCountryCode(countryCode);
  if (!code) return true;

  const hay = `${address ?? ""} ${phone ?? ""}`.trim();
  if (!hay) return false;

  const positive = COUNTRY_ADDRESS_POSITIVE[code] ?? [];
  if (positive.some((re) => re.test(hay))) return true;

  // Strong foreign markers (official names + dial codes) → reject
  const FOREIGN_STRONG: Array<{ code: string; re: RegExp }> = [
    { code: "CZ", re: /\bczechia\b|\bczech republic\b|\bčeská republika\b|\+\s*420\b/i },
    { code: "SK", re: /\bslovakia\b|\bslovensko\b|\+\s*421\b/i },
    { code: "DE", re: /\bgermany\b|\bdeutschland\b|\+\s*49\b/i },
    { code: "AT", re: /\baustria\b|\bösterreich\b|\+\s*43\b/i },
    { code: "PL", re: /\bpoland\b|\bpolska\b|\+\s*48\b/i },
    { code: "GB", re: /\bunited kingdom\b|\bgreat britain\b|,\s*uk\b|\+\s*44\b/i },
    { code: "US", re: /\bunited states\b|\busa\b/i },
    { code: "IE", re: /\bireland\b|\+\s*353\b/i },
    { code: "FR", re: /\bfrance\b|\+\s*33\b/i },
    { code: "ES", re: /\bspain\b|\bespaña\b|\+\s*34\b/i },
    { code: "IT", re: /\bitaly\b|\bitalia\b|\+\s*39\b/i },
    { code: "NL", re: /\bnetherlands\b|\bholland\b|\+\s*31\b/i },
    { code: "BE", re: /\bbelgium\b|\+\s*32\b/i },
    { code: "CH", re: /\bswitzerland\b|\bschweiz\b|\+\s*41\b/i },
  ];

  for (const { code: other, re } of FOREIGN_STRONG) {
    if (other === code) continue;
    if (re.test(hay)) return false;
  }

  // No clear positive match for selected country → drop (strict)
  return false;
}

/** Localize CZ spellings and strip platform-brand HQ traps for foreign searches. */
export function rewriteRadarQueryForPlaces(
  query: string,
  regionCode: string | null | undefined,
): string {
  let q = query.trim().replace(/\s+/g, " ");
  if (!q) return q;

  const code = normalizeCountryCode(regionCode);

  const cityNorm: Array<[RegExp, string]> = [
    [/Lond[yý]n[\p{L}]*/giu, "London"],
    [/Berl[ií]n[\p{L}]*/giu, "Berlin"],
    [/Pa[rř][ií][zž][\p{L}]*/giu, "Paris"],
    [/V[ií]de[nň][\p{L}]*/giu, "Vienna"],
    [/Mnichov[\p{L}]*/giu, "Munich"],
    [/Hamburk[\p{L}]*/giu, "Hamburg"],
    [/Var[sš]av[\p{L}]*/giu, "Warsaw"],
    [/Krakov[\p{L}]*/giu, "Krakow"],
    [/(?<!\p{L})[RŘ][ií]m[\p{L}]*/giu, "Rome"],
    [/Mil[aá]n[\p{L}]*/giu, "Milan"],
    [/Ben[aá]tk[\p{L}]*/giu, "Venice"],
    [/Brusel[\p{L}]*/giu, "Brussels"],
    [/\bPraze\b|\bPraha\b|\bPrague\b/giu, "Prague"],
  ];
  for (const [re, repl] of cityNorm) {
    q = q.replace(re, repl);
  }

  // Platform brands → Places returns vendor HQ; rephrase to merchant/store intent.
  const hadShopify = /\bshopify\b/i.test(q);
  const hadShoptet = /\bshoptet\b/i.test(q);

  if (hadShopify || hadShoptet) {
    q = q
      .replace(/\bshopify\b/gi, "")
      .replace(/\bshoptet\b/gi, "")
      .replace(/\be-?shops?\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    // Ask for real shops, not the platform company
    q = `${q} independent online shop ecommerce store`.replace(/\s+/g, " ").trim();
  } else if (code && code !== "CZ") {
    q = q.replace(/\be-?shop\b/gi, "ecommerce shop");
  }

  const bias = code ? COUNTRY_LOCATION_BIAS[code] : null;
  if (bias && !new RegExp(bias.englishName.replace(/\s+/g, "\\s+"), "i").test(q)) {
    if (code === "GB" && /\blondon\b/i.test(q) && !/\bunited kingdom\b|\buk\b/i.test(q)) {
      q = `${q} United Kingdom`;
    } else if (!/\b(united kingdom|germany|france|czechia|poland|austria)\b/i.test(q)) {
      q = `${q} ${bias.englishName}`;
    }
  }

  return q.replace(/\s+/g, " ").trim();
}

/**
 * City / country aliases → ISO code. Longer phrases first when matching.
 * Covers common CZ spellings (Londýn, Berlín…) and English names.
 */
const QUERY_LOCATION_TO_COUNTRY: Array<{ pattern: RegExp; code: string }> = [
  // Multi-word first
  { pattern: /\bnew\s+york\b/i, code: "US" },
  { pattern: /\blos\s+angeles\b/i, code: "US" },
  { pattern: /\bsan\s+francisco\b/i, code: "US" },
  { pattern: /\bunited\s+kingdom\b/i, code: "GB" },
  { pattern: /\bvelk(?:á|a)\s+brit[aá]nie\b/i, code: "GB" },
  { pattern: /\bgreat\s+britain\b/i, code: "GB" },
  { pattern: /\bjihomoravsk(?:ý|y)\s+kraj\b/i, code: "CZ" },
  { pattern: /\bst[rř]edo[cč]esk(?:ý|y)\s+kraj\b/i, code: "CZ" },

  // Country names
  { pattern: /\bn[eě]mecko\b/i, code: "DE" },
  { pattern: /\bgermany\b/i, code: "DE" },
  { pattern: /\brakousko\b/i, code: "AT" },
  { pattern: /\baustria\b/i, code: "AT" },
  { pattern: /\bslovensko\b/i, code: "SK" },
  { pattern: /\bslovakia\b/i, code: "SK" },
  { pattern: /\b[cč]esko\b|\b[cč]esk(?:á|a)\s+republik[ao]\b|\bczech(?:ia)?\b/i, code: "CZ" },
  { pattern: /\bpolsko\b|\bpoland\b/i, code: "PL" },
  { pattern: /\bfrancie\b|\bfrance\b/i, code: "FR" },
  { pattern: /\b[sš]pan[eě]lsko\b|\bspain\b/i, code: "ES" },
  { pattern: /\bit[aá]lie\b|\bitaly\b/i, code: "IT" },
  { pattern: /\bnizozemsko\b|\bholland\b|\bnetherlands\b/i, code: "NL" },
  { pattern: /\bbelgie\b|\bbelgium\b/i, code: "BE" },
  { pattern: /\b[sš]v[yý]carsko\b|\bswitzerland\b/i, code: "CH" },
  { pattern: /\birsko\b|\bireland\b/i, code: "IE" },
  { pattern: /\busa\b|\bunited\s+states\b|\bamerik[ao]\b/i, code: "US" },
  { pattern: /\bengland\b|\banglie\b|\buk\b|\bbritain\b/i, code: "GB" },

  // GB
  { pattern: /\blond[yý]n\b|\blondon\b/i, code: "GB" },
  { pattern: /\bmanchester\b/i, code: "GB" },
  { pattern: /\bbirmingham\b/i, code: "GB" },
  { pattern: /\bedinburgh\b|\bedinburk\b/i, code: "GB" },
  { pattern: /\bglasgow\b/i, code: "GB" },
  { pattern: /\bliverpool\b/i, code: "GB" },
  { pattern: /\bbristol\b/i, code: "GB" },
  { pattern: /\bleeds\b/i, code: "GB" },

  // DE
  { pattern: /\bberl[ií]n\b|\bberlin\b/i, code: "DE" },
  { pattern: /\bmnichov\b|\bmunich\b|\bm[uü]nchen\b/i, code: "DE" },
  { pattern: /\bhamburk\b|\bhamburg\b/i, code: "DE" },
  { pattern: /\bfrankfur\w*\b/i, code: "DE" },
  { pattern: /\bkol[ií]n\b|\bcologne\b|\bk[oö]ln\b/i, code: "DE" },
  { pattern: /\bd[uü]sseldorf\b|\bdusseldorf\b/i, code: "DE" },
  { pattern: /\bstuttgart\b/i, code: "DE" },
  { pattern: /\bleipzig\b|\blipsko\b/i, code: "DE" },
  { pattern: /\bdresden\b|\bdra[zž][dď]any\b/i, code: "DE" },
  { pattern: /\bn[uü]rnberg\b|\bnuremberg\b|\bnorimberk\b/i, code: "DE" },

  // AT
  { pattern: /\bv[ií]de[nň]\b|\bvienna\b|\bwien\b/i, code: "AT" },
  { pattern: /\bsalcburk\b|\bsalzburg\b/i, code: "AT" },
  { pattern: /\bgraz\b/i, code: "AT" },
  { pattern: /\blinz\b/i, code: "AT" },
  { pattern: /\binsbruck\b/i, code: "AT" },

  // CZ
  { pattern: /\bpraha\b|\bprague\b/i, code: "CZ" },
  { pattern: /\bbrno\b/i, code: "CZ" },
  { pattern: /\bostrava\b/i, code: "CZ" },
  { pattern: /\bplze[nň]\b|\bpilsen\b/i, code: "CZ" },
  { pattern: /\bliberec\b/i, code: "CZ" },
  { pattern: /\bolomouc\b/i, code: "CZ" },
  { pattern: /\b[cč]esk[eé]\s+bud[eě]jovice\b/i, code: "CZ" },
  { pattern: /\bhradec\s+kr[aá]lov[eé]\b/i, code: "CZ" },
  { pattern: /\bzl[ií]n\b/i, code: "CZ" },
  { pattern: /\bpardubice\b/i, code: "CZ" },
  { pattern: /\bkarlovy\s+vary\b/i, code: "CZ" },

  // SK
  { pattern: /\bbratislava\b/i, code: "SK" },
  { pattern: /\bko[sš]ice\b/i, code: "SK" },
  { pattern: /\b[zž]ilina\b/i, code: "SK" },
  { pattern: /\bnitra\b/i, code: "SK" },
  { pattern: /\bpre[sš]ov\b/i, code: "SK" },

  // PL
  { pattern: /\bvar[sš]ava\b|\bwarsaw\b|\bwarszawa\b/i, code: "PL" },
  { pattern: /\bkrakov\b|\bkrak[oó]w\b|\bcracow\b/i, code: "PL" },
  { pattern: /\bvratislav\b|\bwroc[lł]aw\b/i, code: "PL" },
  { pattern: /\bgda[nň]sk\b|\bgdansk\b/i, code: "PL" },
  { pattern: /\bpoznan\b|\bpozna[nń]\b/i, code: "PL" },
  { pattern: /\bl[oó]d[zź]\b/i, code: "PL" },

  // FR
  { pattern: /\bpa[rř][ií][zž]\b|\bparis\b/i, code: "FR" },
  { pattern: /\blyon\b|\blyon\b/i, code: "FR" },
  { pattern: /\bmarseille\b/i, code: "FR" },
  { pattern: /\bnice\b/i, code: "FR" },
  { pattern: /\btoulouse\b/i, code: "FR" },
  { pattern: /\bbordeaux\b/i, code: "FR" },

  // ES
  { pattern: /\bmadrid\b/i, code: "ES" },
  { pattern: /\bbarcelona\b/i, code: "ES" },
  { pattern: /\bvalencie\b|\bvalencia\b/i, code: "ES" },
  { pattern: /\bsevilla\b|\bseville\b/i, code: "ES" },

  // IT
  { pattern: /\b[rř][ií]m\b|\brome\b|\broma\b/i, code: "IT" },
  { pattern: /\bmil[aá]n\b|\bmilan\b|\bmilano\b/i, code: "IT" },
  { pattern: /\bneapol\b|\bnaples\b|\bnapoli\b/i, code: "IT" },
  { pattern: /\bben[aá]tky\b|\bvenice\b|\bvenezia\b/i, code: "IT" },
  { pattern: /\bflorencie\b|\bflorence\b|\bfirenze\b/i, code: "IT" },
  { pattern: /\btur[ií]n\b|\bturin\b|\btorino\b/i, code: "IT" },

  // NL / BE
  { pattern: /\bamsterdam\b/i, code: "NL" },
  { pattern: /\brotterdam\b/i, code: "NL" },
  { pattern: /\bhaag\b|\bhague\b/i, code: "NL" },
  { pattern: /\butrecht\b/i, code: "NL" },
  { pattern: /\bbrusel\b|\bbrussels\b|\bbruxelles\b/i, code: "BE" },
  { pattern: /\bantverpy\b|\bantwerp\b/i, code: "BE" },

  // CH
  { pattern: /\bz[uü]rich\b|\bzurich\b/i, code: "CH" },
  { pattern: /\b[zž]eneva\b|\bgeneva\b|\bgen[eè]ve\b/i, code: "CH" },
  { pattern: /\bbasilej\b|\bbasel\b/i, code: "CH" },
  { pattern: /\bbern\b/i, code: "CH" },

  // IE / US
  { pattern: /\bdublin\b/i, code: "IE" },
  { pattern: /\bcork\b/i, code: "IE" },
  { pattern: /\bchicago\b/i, code: "US" },
  { pattern: /\bboston\b/i, code: "US" },
  { pattern: /\bmiami\b/i, code: "US" },
  { pattern: /\bseattle\b/i, code: "US" },
  { pattern: /\baustin\b/i, code: "US" },
  { pattern: /\bdallas\b/i, code: "US" },
];

/**
 * Detect country from free-text Radar query (city / country name).
 * Returns ISO code or null if nothing recognized.
 */
export function detectCountryFromQuery(query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  for (const { pattern, code } of QUERY_LOCATION_TO_COUNTRY) {
    if (pattern.test(q) && COUNTRY_BY_CODE.has(code)) {
      return code;
    }
  }
  return null;
}
