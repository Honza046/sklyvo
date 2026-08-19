"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  AiBehaviorMatejPanel,
  AiBehaviorSettingsProvider,
  EmailSignatureField,
  SettingsSaveProvider,
} from "@/app/settings/ai-behavior-settings-form";
import { EmailIntegrationPanel } from "@/app/settings/email-integration-panel";
import { SettingsSaveButton } from "@/app/settings/settings-save-button";
import { useLanguage } from "@/context/LanguageContext";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";
import type { WorkspaceSettingsData } from "@/lib/settings/load-workspace-settings";

function OutreachContent(props: WorkspaceSettingsData) {
  const { t } = useLanguage();

  return (
    <SettingsSaveProvider>
      <AiBehaviorSettingsProvider
        initialEmailSignature={props.personalizedEmailSignature}
        senderFullName={props.signatureAuthor}
        senderEmail={props.signatureEmail}
        initialSystemPrompt={props.systemPrompt}
        initialForbiddenWords={props.forbiddenWords}
      >
        <div className="sk-outreach-page">
          <header className="sk-outreach-page__header">
            <div className="sk-page-head sk-page-head--tool">
              <h1 className="sk-page-head__title">
                {t("settings.pages.outreach.title")}
              </h1>
              <p className="sk-page-head__sub">{t("settings.hubSubtitle")}</p>
            </div>

            <div className="sk-outreach-page__toolbar">
              <Link
                href="/settings"
                className="sk-outreach-page__back"
                aria-label={t("settings.backToHub")}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                {t("settings.back")}
              </Link>
              <SettingsSaveButton variant="white" />
            </div>
          </header>

          <div className="sk-outreach-page__body">
            <div className="sk-outreach-split">
              <section
                id={EMAIL_SETUP_SETTINGS_HASH}
                className="sk-outreach-panel sk-outreach-panel--scroll scroll-mt-4"
              >
                <h2 className="sk-outreach-panel__title">
                  {t("settings.companyEmail")}
                </h2>
                {props.emailConnection ? (
                  <Suspense
                    fallback={
                      <div className="sk-outreach-panel__loading animate-pulse" />
                    }
                  >
                    <EmailIntegrationPanel
                      initialState={props.emailConnection}
                      matej
                    />
                  </Suspense>
                ) : null}
                <EmailSignatureField matej />
              </section>

              <section className="sk-outreach-panel sk-outreach-panel--scroll">
                <h2 className="sk-outreach-panel__title">
                  {t("settings.aiBehavior")}
                </h2>
                {props.isWorkspaceReady ? <AiBehaviorMatejPanel /> : null}
              </section>
            </div>
          </div>
        </div>
      </AiBehaviorSettingsProvider>
    </SettingsSaveProvider>
  );
}

export function SettingsOutreachView(props: WorkspaceSettingsData) {
  useEffect(() => {
    const hash =
      typeof window !== "undefined"
        ? window.location.hash.replace(/^#/, "")
        : "";
    const openEmail =
      hash === EMAIL_SETUP_SETTINGS_HASH || hash === "email-integration";
    if (!openEmail) return;
    requestAnimationFrame(() => {
      document
        .getElementById(EMAIL_SETUP_SETTINGS_HASH)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  return <OutreachContent {...props} />;
}
