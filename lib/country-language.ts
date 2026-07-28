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
