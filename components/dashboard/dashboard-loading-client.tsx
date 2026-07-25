"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function DashboardLoadingSubtitle() {
  const { t } = useLanguage();

  return (
    <p className="shrink-0 text-xs text-muted-foreground md:text-sm">
      {t("dashboard.subtitle")}{" "}
      <span className="ml-2 inline-flex animate-in fade-in items-center text-xs font-medium text-blue-500 md:ml-3 md:text-sm">
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin md:mr-2 md:h-4 md:w-4" />
        {t("common.loading")}
      </span>
    </p>
  );
}

export function DashboardSubtitle() {
  const { t } = useLanguage();
  return <p className="shrink-0 text-xs text-muted-foreground md:text-sm">{t("dashboard.subtitle")}</p>;
}
