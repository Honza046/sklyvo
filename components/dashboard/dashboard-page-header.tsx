"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLanguageSwitcher } from "@/components/dashboard-language-switcher";
import { useLanguage } from "@/context/LanguageContext";

export function DashboardPageHeader({ firstName }: { firstName: string }) {
  const { t } = useLanguage();

  return (
    <div className="mb-0.5 flex w-full shrink-0 flex-col justify-between gap-1.5 md:mb-1 md:flex-row md:items-end md:gap-2">
      <div className="space-y-0.5">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-2xl">
          {t("dashboard.welcome", { name: firstName })}
        </h1>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2">
        <div className="hidden md:block">
          <DashboardLanguageSwitcher />
        </div>
        <Button
          variant="outline"
          className="h-8 flex-1 rounded-lg border-border/60 bg-background px-2.5 text-xs font-semibold hover:bg-muted sm:h-9 sm:flex-none sm:rounded-xl sm:px-4 sm:text-sm"
          asChild
        >
          <Link href="/crm">{t("dashboard.viewCrm")}</Link>
        </Button>
        <Button
          className="h-8 flex-1 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 sm:h-9 sm:flex-none sm:rounded-xl sm:px-4 sm:text-sm"
          asChild
        >
          <Link href="/radar">
            <Plus className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> {t("dashboard.newSearch")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
