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

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (path: string, params?: TranslationParams) => string;
  dayWord: (count: number) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value !== null && (LANGUAGES as readonly string[]).includes(value);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("cz");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) {
      setLanguageState(stored);
      document.documentElement.lang = HTML_LANG[stored];
    }
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = HTML_LANG[next];
  }, []);

  const dictionary = messages[language];

  const t = useMemo(() => createTranslator(dictionary as Record<string, unknown>), [dictionary]);

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
      t,
      dayWord,
    }),
    [language, setLanguage, t, dayWord],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
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
