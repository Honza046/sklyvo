"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_LANGUAGE,
  dictionaries,
  isLanguage,
  type Dictionary,
  type Language,
} from "@/lib/sklyvo/i18n";
import {
  BASE_LANGUAGE,
  buildToggleSlots,
  defaultLanguageForRegional,
  isTranslatedLocale,
  localeFromBrowser,
  resolveActiveLanguage,
  resolveRegionalLocale,
  type ToggleSlot,
} from "@/lib/sklyvo/locale";

const STORAGE_KEY = "sklyvo.language";
const REGIONAL_STORAGE_KEY = "sklyvo.regional-locale";

let cached: Language | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot(): Language {
  if (cached === null) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    cached = isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cached = isLanguage(event.newValue) ? event.newValue : DEFAULT_LANGUAGE;
    notify();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeLanguage(next: Language) {
  cached = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  notify();
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  toggleSlots: ToggleSlot[];
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialRegional,
}: {
  children: React.ReactNode;
  /** Locale label from server (geo / Accept-Language) — may be untranslated. */
  initialRegional: string;
}) {
  const initialLanguage = defaultLanguageForRegional(initialRegional);

  const storedLanguage = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialLanguage,
  );

  // Never read localStorage / navigator here — that breaks hydration.
  const [regionalCode, setRegionalCode] = useState(initialRegional);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
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
        // Offline / local — fall back to browser locale.
      }

      if (cancelled) return;

      const regional = resolveRegionalLocale({
        country,
        acceptLanguage,
        browserLocale: localeFromBrowser(),
      });

      window.localStorage.setItem(REGIONAL_STORAGE_KEY, regional);
      setRegionalCode(regional);

      if (!isTranslatedLocale(regional)) {
        writeLanguage(BASE_LANGUAGE);
        return;
      }

      const slots = buildToggleSlots(regional);
      const enabled = slots.filter((s) => s.enabled).map((s) => s.code);
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!isLanguage(stored)) {
        writeLanguage(defaultLanguageForRegional(regional));
      } else if (!enabled.includes(stored)) {
        writeLanguage(defaultLanguageForRegional(regional));
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSlots = useMemo(
    () => buildToggleSlots(regionalCode),
    [regionalCode],
  );

  const activeLanguage = resolveActiveLanguage(storedLanguage, regionalCode);

  useEffect(() => {
    document.documentElement.lang = activeLanguage;
  }, [activeLanguage]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language: activeLanguage,
      setLanguage: (next: Language) => {
        const enabled = toggleSlots.some(
          (slot) => slot.enabled && slot.code === next,
        );
        if (!enabled) return;
        writeLanguage(next);
      },
      toggleSlots,
      t: dictionaries[activeLanguage] ?? dictionaries.en,
    }),
    [activeLanguage, toggleSlots],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside a LanguageProvider");
  }
  return context;
}
