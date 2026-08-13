"use client";

import Link from "next/link";
import { ArrowLeft, Settings, type LucideIcon } from "lucide-react";
import { SettingsSaveProvider } from "@/app/settings/ai-behavior-settings-form";
import { SettingsSaveButton } from "@/app/settings/settings-save-button";
import { useLanguage } from "@/context/LanguageContext";

type SettingsPageShellProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  showSave?: boolean;
  children: React.ReactNode;
};

export function SettingsPageShell({
  title,
  description,
  icon: Icon = Settings,
  showSave = true,
  children,
}: SettingsPageShellProps) {
  const { t } = useLanguage();

  return (
    <div className="sk-settings-page flex h-full min-h-0 w-full flex-1 flex-col">
      <header className="sk-settings-page__header shrink-0">
        <div className="sk-settings-page__toolbar">
          <Link
            href="/settings"
            className="sk-settings-page__back inline-flex items-center gap-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-label={t("settings.backToHub")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("settings.back")}
          </Link>

          {showSave ? (
            <SettingsSaveButton compact />
          ) : (
            <span className="h-9 w-9 shrink-0" aria-hidden />
          )}
        </div>

        <div className="sk-settings-page__head">
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="sk-page-badge" aria-hidden>
              <Icon strokeWidth={2} />
            </span>
          </div>
          <h1 className="sk-type-h1">{title}</h1>
          <p className="sk-page-desc sk-type-body">{description}</p>
        </div>
      </header>

      <SettingsSaveProvider>
        <div className="sk-settings-page__body min-h-0 flex-1">{children}</div>
      </SettingsSaveProvider>
    </div>
  );
}
