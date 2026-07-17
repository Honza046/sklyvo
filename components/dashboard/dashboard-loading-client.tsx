"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function DashboardLoadingSubtitle() {
  const { t } = useLanguage();

  return (
    <p className="shrink-0 text-sm text-muted-foreground">
      {t("dashboard.subtitle")}{" "}
      <span className="ml-3 inline-flex animate-in fade-in items-center text-sm font-medium text-blue-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t("common.loading")}
      </span>
    </p>
  );
}

export function DashboardSubtitle() {
  const { t } = useLanguage();
  return <p className="shrink-0 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>;
}
