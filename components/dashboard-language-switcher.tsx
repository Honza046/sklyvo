"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  LANGUAGES,
  type Language,
} from "@/lib/i18n/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function DashboardLanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="relative h-9 w-[38px] shrink-0">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "group absolute right-0 top-0 flex h-9 w-[38px] shrink-0 items-center justify-center",
              "cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-background",
              "transition-[width] duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
              isDropdownOpen
                ? "z-20 w-[125px] bg-muted"
                : "z-10 hover:z-20 hover:w-[125px] hover:bg-muted",
            )}
            aria-label={t("common.languageAria", { label: LANGUAGE_LABELS[language] })}
            aria-expanded={isDropdownOpen}
          >
            <span
              className={cn(
                "flex items-center justify-center",
                isDropdownOpen ? "gap-2" : "gap-0 group-hover:gap-2",
              )}
            >
              <span className="flex h-3.5 w-5 shrink-0 items-center justify-center text-sm leading-none select-none">
                {LANGUAGE_FLAGS[language]}
              </span>
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-sm font-semibold text-foreground will-change-opacity",
                  "transition-opacity duration-200",
                  isDropdownOpen
                    ? "max-w-[84px] opacity-100"
                    : "max-w-0 opacity-0 group-hover:max-w-[84px] group-hover:opacity-100 group-hover:delay-100",
                )}
              >
                {LANGUAGE_LABELS[language]}
              </span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-[100] min-w-[11rem] rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          {LANGUAGES.map((lang: Language) => (
            <DropdownMenuItem
              key={lang}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium",
                "text-foreground hover:bg-gray-50 focus:bg-gray-50 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800",
              )}
              onClick={() => setLanguage(lang)}
            >
              <span className="flex h-3.5 w-5 shrink-0 items-center justify-center text-sm leading-none">
                {LANGUAGE_FLAGS[lang]}
              </span>
              <span className="min-w-0 flex-1 truncate">{LANGUAGE_LABELS[lang]}</span>
              <span className="flex w-3.5 shrink-0 items-center justify-center">
                {language === lang ? <Check className="h-3.5 w-3.5 text-blue-600" /> : null}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
