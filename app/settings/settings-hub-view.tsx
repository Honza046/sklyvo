"use client";

import Link from "next/link";
import {
  Briefcase,
  Check,
  ChevronRight,
  Mail,
  Plug,
  Users,
} from "lucide-react";
import { TrialStrip } from "@/components/account/trial-strip";
import { LegalDocumentLinks } from "@/components/legal/legal-document-links";
import { useLanguage } from "@/context/LanguageContext";
import type { WorkspaceSettingsData } from "@/lib/settings/load-workspace-settings";
import { cn } from "@/lib/utils";

type HubCard = {
  href: string;
  icon: typeof Briefcase;
  titleKey: string;
  descKey: string;
  accent: "amber" | "sky" | "cyan" | "emerald";
  status: string;
  ok: boolean;
};

function SettingsHubProgress(props: {
  hasCompanyProfile: boolean;
  hasOfferedServices: boolean;
  hasTeam: boolean;
  emailConnected: boolean;
}) {
  const { t } = useLanguage();

  const steps = [
    { done: props.hasCompanyProfile, label: t("settings.hub.steps.profile") },
    { done: props.hasOfferedServices, label: t("settings.hub.steps.services") },
    { done: props.hasTeam, label: t("settings.hub.steps.team") },
    { done: props.emailConnected, label: t("settings.hub.steps.email") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (pct >= 100) {
    return null;
  }

  return (
    <section
      className="sk-settings-hub-progress shrink-0"
      aria-label={t("settings.hub.progressTitle")}
    >
      <div className="sk-settings-hub-progress__status">
        <p className="sk-settings-hub-progress__title">
          {t("settings.hub.progressTitle")}
        </p>
        <p className="sk-settings-hub-progress__meta">
          {t("settings.hub.progressDone", {
            done: doneCount,
            total: steps.length,
          })}
        </p>
      </div>

      <ul className="sk-settings-hub-progress__steps">
        {steps.map((step) => (
          <li
            key={step.label}
            className={cn(
              "sk-settings-hub-progress__step",
              step.done && "is-done",
            )}
          >
            <span className="sk-settings-hub-progress__mark" aria-hidden>
              {step.done ? (
                <Check className="h-[9px] w-[9px]" strokeWidth={3.6} />
              ) : null}
            </span>
            <span className="sk-settings-hub-progress__label">{step.label}</span>
          </li>
        ))}
      </ul>

      <div className="sk-settings-hub-progress__end">
        <p className="sk-settings-hub-progress__pct" aria-hidden>
          {pct} %
        </p>
      </div>
    </section>
  );
}

export function SettingsHubView(props: WorkspaceSettingsData) {
  const { t } = useLanguage();

  const emailConnected = props.emailConnection?.connected === true;
  const integrationTotal = 6;
  const integrationConnected = [
    props.hubSheetsConnected,
    props.hubMicrosoftConnected,
    props.hubFakturoidConnected,
  ].filter(Boolean).length;

  const teamMax = 5;
  const teamCount = props.hubMemberCount ?? 0;
  const hasTeam = props.isAgencyPlan && teamCount > 1;

  const creditsTotal = props.creditsTotal ?? 0;
  const creditsLeft = props.creditsLeft ?? 0;
  const creditsUsed = Math.max(0, creditsTotal - creditsLeft);
  const trialDays = props.daysUntilRenewal ?? 0;
  const showTrialStrip =
    props.isTrialWithFutureEnd && trialDays > 0 && creditsTotal > 0;

  const cards: HubCard[] = [
    {
      href: "/settings/company",
      icon: Briefcase,
      titleKey: "settings.sections.company.title",
      descKey: "settings.sections.company.desc",
      accent: "amber",
      status:
        props.hasCompanyProfile && props.hasOfferedServices
          ? t("settings.sections.company.statusReady")
          : t("settings.sections.company.statusIncomplete"),
      ok: props.hasCompanyProfile && props.hasOfferedServices,
    },
    {
      href: "/settings/outreach",
      icon: Mail,
      titleKey: "settings.sections.outreach.title",
      descKey: "settings.sections.outreach.desc",
      accent: "sky",
      status: emailConnected
        ? t("settings.sections.outreach.statusConnected")
        : t("settings.sections.outreach.statusDisconnected"),
      ok: emailConnected,
    },
    {
      href: "/settings/integrations",
      icon: Plug,
      titleKey: "settings.sections.integrations.title",
      descKey: "settings.sections.integrations.desc",
      accent: "cyan",
      status: t("settings.sections.integrations.statusCount", {
        count: integrationConnected,
        total: integrationTotal,
      }),
      ok: integrationConnected > 0,
    },
    {
      href: "/settings/team",
      icon: Users,
      titleKey: "settings.sections.team.title",
      descKey: "settings.sections.team.desc",
      accent: "emerald",
      status: props.isAgencyPlan
        ? t("settings.sections.team.statusMembers", {
            count: teamCount,
            total: teamMax,
          })
        : t("settings.sections.team.agencyOnly"),
      ok: props.isAgencyPlan && teamCount > 0,
    },
  ];

  return (
    <div className="sk-settings-hub">
      <div className="sk-settings-hub__head shrink-0">
        <div className="sk-page-head sk-page-head--tool">
          <h1 className="sk-page-head__title">{t("settings.title")}</h1>
          <p className="sk-page-head__sub">{t("settings.hubSubtitle")}</p>
        </div>
        {showTrialStrip ? (
          <TrialStrip
            remainingDays={trialDays}
            creditsUsed={creditsUsed}
            creditsTotal={creditsTotal}
          />
        ) : null}
      </div>

      <SettingsHubProgress
        hasCompanyProfile={props.hasCompanyProfile}
        hasOfferedServices={props.hasOfferedServices}
        hasTeam={hasTeam}
        emailConnected={emailConnected}
      />

      <div className="sk-settings-hub__cards shrink-0">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="sk-settings-hub-card"
            >
              <div className="sk-settings-hub-card__top">
                <span
                  className="sk-settings-hub-card__icon"
                  data-accent={card.accent}
                  aria-hidden
                >
                  <Icon strokeWidth={1.9} />
                </span>
                <h2 className="sk-settings-hub-card__title">{t(card.titleKey)}</h2>
                <ChevronRight
                  className="sk-settings-hub-card__chevron"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
              <p className="sk-settings-hub-card__body">{t(card.descKey)}</p>
              <div className="sk-settings-hub-card__foot">
                <span
                  className={cn(
                    "sk-settings-hub-card__dot",
                    card.ok ? "is-ok" : "is-warn",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "sk-settings-hub-card__state",
                    card.ok ? "is-ok" : "is-warn",
                  )}
                >
                  {card.status}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <LegalDocumentLinks className="sk-settings-hub__legal" />
    </div>
  );
}
