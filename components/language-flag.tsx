import { cn } from "@/lib/utils";

/** Jazykový kód (cs/en/…) → ISO země pro flagcdn (cz/gb/…). */
const LANGUAGE_FLAG_COUNTRY: Record<string, string> = {
  cs: "cz",
  cz: "cz",
  sk: "sk",
  en: "gb",
  de: "de",
  es: "es",
  ru: "ru",
  fr: "fr",
  pl: "pl",
  it: "it",
  nl: "nl",
};

export const SNIPER_LANGUAGE_LABELS: Record<string, string> = {
  cs: "Čeština",
  sk: "Slovenština",
  en: "Angličtina",
  de: "Němčina",
  es: "Španělština",
  ru: "Ruština",
  fr: "Francouzština",
  pl: "Polština",
  it: "Italština",
  nl: "Nizozemština",
};

/** PNG vlajka — funguje i na Windows, kde emoji 🇨🇿 padají na text „CZ“. */
export function LanguageFlag({
  code,
  className,
  title,
}: {
  code: string;
  className?: string;
  title?: string;
}) {
  const country = LANGUAGE_FLAG_COUNTRY[code.trim().toLowerCase()];
  if (!country) {
    return (
      <span
        className={cn(
          "inline-flex h-3.5 w-[1.15rem] shrink-0 items-center justify-center text-[11px] leading-none",
          className,
        )}
        aria-hidden
      >
        🌐
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote flag CDN, not app assets
    <img
      src={`https://flagcdn.com/w40/${country}.png`}
      srcSet={`https://flagcdn.com/w80/${country}.png 2x`}
      width={20}
      height={15}
      alt=""
      title={title}
      loading="lazy"
      decoding="async"
      className={cn(
        "inline-block h-3.5 w-[1.15rem] shrink-0 rounded-[2px] object-cover",
        className,
      )}
    />
  );
}

export function hasLanguageFlag(code: string): boolean {
  return Boolean(LANGUAGE_FLAG_COUNTRY[code.trim().toLowerCase()]);
}
