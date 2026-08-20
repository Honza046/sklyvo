"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  DASHBOARD_RANGE_KEYS,
  useDashboardRange,
} from "@/components/dashboard/dashboard-range-context";
import { useLanguage } from "@/context/LanguageContext";
import { toCzechVocative } from "@/lib/sklyvo/czech-vocative";

export function DashboardPageHeader({ firstName }: { firstName: string }) {
  const { t, language } = useLanguage();
  const { range, setRange } = useDashboardRange();
  const displayName =
    language === "cz" ? toCzechVocative(firstName) : firstName;

  const rangeLabels = {
    "7d": t("dashboard.range7d"),
    "1m": t("dashboard.range1m"),
    "3m": t("dashboard.range3m"),
    "6m": t("dashboard.range6m"),
    "1y": t("dashboard.range1y"),
  } as const;

  return (
    <div className="sk-dashboard-header mb-0.5 flex w-full shrink-0 flex-col justify-between gap-2 md:mb-1 md:flex-row md:items-start md:gap-6">
      <div className="sk-page-head">
        <h1 className="sk-page-head__title">
          {t("dashboard.welcome", { name: displayName })}
        </h1>
        <p className="sk-page-head__sub">{t("dashboard.subtitle")}</p>
      </div>

      <div className="sk-dashboard-toolbar">
        <div className="sk-range-tabs">
          {DASHBOARD_RANGE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className="sk-range-tabs__btn"
              data-active={range === key || undefined}
            >
              {rangeLabels[key]}
            </button>
          ))}
        </div>

        <span className="sk-dashboard-toolbar__divider" aria-hidden />

        <Link href="/crm" className="sk-dash-btn sk-dash-btn--raised">
          {t("dashboard.viewCrm")}
        </Link>
        <Link href="/radar" className="sk-dash-btn sk-dash-btn--white">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          {t("dashboard.newSearch")}
        </Link>
      </div>
    </div>
  );
}
