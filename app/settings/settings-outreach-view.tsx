"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { AiBehaviorSettingsForm } from "@/app/settings/ai-behavior-settings-form";
import { EmailIntegrationPanel } from "@/app/settings/email-integration-panel";
import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { useLanguage } from "@/context/LanguageContext";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";
import type { WorkspaceSettingsData } from "@/lib/settings/load-workspace-settings";

export function SettingsOutreachView(props: WorkspaceSettingsData) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash =
      typeof window !== "undefined"
        ? window.location.hash.replace(/^#/, "")
        : "";
    const openEmail =
      hash === EMAIL_SETUP_SETTINGS_HASH ||
      hash === "email-integration" ||
      Boolean(
        searchParams.get("smtpMode") ||
          searchParams.get("smtpHost") ||
          searchParams.get("emailConnected") ||
          searchParams.get("emailError"),
      );
    if (!openEmail) return;
    requestAnimationFrame(() => {
      document
        .getElementById(EMAIL_SETUP_SETTINGS_HASH)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [searchParams]);

  return (
    <SettingsPageShell
      title={t("settings.pages.outreach.title")}
      description={t("settings.pages.outreach.desc")}
      icon={Mail}
    >
      <div className="sk-settings-split">
        <section
          id={EMAIL_SETUP_SETTINGS_HASH}
          className="sk-settings-panel scroll-mt-4"
        >
          <div className="sk-settings-panel__head">
            <h2 className="sk-settings-panel__title">
              {t("settings.companyEmail")}
            </h2>
          </div>
          <div className="sk-settings-panel__content">
            {props.emailConnection ? (
              <Suspense
                fallback={
                  <div className="h-full min-h-[12rem] animate-pulse rounded-xl bg-muted/40" />
                }
              >
                <EmailIntegrationPanel
                  initialState={props.emailConnection}
                  compact
                />
              </Suspense>
            ) : null}
          </div>
        </section>

        <section className="sk-settings-panel">
          <div className="sk-settings-panel__head">
            <h2 className="sk-settings-panel__title">
              {t("settings.aiBehavior")}
            </h2>
          </div>
          <div className="sk-settings-panel__content">
            {props.isWorkspaceReady ? (
              <AiBehaviorSettingsForm
                initialEmailSignature={props.personalizedEmailSignature}
                senderFullName={props.signatureAuthor}
                senderEmail={props.signatureEmail}
                initialSystemPrompt={props.systemPrompt}
                initialForbiddenWords={props.forbiddenWords}
                compact
              />
            ) : null}
          </div>
        </section>
      </div>
    </SettingsPageShell>
  );
}
