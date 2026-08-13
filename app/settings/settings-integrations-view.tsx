"use client";

import { Suspense } from "react";
import { Plug } from "lucide-react";
import { IntegrationsPanel } from "@/app/settings/integrations-panel";
import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { useLanguage } from "@/context/LanguageContext";

export function SettingsIntegrationsView() {
  const { t } = useLanguage();

  return (
    <SettingsPageShell
      title={t("settings.pages.integrations.title")}
      description={t("settings.pages.integrations.desc")}
      icon={Plug}
      showSave={false}
    >
      <section
        id="integrations"
        className="sk-settings-panel h-full min-h-0 scroll-mt-4"
      >
        <div className="sk-settings-panel__content overflow-y-auto">
          <Suspense
            fallback={
              <div className="h-full min-h-[12rem] animate-pulse rounded-xl bg-muted/40" />
            }
          >
            <IntegrationsPanel />
          </Suspense>
        </div>
      </section>
    </SettingsPageShell>
  );
}
