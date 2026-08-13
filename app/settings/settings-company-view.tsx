"use client";

import { Briefcase } from "lucide-react";
import { CompanyProfileForm } from "@/app/settings/company-profile-form";
import {
  CompanyServicesDetailForm,
  CompanyServicesProvider,
  OfferedServicesPicker,
} from "@/app/settings/offered-services-manager";
import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { useLanguage } from "@/context/LanguageContext";
import type { WorkspaceSettingsData } from "@/lib/settings/load-workspace-settings";

export function SettingsCompanyView(props: WorkspaceSettingsData) {
  const { t } = useLanguage();

  return (
    <SettingsPageShell
      title={t("settings.pages.company.title")}
      description={t("settings.pages.company.desc")}
      icon={Briefcase}
    >
      {props.isWorkspaceReady ? (
        <CompanyServicesProvider
          initialServices={props.offeredServices}
          initialCompanyServices={props.companyServices}
        >
          <div className="sk-settings-split">
            <section className="sk-settings-panel">
              <div className="sk-settings-panel__head">
                <h2 className="sk-settings-panel__title">
                  {t("settings.companyProfile")}
                </h2>
                <p className="sk-settings-panel__desc">
                  {t("settings.companyProfileDesc")}
                </p>
              </div>
              <div className="sk-settings-panel__content">
                <div className="grid h-full min-h-0 grid-rows-2 gap-4">
                  <CompanyProfileForm
                    initialContext={props.companyContext}
                    compact
                  />
                  <CompanyServicesDetailForm compact />
                </div>
              </div>
            </section>

            <section className="sk-settings-panel">
              <div className="sk-settings-panel__head">
                <h2 className="sk-settings-panel__title">
                  {t("settings.offeredServices")}
                </h2>
                <p className="sk-settings-panel__desc">
                  {t("settings.offeredServicesDesc")}
                </p>
              </div>
              <div className="sk-settings-panel__content">
                <OfferedServicesPicker compact />
              </div>
            </section>
          </div>
        </CompanyServicesProvider>
      ) : null}
    </SettingsPageShell>
  );
}
