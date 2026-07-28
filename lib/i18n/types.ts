export const LANGUAGES = ["cz", "en", "es", "de"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  cz: "Čeština",
  en: "English",
  es: "Español",
  de: "Deutsch",
};

export const HTML_LANG: Record<Language, string> = {
  cz: "cs",
  en: "en",
  es: "es",
  de: "de",
};

export const STORAGE_KEY = "venegard-language";

export const DATE_LOCALE: Record<Language, string> = {
  cz: "cs-CZ",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
};

export type TranslationParams = Record<string, string | number>;
