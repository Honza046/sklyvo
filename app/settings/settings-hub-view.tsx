"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Check,
  ChevronRight,
  Mail,
  Plug,
  Users,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type {
  HubTeamMember,
  WorkspaceSettingsData,
} from "@/lib/settings/load-workspace-settings";
import { TeamMemberAvatar } from "@/components/settings/team-member-avatar";
import { cn } from "@/lib/utils";

type CardDef = {
  href: string;
  icon: typeof Briefcase;
  titleKey: string;
  descKey: string;
  accent: string;
  statusKey?: string;
  statusTone?: "ok" | "warn";
};

function progressDismissStorageKey(workspaceId: string | null) {
  return `sklyvo-settings-progress-dismissed:${workspaceId ?? "unknown"}`;
}

function SettingsHubProgress(props: {
  workspaceId: string | null;
  hasCompanyProfile: boolean;
  hasOfferedServices: boolean;
  hasTeam: boolean;
  emailConnected: boolean;
}) {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hiding, setHiding] = useState(false);

  const steps = [
    { done: props.hasCompanyProfile, label: t("settings.hub.steps.profile") },
    { done: props.hasOfferedServices, label: t("settings.hub.steps.services") },
    { done: props.hasTeam, label: t("settings.hub.steps.team") },
    { done: props.emailConnected, label: t("settings.hub.steps.email") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const isComplete = pct === 100;

  useEffect(() => {
    const key = progressDismissStorageKey(props.workspaceId);
    const stored = window.localStorage.getItem(key) === "1";
    setDismissed(stored);
    setHydrated(true);
  }, [props.workspaceId]);

  useEffect(() => {
    if (!isComplete && dismissed) {
      const key = progressDismissStorageKey(props.workspaceId);
      window.localStorage.removeItem(key);
      setDismissed(false);
      setHiding(false);
    }
  }, [isComplete, dismissed, props.workspaceId]);

  useEffect(() => {
    if (!hydrated || !isComplete || dismissed) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fadeDelayMs = reduced ? 0 : 1400;
    const hideDelayMs = reduced ? 500 : 2100;

    const fadeTimer = window.setTimeout(() => setHiding(true), fadeDelayMs);
    const hideTimer = window.setTimeout(() => {
      const key = progressDismissStorageKey(props.workspaceId);
      window.localStorage.setItem(key, "1");
      setDismissed(true);
    }, hideDelayMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [hydrated, isComplete, dismissed, props.workspaceId]);

  if (hydrated && isComplete && dismissed) {
    return null;
  }

  return (
    <section
      className={cn(
        "sk-settings-hub-progress shrink-0",
        hiding && "is-hiding",
      )}
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
                <Check className="h-3 w-3" strokeWidth={3} />
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

function SettingsHubTeamSection(props: {
  isAgencyPlan: boolean;
  members: HubTeamMember[];
}) {
  const { t } = useLanguage();
  const maxMembers = 5;
  const showRoster = props.isAgencyPlan && props.members.length > 1;

  const shellClass =
    "sk-settings-hub-team sk-surface sk-surface--pad flex min-h-[120px] flex-col rounded-xl";

  const titleBlock = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="sk-settings-row-icon shrink-0"
          data-accent="green"
          aria-hidden
        >
          <Users strokeWidth={2} />
        </span>
        <h2 className="text-[14px] font-bold text-[color:var(--sk-ink)]">
          {t("settings.sections.team.title")}
        </h2>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--sk-muted)]">
        {t("settings.sections.team.desc")}
      </p>
    </>
  );

  if (!props.isAgencyPlan) {
    return (
      <section className={cn(shellClass, "is-locked")}>
        {titleBlock}
        <p className="sk-settings-hub-team__locked mt-auto pt-3">
          {t("settings.sections.team.agencyOnly")}
        </p>
      </section>
    );
  }

  if (!showRoster) {
    return (
      <Link href="/settings/team" className={cn(shellClass, "group transition-all")}>
        {titleBlock}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="sk-settings-hub-team__meta">
            {t("settings.hub.preview.teamAgency")}
          </p>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[color:var(--sk-muted)] transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
            aria-hidden
          />
        </div>
      </Link>
    );
  }

  return (
    <section className={shellClass}>
      {titleBlock}

      <div className="sk-settings-hub-team__meta-row pt-1">
        <span>
          {t("settings.sections.team.statusMembers", {
            count: props.members.length,
            total: maxMembers,
          })}
        </span>
        <Link href="/settings/team" className="sk-settings-hub-team__link">
          {t("settings.hub.teamManage")}
        </Link>
      </div>

      <ul className="sk-settings-hub-team__list">
        {props.members.map((member) => (
          <li key={member.id} className="sk-settings-hub-team__member">
            <TeamMemberAvatar
              name={member.name}
              avatarUrl={member.avatarUrl}
            />
            <div className="sk-settings-hub-team__member-main">
              <span className="sk-settings-hub-team__member-name">
                {member.name}
              </span>
              <span className="sk-settings-hub-team__member-email">
                {member.email}
              </span>
            </div>
            <span className="sk-settings-hub-team__member-role">
              {teamRoleLabel(member.role, t)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function teamRoleLabel(
  role: HubTeamMember["role"],
  t: (path: string) => string,
) {
  switch (role) {
    case "OWNER":
      return t("settings.teamPanel.owner");
    case "ADMIN":
      return t("settings.teamPanel.admin");
    case "MEMBER":
      return t("settings.teamPanel.member");
    default:
      return role;
  }
}

export function SettingsHubView(props: WorkspaceSettingsData) {
  const { t } = useLanguage();

  const emailConnected = props.emailConnection?.connected === true;

  const cards: CardDef[] = [
    {
      href: "/settings/company",
      icon: Briefcase,
      titleKey: "settings.sections.company.title",
      descKey: "settings.sections.company.desc",
      accent: "amber",
      statusKey:
        props.hasCompanyProfile && props.hasOfferedServices
          ? "settings.sections.company.statusReady"
          : "settings.sections.company.statusIncomplete",
      statusTone:
        props.hasCompanyProfile && props.hasOfferedServices ? "ok" : "warn",
    },
    {
      href: "/settings/outreach",
      icon: Mail,
      titleKey: "settings.sections.outreach.title",
      descKey: "settings.sections.outreach.desc",
      accent: "emerald",
      statusKey: emailConnected
        ? "settings.sections.outreach.statusConnected"
        : "settings.sections.outreach.statusDisconnected",
      statusTone: emailConnected ? "ok" : "warn",
    },
    {
      href: "/settings/integrations",
      icon: Plug,
      titleKey: "settings.sections.integrations.title",
      descKey: "settings.sections.integrations.desc",
      accent: "cyan",
    },
  ];

  return (
    <div className="sk-settings-hub flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="sk-page-head shrink-0">
        <h1 className="sk-page-head__title">{t("settings.title")}</h1>
        <p className="sk-page-head__sub">{t("settings.hubSubtitle")}</p>
      </div>

      <SettingsHubProgress
        workspaceId={props.workspaceId}
        hasCompanyProfile={props.hasCompanyProfile}
        hasOfferedServices={props.hasOfferedServices}
        hasTeam={props.isAgencyPlan && (props.hubMemberCount ?? 0) > 1}
        emailConnected={emailConnected}
      />

      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const status = card.statusKey ? t(card.statusKey) : null;
          const isWarn = card.statusTone === "warn";
          const isOk = card.statusTone === "ok";

          return (
            <Link
              key={card.titleKey}
              href={card.href}
              className="sk-surface sk-surface--pad group flex min-h-[120px] flex-col rounded-xl transition-all"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="sk-settings-row-icon shrink-0"
                  data-accent={card.accent}
                  aria-hidden
                >
                  <Icon strokeWidth={2} />
                </span>
                <h2 className="text-[14px] font-bold text-[color:var(--sk-ink)]">
                  {t(card.titleKey)}
                </h2>
              </div>

              <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--sk-muted)]">
                {t(card.descKey)}
              </p>

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                {status ? (
                  <p className="flex min-w-0 items-center gap-2 text-[12px] font-semibold">
                    <span
                      className={cn(
                        "inline-block h-[7px] w-[7px] shrink-0 rounded-full",
                        isOk && "bg-emerald-500",
                        isWarn && "bg-rose-400",
                        !isOk && !isWarn && "bg-[color:var(--sk-muted)]",
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        isOk && "text-[color:var(--sk-ink-soft)]",
                        isWarn && "text-rose-400",
                      )}
                    >
                      {status}
                    </span>
                  </p>
                ) : (
                  <span aria-hidden />
                )}
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[color:var(--sk-muted)] transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </div>
            </Link>
          );
        })}
        <SettingsHubTeamSection
          isAgencyPlan={props.isAgencyPlan}
          members={props.hubTeamMembers}
        />
      </div>
    </div>
  );
}
