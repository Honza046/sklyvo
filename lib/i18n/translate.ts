import type { TranslationParams } from "@/lib/i18n/types";

export function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function createTranslator(dictionary: Record<string, unknown>) {
  return function t(path: string, params?: TranslationParams): string {
    const value = getByPath(dictionary, path);
    if (typeof value === "string") return interpolate(value, params);
    return path;
  };
}
