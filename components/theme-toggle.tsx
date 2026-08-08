"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

/** Po mountu — `next-themes` na SSR ještě neví resolved theme → hydration mismatch. */
function useMountedTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const toggle = () => setTheme(isDark ? "light" : "dark");
  return { mounted, isDark, toggle };
}

export function ThemeToggleIconButton({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { mounted, isDark, toggle } = useMountedTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-8 w-8 shrink-0 rounded-full border border-border/50 bg-muted/60 p-0 text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
      aria-label={isDark ? t("nav.lightMode") : t("nav.darkMode")}
      onClick={toggle}
      disabled={!mounted}
    >
      {/* Stejný SSR i první client paint (default light → Moon). */}
      {!mounted || !isDark ? (
        <Moon className="h-3.5 w-3.5" />
      ) : (
        <Sun className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

export function ThemeToggleMenuItem() {
  const { t } = useLanguage();
  const { mounted, isDark, toggle } = useMountedTheme();

  return (
    <DropdownMenuItem
      className="cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:bg-muted"
      onClick={toggle}
      disabled={!mounted}
    >
      {!mounted || !isDark ? (
        <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
      ) : (
        <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
      )}
      <span>{isDark ? t("nav.lightMode") : t("nav.darkMode")}</span>
    </DropdownMenuItem>
  );
}
