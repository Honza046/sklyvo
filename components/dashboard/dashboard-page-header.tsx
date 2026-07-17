"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLanguageSwitcher } from "@/components/dashboard-language-switcher";
import { useLanguage } from "@/context/LanguageContext";

export function DashboardPageHeader({ firstName }: { firstName: string }) {
  const { t } = useLanguage();

  return (
    <div className="mb-2 flex w-full shrink-0 flex-col justify-between gap-2 md:flex-row md:items-end">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("dashboard.welcome", { name: firstName })}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <DashboardLanguageSwitcher />
        <Button
          variant="outline"
          className="h-9 rounded-xl border-border/60 bg-background font-semibold hover:bg-muted"
          asChild
        >
          <Link href="/crm">{t("dashboard.viewCrm")}</Link>
        </Button>
        <Button
          className="h-9 rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
          asChild
        >
          <Link href="/radar">
            <Plus className="mr-2 h-4 w-4" /> {t("dashboard.newSearch")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
