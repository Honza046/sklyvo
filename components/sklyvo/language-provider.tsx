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
  persistAuthLanguage,
  readAuthLanguage,
  subscribeLanguageChange,
} from "@/lib/sklyvo/language-storage";
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

const REGIONAL_STORAGE_KEY = "sklyvo.regional-locale";

let cached: Language | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot(): Language {
  if (cached === null) {
    cached = readAuthLanguage() ?? DEFAULT_LANGUAGE;
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeLanguage(next: Language) {
  cached = next;
  persistAuthLanguage(next);
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
    return subscribeLanguageChange(({ authLanguage }) => {
      if (cached === authLanguage) return;
      cached = authLanguage;
      notify();
    });
  }, []);

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

      // Re-read after await so a toggle during boot is not overwritten.
      const stored = readAuthLanguage();
      if (stored) {
        if (cached !== stored) {
          cached = stored;
          notify();
        }
        return;
      }

      if (!isTranslatedLocale(regional)) {
        writeLanguage(BASE_LANGUAGE);
        return;
      }

      writeLanguage(defaultLanguageForRegional(regional));
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

export function useOptionalSklyvoLanguage() {
  return useContext(LanguageContext);
}

export function useLanguage() {
  const context = useOptionalSklyvoLanguage();
  if (!context) {
    throw new Error("useLanguage must be used inside a LanguageProvider");
  }
  return context;
}
