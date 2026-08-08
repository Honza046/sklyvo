"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardLanguageSwitcher } from "@/components/dashboard-language-switcher";
import { useLanguage } from "@/context/LanguageContext";
import { toCzechVocative } from "@/lib/sklyvo/czech-vocative";

export function DashboardPageHeader({ firstName }: { firstName: string }) {
  const { t, language } = useLanguage();
  const displayName =
    language === "cz" ? toCzechVocative(firstName) : firstName;

  return (
    <div className="sk-dashboard-header mb-0.5 flex w-full shrink-0 flex-col justify-between gap-2 md:mb-1 md:flex-row md:items-end md:gap-3">
      <div className="sk-page-head">
        <h1 className="sk-page-head__title">
          {t("dashboard.welcome", { name: displayName })}
        </h1>
        <p className="sk-page-head__sub">{t("dashboard.subtitle")}</p>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2">
        <div className="hidden md:block">
          <DashboardLanguageSwitcher />
        </div>
        <Link
          href="/crm"
          className="sk-btn sk-btn--secondary sk-btn--md flex-1 sm:flex-none"
        >
          {t("dashboard.viewCrm")}
        </Link>
        <Link
          href="/radar"
          className="sk-btn sk-btn--brand sk-btn--md flex-1 sm:flex-none"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {t("dashboard.newSearch")}
        </Link>
      </div>
    </div>
  );
}
