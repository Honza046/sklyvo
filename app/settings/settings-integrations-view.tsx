"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { IntegrationsPanel } from "@/app/settings/integrations-panel";
import { useLanguage } from "@/context/LanguageContext";

export function SettingsIntegrationsView() {
  const { t } = useLanguage();

  return (
    <div className="sk-integrations-page sk-company-page">
      <header className="sk-company-page__header">
        <div className="sk-page-head sk-page-head--tool">
          <h1 className="sk-page-head__title">
            {t("settings.pages.integrations.title")}
          </h1>
          <p className="sk-page-head__sub">{t("settings.hubSubtitle")}</p>
        </div>

        <div className="sk-company-page__toolbar">
          <Link
            href="/settings"
            className="sk-company-page__back"
            aria-label={t("settings.backToHub")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("settings.back")}
          </Link>
          <button type="button" className="sk-btn sk-btn--white">
            {t("common.save")}
          </button>
        </div>
      </header>

      <div className="sk-company-page__body">
        <Suspense
          fallback={
            <div className="sk-integrations-panel">
              <div className="h-full min-h-[16rem] animate-pulse rounded-[18px] bg-[color:var(--n-field)]" />
            </div>
          }
        >
          <IntegrationsPanel />
        </Suspense>
      </div>
    </div>
  );
}
