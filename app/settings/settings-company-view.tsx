"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CompanyProfileForm } from "@/app/settings/company-profile-form";
import {
  CompanyServicesDetailForm,
  CompanyServicesProvider,
  OfferedServicesPicker,
} from "@/app/settings/offered-services-manager";
import {
  SettingsSaveProvider,
} from "@/app/settings/ai-behavior-settings-form";
import { SettingsSaveButton } from "@/app/settings/settings-save-button";
import { useLanguage } from "@/context/LanguageContext";
import type { WorkspaceSettingsData } from "@/lib/settings/load-workspace-settings";

export function SettingsCompanyView(props: WorkspaceSettingsData) {
  const { t } = useLanguage();

  return (
    <SettingsSaveProvider>
      <div className="sk-company-page">
        <header className="sk-company-page__header">
          <div className="sk-page-head sk-page-head--tool">
            <h1 className="sk-page-head__title">
              {t("settings.pages.company.title")}
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
            <SettingsSaveButton variant="white" />
          </div>
        </header>

        {props.isWorkspaceReady ? (
          <div className="sk-company-page__body">
            <CompanyServicesProvider
              initialServices={props.offeredServices}
              initialCompanyServices={props.companyServices}
            >
              <div className="sk-company-split">
                <section className="sk-company-panel sk-company-panel--profile">
                  <div className="sk-company-panel__head">
                    <h2 className="sk-company-panel__title">
                      {t("settings.companyProfile")}
                    </h2>
                    <p className="sk-company-panel__desc">
                      {t("settings.companyProfileDesc")}
                    </p>
                  </div>
                  <div className="sk-company-panel__fields">
                    <CompanyProfileForm
                      initialContext={props.companyContext}
                      compact
                    />
                    <CompanyServicesDetailForm compact />
                  </div>
                </section>

                <section className="sk-company-panel sk-company-panel--services">
                  <div className="sk-company-panel__head">
                    <h2 className="sk-company-panel__title">
                      {t("settings.offeredServices")}
                    </h2>
                  </div>
                  <div className="sk-company-panel__content">
                    <OfferedServicesPicker compact />
                  </div>
                </section>
              </div>
            </CompanyServicesProvider>
          </div>
        ) : null}
      </div>
    </SettingsSaveProvider>
  );
}
