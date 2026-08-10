import { isLanguage, type Language } from "@/lib/sklyvo/i18n";

/** English is always available in the auth language toggle. */
export const BASE_LANGUAGE: Language = "en";

export type ToggleSlot = {
 /** ISO-ish display code, e.g. "cs", "hu", "en". */
 code: string;
 /** False = label only (no translation yet), not clickable. */
 enabled: boolean;
};

/**
 * Connection country → UI locale label.
 * Only cs / de / en / es are translated; others show as a disabled chip + EN.
 */
const COUNTRY_TO_LOCALE: Record<string, string> = {
 // Translated
 CZ: "cs",
 DE: "de",
 AT: "de",
 LI: "de",
 CH: "de",
 ES: "es",
 MX: "es",
 AR: "es",
 CO: "es",
 CL: "es",
 PE: "es",
 EC: "es",
 UY: "es",
 VE: "es",
 BO: "es",
 PY: "es",
 CR: "es",
 PA: "es",
 GT: "es",
 HN: "es",
 SV: "es",
 NI: "es",
 DO: "es",
 CU: "es",
 IE: "en",
 GB: "en",
 UK: "en",
 US: "en",
 AU: "en",
 NZ: "en",
 CA: "en",
 // Shown as disabled label + EN until translated
 SK: "sk",
 HU: "hu",
 SI: "sl",
 HR: "hr",
 RS: "sr",
 BA: "bs",
 ME: "sr",
 PL: "pl",
 FR: "fr",
 BE: "fr",
 LU: "fr",
 MC: "fr",
 PT: "pt",
 BR: "pt",
 AO: "pt",
 MZ: "pt",
 IT: "it",
 SM: "it",
 VA: "it",
 NL: "nl",
 RO: "ro",
 BG: "bg",
 GR: "el",
 CY: "el",
 SE: "sv",
 NO: "nb",
 DK: "da",
 FI: "fi",
 EE: "et",
 LV: "lv",
 LT: "lt",
 TR: "tr",
 UA: "uk",
 RU: "ru",
 JP: "ja",
 KR: "ko",
 CN: "zh",
 TW: "zh",
 HK: "zh",
 VN: "vi",
 TH: "th",
 ID: "id",
 MY: "ms",
 PH: "tl",
 IN: "hi",
 IL: "he",
 SA: "ar",
 AE: "ar",
 EG: "ar",
};

function normalizeLocaleTag(tag: string): string | null {
 const primary = tag.trim().toLowerCase().split("-")[0];
 if (!primary || !/^[a-z]{2}$/.test(primary)) return null;
 return primary;
}

export function isTranslatedLocale(code: string): code is Language {
 return isLanguage(code);
}

export function localeFromCountry(country: string | null | undefined): string | null {
 if (!country) return null;
 return COUNTRY_TO_LOCALE[country.trim().toUpperCase()] ?? null;
}

export function localeFromAcceptLanguage(
 header: string | null | undefined,
): string | null {
 if (!header) return null;
 for (const part of header.split(",")) {
 const tag = part.trim().split(";")[0];
 if (!tag) continue;
 const primary = normalizeLocaleTag(tag);
 if (primary) return primary;
 }
 return null;
}

export function localeFromBrowser(): string | null {
 if (typeof navigator === "undefined") return null;
 const candidates = [
 ...(navigator.languages ?? []),
 navigator.language,
 ].filter(Boolean);
 for (const tag of candidates) {
 const primary = normalizeLocaleTag(tag);
 if (primary) return primary;
 }
 return null;
}

/**
 * Regional locale code for the left toggle slot (may be untranslated).
 * Prefer connection country, then Accept-Language / browser.
 * Falls back to Czech (product default).
 */
export function resolveRegionalLocale(input: {
 country?: string | null;
 acceptLanguage?: string | null;
 browserLocale?: string | null;
}): string {
 return (
 localeFromCountry(input.country) ??
 localeFromAcceptLanguage(input.acceptLanguage) ??
 input.browserLocale ??
 localeFromBrowser() ??
 "cs"
 );
}

/** Active UI language: translated regional, otherwise EN. */
export function defaultLanguageForRegional(regionalCode: string): Language {
 if (isTranslatedLocale(regionalCode)) return regionalCode;
 return BASE_LANGUAGE;
}

/** Toggle chips: regional first (maybe disabled), EN always second. */
export function buildToggleSlots(regionalCode: string): ToggleSlot[] {
 const code = regionalCode.toLowerCase();
 if (code === BASE_LANGUAGE) {
 return [{ code: BASE_LANGUAGE, enabled: true }];
 }
 return [
 { code, enabled: isTranslatedLocale(code) },
 { code: BASE_LANGUAGE, enabled: true },
 ];
}

export function resolveActiveLanguage(
 stored: Language,
 regionalCode: string,
): Language {
 const enabled = buildToggleSlots(regionalCode)
 .filter((slot) => slot.enabled)
 .map((slot) => slot.code);
 if (enabled.includes(stored)) return stored;
 return defaultLanguageForRegional(regionalCode);
}
