"use client";

import { useLanguage } from "@/context/LanguageContext";

/** During Suspense load — grey spots only, no copy / spinner. */
export function DashboardLoadingSubtitle() {
  return (
    <div className="flex shrink-0 flex-col gap-1.5" aria-hidden>
      <div className="sk-ghost-spot h-3 w-[min(100%,20rem)] rounded-md" />
    </div>
  );
}

export function DashboardSubtitle() {
  const { t } = useLanguage();
  return (
    <p className="shrink-0 text-xs text-[color:var(--sk-muted)] md:text-sm">
      {t("dashboard.subtitle")}
    </p>
  );
}
