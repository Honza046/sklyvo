"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Briefcase,
  Check,
  ChevronRight,
  CreditCard,
  Lock,
  Mail,
  Plug,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { WorkspaceSettingsData } from "@/lib/settings/load-workspace-settings";
import { cn } from "@/lib/utils";

type HubCardPreview =
  | "company"
  | "outreach"
  | "integrations"
  | "team"
  | "billing"
  | "account";

type HubCard = {
  href?: string;
  icon: LucideIcon;
  titleKey: string;
  preview: HubCardPreview;
  status?: string;
  statusTone?: "ok" | "warn" | "muted";
  disabled?: boolean;
  accent?: string;
};

function truncate(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

function HubCardShell(props: {
  card: HubCard;
  children: React.ReactNode;
}) {
  const { card, children } = props;
  const baseClass = cn(
    "sk-settings-hub-card sk-ghost-card flex h-full min-h-0 flex-col rounded-xl border p-4 sm:rounded-2xl sm:p-5",
    card.disabled
      ? "cursor-default border-dashed border-border/60 bg-muted/20"
      : "group border-border/60 bg-card shadow-sm transition-all hover:border-border",
  );

  if (card.disabled || !card.href) {
    return <div className={baseClass}>{children}</div>;
  }

  return (
    <Link href={card.href} className={baseClass}>
      {children}
    </Link>
  );
}

function HubCardPreviewPanel(props: {
  preview: HubCardPreview;
  data: WorkspaceSettingsData;
  emailConnected: boolean;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const { preview, data, emailConnected, disabled } = props;

  if (preview === "company") {
    const snippet = data.companyContext.trim();
    return (
      <div className="sk-settings-hub-card__preview">
        <p className="sk-settings-hub-card__snippet">
          {snippet
            ? truncate(snippet, 140)
            : t("settings.hub.preview.companyEmpty")}
        </p>
        {data.offeredServices.length > 0 ? (
          <div className="sk-settings-hub-card__tags">
            {data.offeredServices.slice(0, 4).map((service) => (
              <span key={service} className="sk-settings-hub-card__tag">
                {service}
              </span>
            ))}
            {data.offeredServices.length > 4 ? (
              <span className="sk-settings-hub-card__tag sk-settings-hub-card__tag--more">
                +{data.offeredServices.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}
        {data.offeredServices.length > 0 ? (
          <p className="sk-settings-hub-card__meta">
            {t("settings.hub.preview.servicesCount", {
              count: data.offeredServices.length,
            })}
          </p>
        ) : null}
      </div>
    );
  }

  if (preview === "outreach") {
    const sender =
      data.emailConnection?.senderEmail ||
      data.signatureEmail ||
      null;
    return (
      <div className="sk-settings-hub-card__preview">
        {emailConnected && sender ? (
          <>
            <p className="sk-settings-hub-card__email">
              {t("settings.hub.preview.emailConnected", { email: sender })}
            </p>
            <p className="sk-settings-hub-card__meta">
              {data.emailConnection?.provider?.replace("_", " ") ?? "SMTP"}
            </p>
          </>
        ) : (
          <p className="sk-settings-hub-card__hint sk-settings-hub-card__hint--warn">
            {t("settings.hub.preview.emailDisconnected")}
          </p>
        )}
        <p className="sk-settings-hub-card__meta">
          {data.systemPrompt.trim()
            ? t("settings.hub.preview.aiReady")
            : data.personalizedEmailSignature.trim() || "—"}
        </p>
      </div>
    );
  }

  if (preview === "integrations") {
    const items = [
      {
        label: "E-mail",
        on: emailConnected,
      },
      {
        label: "Sheets",
        on: data.hubSheetsConnected,
      },
      {
        label: "Microsoft",
        on: data.hubMicrosoftConnected,
      },
      {
        label: "Fakturoid",
        on: data.hubFakturoidConnected,
      },
    ];
    return (
      <div className="sk-settings-hub-card__preview">
        <div className="sk-settings-hub-card__integrations">
          {items.map((item) => (
            <span
              key={item.label}
              className={cn(
                "sk-settings-hub-card__integration",
                item.on && "is-on",
              )}
            >
              <span className="sk-settings-hub-card__integration-dot" aria-hidden />
              {item.label}
            </span>
          ))}
        </div>
        <p className="sk-settings-hub-card__meta">
          {t("settings.hub.preview.integrationsHint")}
        </p>
      </div>
    );
  }

  if (preview === "team") {
    return (
      <div className="sk-settings-hub-card__preview">
        {disabled ? (
          <div className="sk-settings-hub-card__locked">
            <Lock className="h-4 w-4" aria-hidden />
            <p>{t("settings.hub.preview.teamLocked")}</p>
          </div>
        ) : (
          <>
            <p className="sk-settings-hub-card__stat">
              {t("settings.hub.preview.teamMembers", {
                count: data.hubMemberCount,
              })}
            </p>
            <p className="sk-settings-hub-card__meta">
              {t("settings.hub.preview.teamAgency")}
            </p>
          </>
        )}
      </div>
    );
  }

  if (preview === "billing") {
    const pct = Math.min(100, Math.max(0, data.creditPercentage));
    const plan = data.planTier?.replace(/_/g, " ") ?? "FREE";
    return (
      <div className="sk-settings-hub-card__preview">
        <p className="sk-settings-hub-card__stat">
          {t("settings.hub.preview.planLabel", { plan })}
        </p>
        {typeof data.creditsLeft === "number" &&
        typeof data.creditsTotal === "number" ? (
          <>
            <div className="sk-settings-hub-card__meter" aria-hidden>
              <div
                className="sk-settings-hub-card__meter-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="sk-settings-hub-card__meta">
              {t("settings.hub.preview.creditsLeft", {
                left: data.creditsLeft,
                total: data.creditsTotal,
              })}
            </p>
          </>
        ) : null}
        {data.daysUntilRenewal != null ? (
          <p className="sk-settings-hub-card__meta">
            {t("settings.hub.preview.renewalIn", {
              days: data.daysUntilRenewal,
            })}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sk-settings-hub-card__preview">
      <p className="sk-settings-hub-card__stat">
        {t("settings.hub.preview.accountUser", {
          name: data.signatureAuthor,
        })}
      </p>
      <p className="sk-settings-hub-card__email">{data.signatureEmail}</p>
      <p className="sk-settings-hub-card__meta">{data.subscriptionStatus}</p>
    </div>
  );
}

function SettingsHubProgress(props: {
  hasCompanyProfile: boolean;
  hasOfferedServices: boolean;
  emailConnected: boolean;
}) {
  const { t } = useLanguage();
  const steps = [
    {
      done: props.hasCompanyProfile,
      label: t("settings.hub.steps.profile"),
      href: "/settings/company",
    },
    {
      done: props.hasOfferedServices,
      label: t("settings.hub.steps.services"),
      href: "/settings/company",
    },
    {
      done: props.emailConnected,
      label: t("settings.hub.steps.email"),
      href: "/settings/outreach",
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (allDone) {
    return (
      <p className="sk-settings-hub-footnote sk-page-desc sk-type-body">
        {t("settings.hubUsageHint")}
      </p>
    );
  }

  const nextStep = steps.find((step) => !step.done);

  return (
    <section
      className="sk-settings-hub-progress sk-settings-hub-progress--compact"
      aria-label={t("settings.hub.progressTitle")}
    >
      <div className="sk-settings-hub-progress__head">
        <div className="min-w-0">
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
        <div
          className="sk-settings-hub-progress__ring"
          style={{ "--sk-hub-progress": `${pct}%` } as React.CSSProperties}
          aria-hidden
        >
          <span>{pct}%</span>
        </div>
      </div>

      <ul className="sk-settings-hub-progress__steps">
        {steps.map((step) => (
          <li key={step.label}>
            {step.done ? (
              <span className="sk-settings-hub-progress__step is-done">
                <span className="sk-settings-hub-progress__mark" aria-hidden>
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                {step.label}
              </span>
            ) : (
              <Link
                href={step.href}
                className="sk-settings-hub-progress__step"
              >
                <span className="sk-settings-hub-progress__mark" aria-hidden />
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {nextStep ? (
        <Link href={nextStep.href} className="sk-settings-hub-progress__cta">
          {t("settings.hub.progressCta")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}

export function SettingsHubView(props: WorkspaceSettingsData) {
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "email-integration") {
      router.replace("/settings/outreach#email-integration");
      return;
    }
    if (hash === "integrations") {
      router.replace("/settings/integrations");
      return;
    }
    if (hash === "credits") {
      router.replace("/account#billing");
    }
  }, [router]);

  const emailConnected = props.emailConnection?.connected === true;
  const usagePct = props.creditPercentage.toFixed(0);

  const cards: HubCard[] = [
    {
      href: "/settings/company",
      icon: Briefcase,
      titleKey: "settings.sections.company.title",
      preview: "company",
      accent: "amber",
      status:
        props.hasCompanyProfile && props.hasOfferedServices
          ? t("settings.sections.company.statusReady")
          : t("settings.sections.company.statusIncomplete"),
      statusTone:
        props.hasCompanyProfile && props.hasOfferedServices ? "ok" : "warn",
    },
    {
      href: "/settings/outreach",
      icon: Mail,
      titleKey: "settings.sections.outreach.title",
      preview: "outreach",
      accent: "emerald",
      status: emailConnected
        ? t("settings.sections.outreach.statusConnected")
        : t("settings.sections.outreach.statusDisconnected"),
      statusTone: emailConnected ? "ok" : "warn",
    },
    {
      href: "/settings/integrations",
      icon: Plug,
      titleKey: "settings.sections.integrations.title",
      preview: "integrations",
      accent: "cyan",
    },
    props.isAgencyPlan
      ? {
          href: "/settings/team",
          icon: Users,
          titleKey: "settings.sections.team.title",
          preview: "team",
          accent: "violet",
        }
      : {
          icon: Users,
          titleKey: "settings.sections.team.title",
          preview: "team",
          accent: "violet",
          disabled: true,
        },
    {
      href: "/account#billing",
      icon: CreditCard,
      titleKey: "settings.sections.billing.title",
      preview: "billing",
      accent: "blue",
      status: t("settings.sections.billing.statusUsage", { pct: usagePct }),
      statusTone: "muted",
    },
    {
      href: "/account",
      icon: User,
      titleKey: "settings.sections.account.title",
      preview: "account",
      accent: "rose",
    },
  ];

  return (
    <div className="sk-settings-hub">
      <div className="sk-settings-hub__head shrink-0">
        <div className="mb-2 flex items-center justify-center gap-3">
          <span className="sk-page-badge" data-accent="indigo" aria-hidden>
            <Settings strokeWidth={2} />
          </span>
        </div>
        <h1 className="sk-type-h1">{t("settings.title")}</h1>
        <p className="sk-page-desc sk-type-body">
          {t("settings.hubSubtitle")}
        </p>
      </div>

      <div className="sk-settings-hub__grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <HubCardShell key={card.titleKey} card={card}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "sk-settings-row-icon shrink-0",
                      card.disabled && "opacity-60",
                    )}
                    data-accent={card.accent}
                    aria-hidden
                  >
                    <Icon strokeWidth={2} />
                  </span>
                  <h2 className="text-sm font-bold leading-snug text-foreground sm:text-base">
                    {t(card.titleKey)}
                  </h2>
                </div>
                {!card.disabled ? (
                  <ChevronRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
              </div>

              <HubCardPreviewPanel
                preview={card.preview}
                data={props}
                emailConnected={emailConnected}
                disabled={card.disabled}
              />

              {card.status ? (
                <p
                  className={cn(
                    "sk-settings-hub-card__status",
                    card.statusTone === "ok" && "is-ok",
                    card.statusTone === "warn" && "is-warn",
                    card.statusTone === "muted" && "is-muted",
                  )}
                >
                  {card.status}
                </p>
              ) : null}
            </HubCardShell>
          );
        })}
      </div>

      <div className="sk-settings-hub__foot shrink-0">
        <SettingsHubProgress
          hasCompanyProfile={props.hasCompanyProfile}
          hasOfferedServices={props.hasOfferedServices}
          emailConnected={emailConnected}
        />
      </div>
    </div>
  );
}
