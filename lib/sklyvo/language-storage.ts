import type { Language as AuthLanguage } from "@/lib/sklyvo/i18n";
import { isLanguage as isAuthLanguage } from "@/lib/sklyvo/i18n";
import {
  LANGUAGES,
  STORAGE_KEY as APP_LANGUAGE_KEY,
  type Language as AppLanguage,
} from "@/lib/i18n/types";

/** Auth / landing toggle codes (`cs`, `en`, …). */
export const AUTH_LANGUAGE_KEY = "sklyvo.language";

/** Same-tab sync between auth + app language providers. */
export const LANGUAGE_CHANGE_EVENT = "sklyvo-language-change";

type LanguageChangeDetail = {
  authLanguage: AuthLanguage;
  appLanguage: AppLanguage;
};

function isAppLanguage(value: string | null): value is AppLanguage {
  return value !== null && (LANGUAGES as readonly string[]).includes(value);
}

export function authLanguageToApp(lang: AuthLanguage): AppLanguage {
  return lang === "cs" ? "cz" : lang;
}

export function appLanguageToAuth(lang: AppLanguage): AuthLanguage {
  return lang === "cz" ? "cs" : lang;
}

export function readAuthLanguage(): AuthLanguage | null {
  if (typeof window === "undefined") return null;
  const authStored = window.localStorage.getItem(AUTH_LANGUAGE_KEY);
  if (isAuthLanguage(authStored)) return authStored;
  const appStored = window.localStorage.getItem(APP_LANGUAGE_KEY);
  if (!isAppLanguage(appStored)) return null;
  return appLanguageToAuth(appStored);
}

export function readAppLanguage(): AppLanguage | null {
  if (typeof window === "undefined") return null;
  // Prefer auth key so login/landing choice wins over a stale app key.
  const authStored = window.localStorage.getItem(AUTH_LANGUAGE_KEY);
  if (isAuthLanguage(authStored)) return authLanguageToApp(authStored);
  const appStored = window.localStorage.getItem(APP_LANGUAGE_KEY);
  return isAppLanguage(appStored) ? appStored : null;
}

function emitLanguageChange(detail: LanguageChangeDetail) {
  window.dispatchEvent(
    new CustomEvent<LanguageChangeDetail>(LANGUAGE_CHANGE_EVENT, { detail }),
  );
}

/** Persist both storage keys and notify same-tab listeners. */
export function persistAuthLanguage(authLanguage: AuthLanguage) {
  const appLanguage = authLanguageToApp(authLanguage);
  window.localStorage.setItem(AUTH_LANGUAGE_KEY, authLanguage);
  window.localStorage.setItem(APP_LANGUAGE_KEY, appLanguage);
  emitLanguageChange({ authLanguage, appLanguage });
}

export function persistAppLanguage(appLanguage: AppLanguage) {
  persistAuthLanguage(appLanguageToAuth(appLanguage));
}

export function subscribeLanguageChange(
  onChange: (detail: LanguageChangeDetail) => void,
): () => void {
  const onCustom = (event: Event) => {
    const custom = event as CustomEvent<LanguageChangeDetail>;
    if (!custom.detail) return;
    onChange(custom.detail);
  };

  const onStorage = (event: StorageEvent) => {
    if (
      event.key !== AUTH_LANGUAGE_KEY &&
      event.key !== APP_LANGUAGE_KEY &&
      event.key !== null
    ) {
      return;
    }
    const authLanguage = readAuthLanguage();
    if (!authLanguage) return;
    onChange({
      authLanguage,
      appLanguage: authLanguageToApp(authLanguage),
    });
  };

  window.addEventListener(LANGUAGE_CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
