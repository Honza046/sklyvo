"use client";

import {
 createContext,
 useCallback,
 useContext,
 useEffect,
 useMemo,
 useState,
 type ReactNode,
} from "react";
import { messages } from "@/lib/i18n/messages";
import { createTranslator } from "@/lib/i18n/translate";
import {
 HTML_LANG,
 LANGUAGE_LABELS,
 LANGUAGES,
 STORAGE_KEY,
 type Language,
 type TranslationParams,
} from "@/lib/i18n/types";
import {
 buildToggleSlots,
 defaultLanguageForRegional,
 isTranslatedLocale,
 localeFromBrowser,
 resolveRegionalLocale,
 type ToggleSlot,
} from "@/lib/sklyvo/locale";

type LanguageContextValue = {
 language: Language;
 setLanguage: (language: Language) => void;
 /** Regional | EN chips — same model as login (HU disabled + EN, etc.). */
 toggleSlots: ToggleSlot[];
 t: (path: string, params?: TranslationParams) => string;
 dayWord: (count: number) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const REGIONAL_STORAGE_KEY = "sklyvo.regional-locale";
/** Auth / marketing provider uses dotted key + `cs` instead of `cz`. */
const AUTH_STORAGE_KEY = "sklyvo.language";

/** Auth locale codes use `cs`; dashboard dictionaries use `cz`. */
export function languageFromToggleCode(code: string): Language | null {
 const normalized = code.toLowerCase();
 if (normalized === "cs") return "cz";
 if ((LANGUAGES as readonly string[]).includes(normalized)) {
 return normalized as Language;
 }
 return null;
}

export function displayCodeForLanguage(lang: Language): string {
 return lang === "cz" ? "cs" : lang;
}

function isAppLanguage(value: string | null): value is Language {
 return value !== null && (LANGUAGES as readonly string[]).includes(value);
}

function readStoredLanguage(): Language | null {
 if (typeof window === "undefined") return null;
 const appStored = localStorage.getItem(STORAGE_KEY);
 if (isAppLanguage(appStored)) return appStored;
 const authStored = localStorage.getItem(AUTH_STORAGE_KEY);
 if (!authStored) return null;
 return languageFromToggleCode(authStored);
}

function persistLanguage(next: Language) {
 localStorage.setItem(STORAGE_KEY, next);
 localStorage.setItem(AUTH_STORAGE_KEY, displayCodeForLanguage(next));
 document.documentElement.lang = HTML_LANG[next];
}

function defaultLanguageFromRegional(regionalCode: string): Language {
 const authDefault = defaultLanguageForRegional(regionalCode);
 return languageFromToggleCode(authDefault) ?? "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
 // Stable SSR default — geo/browser refine after mount (avoids hydration mismatch).
 const [language, setLanguageState] = useState<Language>("cz");
 const [regionalCode, setRegionalCode] = useState("cs");

 const writeLanguage = useCallback((next: Language) => {
 setLanguageState(next);
 persistLanguage(next);
 }, []);

 useEffect(() => {
 let cancelled = false;

 async function boot() {
 // Prefer any previously chosen language (app or auth) before geo default.
 const storedLang = readStoredLanguage();

 let country: string | null = null;
 let acceptLanguage: string | null = null;
 try {
 const response = await fetch("/api/geo-locale", { cache: "no-store" });
 if (response.ok) {
 const data = (await response.json()) as {
 country?: string | null;
 acceptLanguage?: string | null;
 };
 country = data.country ?? null;
 acceptLanguage = data.acceptLanguage ?? null;
 }
 } catch {
 // Offline — browser locale only.
 }

 if (cancelled) return;

 const regional = resolveRegionalLocale({
 country,
 acceptLanguage,
 browserLocale: localeFromBrowser(),
 });
 localStorage.setItem(REGIONAL_STORAGE_KEY, regional);
 setRegionalCode(regional);

 const slots = buildToggleSlots(regional);
 const enabled = new Set(
 slots.filter((s) => s.enabled).map((s) => s.code),
 );

 if (storedLang && enabled.has(displayCodeForLanguage(storedLang))) {
 writeLanguage(storedLang);
 return;
 }

 if (!isTranslatedLocale(regional)) {
 writeLanguage("en");
 return;
 }

 writeLanguage(defaultLanguageFromRegional(regional));
 }

 void boot();
 return () => {
 cancelled = true;
 };
 }, [writeLanguage]);

 const toggleSlots = useMemo(
 () => buildToggleSlots(regionalCode),
 [regionalCode],
 );

 const setLanguage = useCallback(
 (next: Language) => {
 const display = displayCodeForLanguage(next);
 const allowed = toggleSlots.some(
 (slot) => slot.enabled && slot.code === display,
 );
 if (!allowed) return;
 writeLanguage(next);
 },
 [toggleSlots, writeLanguage],
 );

 const dictionary = messages[language];

 const t = useMemo(
 () => createTranslator(dictionary as Record<string, unknown>),
 [dictionary],
 );

 const dayWord = useCallback(
 (count: number) => {
 if (language === "en" || language === "es" || language === "de") {
 return count === 1 ? t("common.daysOne") : t("common.daysMany");
 }
 if (count === 1) return t("common.daysOne");
 if (count >= 2 && count <= 4) return t("common.daysFew");
 return t("common.daysMany");
 },
 [language, t],
 );

 const value = useMemo(
 () => ({
 language,
 setLanguage,
 toggleSlots,
 t,
 dayWord,
 }),
 [language, setLanguage, toggleSlots, t, dayWord],
 );

 return (
 <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
 );
}

export function useLanguage() {
 const context = useContext(LanguageContext);
 if (!context) {
 throw new Error("useLanguage must be used within LanguageProvider");
 }
 return context;
}

export function useLanguageLabel(lang: Language = "cz") {
 return LANGUAGE_LABELS[lang];
}
