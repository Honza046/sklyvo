"use client";

import { Users } from "lucide-react";
import { TeamAccessPanel } from "@/app/settings/team-access-panel";
import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { useLanguage } from "@/context/LanguageContext";

export function SettingsTeamView() {
  const { t } = useLanguage();

  return (
    <SettingsPageShell
      title={t("settings.pages.team.title")}
      description={t("settings.pages.team.desc")}
      icon={Users}
      showSave={false}
    >
      <section className="sk-settings-panel h-full min-h-0">
        <div className="sk-settings-panel__content overflow-y-auto">
          <TeamAccessPanel />
        </div>
      </section>
    </SettingsPageShell>
  );
}
