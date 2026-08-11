"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  CreditCard,
  Gauge,
  Mail,
  Plug,
  Settings,
  Shield,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { OfferedServicesManager } from "@/app/settings/offered-services-manager";
import { CompanyProfileForm } from "@/app/settings/company-profile-form";
import { IntegrationsPanel } from "@/app/settings/integrations-panel";
import {
  AiBehaviorSettingsForm,
  SettingsSaveProvider,
} from "@/app/settings/ai-behavior-settings-form";
import { SettingsSaveButton } from "@/app/settings/settings-save-button";
import { SubscriptionBillingButton } from "@/app/settings/subscription-billing-button";
import { TeamAccessPanel } from "@/app/settings/team-access-panel";
import { EmailIntegrationPanel } from "@/app/settings/email-integration-panel";
import { SettingsAccordion } from "@/app/settings/settings-accordion";
import { useLanguage } from "@/context/LanguageContext";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";
import { DATE_LOCALE } from "@/lib/i18n/types";

function SettingsRowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="sk-settings-row-icon" aria-hidden>
      <Icon strokeWidth={2} />
    </span>
  );
}

export type SettingsWorkspaceViewProps = {
  isWorkspaceReady: boolean;
  isFreePlanTier: boolean;
  isAgencyPlan: boolean;
  billingManagerName: string | null;
  planTier: string | null | undefined;
  subscriptionStatus: string;
  creditsLeft: number | null;
  creditsTotal: number | undefined;
  creditPercentage: number;
  daysUntilRenewal: number | null;
  isTrialWithFutureEnd: boolean;
  trialEndsAtIso: string | null;
  subscriptionPeriodEndIso: string | null;
  companyContext: string;
  offeredServices: string[];
  companyServices: string;
  personalizedEmailSignature: string;
  signatureAuthor: string;
  signatureEmail: string;
  systemPrompt: string;
  forbiddenWords: string;
  emailConnection: React.ComponentProps<
    typeof EmailIntegrationPanel
  >["initialState"] | null;
};

export function SettingsWorkspaceView(props: SettingsWorkspaceViewProps) {
  const { t, language, dayWord } = useLanguage();
  const locale = DATE_LOCALE[language] || "cs-CZ";

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(locale);
  };

  const creditsRenewalSubline = (() => {
    if (props.daysUntilRenewal === null) return null;
    const d = props.daysUntilRenewal;
    if (props.isTrialWithFutureEnd) {
      return t("settings.creditsRenewTrial", {
        days: d,
        dayWord: dayWord(d),
      });
    }
    return t("settings.creditsRenewMonthly", {
      days: d,
      dayWord: dayWord(d),
    });
  })();

  const subscriptionDateLine = (() => {
    const trialDate = formatDate(props.trialEndsAtIso);
    const periodDate = formatDate(props.subscriptionPeriodEndIso);
    if (!props.trialEndsAtIso) {
      if (periodDate) {
        if (props.subscriptionStatus === "ACTIVE") {
          return t("settings.planRenewsOn", { date: periodDate });
        }
        return t("settings.subscriptionEndsOn", { date: periodDate });
      }
      return null;
    }
    const trialMs = new Date(props.trialEndsAtIso).getTime();
    if (Date.now() < trialMs && trialDate) {
      return t("settings.trialEndsOn", { date: trialDate });
    }
    if (periodDate) {
      if (props.subscriptionStatus === "ACTIVE") {
        return t("settings.planRenewsOn", { date: periodDate });
      }
      return t("settings.subscriptionEndsOn", { date: periodDate });
    }
    return null;
  })();

  const showChoosePlan =
    props.subscriptionStatus === "FREE" || props.isFreePlanTier;

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-start pb-24 pt-0 md:pb-28">
      <div className="mb-2 space-y-1 px-1 text-center sm:mb-6 sm:space-y-2">
        <div className="mb-1 flex items-center justify-center gap-2 sm:mb-2 sm:gap-3">
          <span className="sk-page-badge" aria-hidden>
            <Settings strokeWidth={2} />
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          {t("settings.title")}
        </h1>
        <p className="mx-auto max-w-lg px-2 text-[11px] text-muted-foreground sm:text-sm">
          {t("settings.subtitle")}
        </p>
      </div>

      <SettingsSaveProvider>
        <div className="flex w-full max-w-3xl flex-col gap-2.5 px-0 sm:gap-6 sm:px-4">
          <div className="sk-ghost-card overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm sm:rounded-2xl">
            {props.isWorkspaceReady ? (
              <div className="flex flex-col gap-4 p-3.5 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="sk-settings-row-icon" aria-hidden>
                    <CreditCard strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t("settings.subscription")}
                    </p>
                    <p className="mt-0.5 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                      {showChoosePlan
                        ? t("settings.freePlan")
                        : props.planTier}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {showChoosePlan ? (
                        <span>{t("settings.trialAccount")}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                            aria-hidden
                          />
                          {t("settings.active")}
                        </span>
                      )}
                      {props.isAgencyPlan ? (
                        <>
                          <span
                            aria-hidden
                            className="text-muted-foreground/40"
                          >
                            ·
                          </span>
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Shield
                              className="h-3 w-3 shrink-0 opacity-70"
                              strokeWidth={2}
                            />
                            <span className="truncate">
                              {t("settings.manager", {
                                name:
                                  props.billingManagerName?.trim() ||
                                  t("settings.ownerFallback"),
                              })}
                            </span>
                          </span>
                        </>
                      ) : null}
                    </p>
                    {subscriptionDateLine ? (
                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        {subscriptionDateLine}
                      </p>
                    ) : props.subscriptionStatus === "FREE" ? (
                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        {t("settings.noPaidPlan")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-end sm:items-center">
                  <SubscriptionBillingButton
                    showChoosePlan={props.subscriptionStatus === "FREE"}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-10 w-36 rounded-xl" />
              </div>
            )}
          </div>

          <Suspense
            fallback={
              <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
            }
          >
            <SettingsAccordion>
              <AccordionItem
                value="company-profile"
                className="sk-ghost-card rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
              >
                <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                  <div className="flex items-center gap-3">
                    <SettingsRowIcon icon={Building2} />
                    <h2 className="text-sm font-bold sm:text-lg">
                      {t("settings.companyProfile")}
                    </h2>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-6 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {t("settings.companyProfileDesc")}
                  </p>
                  {props.isWorkspaceReady ? (
                    <CompanyProfileForm
                      initialContext={props.companyContext}
                    />
                  ) : (
                    <PanelSkeleton />
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="offered-services"
                className="sk-ghost-card rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
              >
                <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                  <div className="flex items-center gap-3">
                    <SettingsRowIcon icon={Briefcase} />
                    <h2 className="text-sm font-bold sm:text-lg">
                      {t("settings.offeredServices")}
                    </h2>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-6 pt-2">
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t("settings.offeredServicesDesc")}
                  </p>
                  {props.isWorkspaceReady ? (
                    <OfferedServicesManager
                      initialServices={props.offeredServices}
                      initialCompanyServices={props.companyServices}
                    />
                  ) : (
                    <PanelSkeleton />
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="credits"
                className="sk-ghost-card rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
              >
                <AccordionTrigger
                  id="credits-trigger"
                  className="py-3 hover:no-underline sm:py-6"
                >
                  <div className="flex items-center gap-3">
                    <SettingsRowIcon icon={Gauge} />
                    <h2 className="text-sm font-bold sm:text-lg">
                      {t("settings.credits")}
                    </h2>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pb-6 pt-2">
                  <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background p-5">
                    {props.isWorkspaceReady &&
                    props.creditsLeft !== null &&
                    props.creditsTotal !== undefined ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold">
                              {t("settings.usageLimit")}
                            </h4>
                            {creditsRenewalSubline ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {creditsRenewalSubline}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-2xl font-bold tabular-nums text-foreground">
                            {props.creditPercentage.toFixed(0)}&nbsp;%
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Progress
                            value={props.creditPercentage}
                            className="h-2.5 rounded-full"
                          />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {t("settings.usedPct", {
                              pct: props.creditPercentage.toFixed(0),
                            })}
                          </p>
                        </div>
                      </>
                    ) : (
                      <PanelSkeleton />
                    )}
                  </div>

                  <div className="sk-billing-card flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 shrink-0 text-[color:var(--sk-brand)]" />
                      <div>
                        <p className="sk-billing-card__title text-sm font-semibold">
                          {t("settings.needMorePower")}
                        </p>
                        <p className="sk-billing-card__meta text-xs">
                          {t("settings.upgradeHint")}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      className="h-9 rounded-xl px-4 text-sm font-semibold"
                    >
                      <Link href="/pricing">{t("settings.choosePlan")}</Link>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                id={EMAIL_SETUP_SETTINGS_HASH}
                value="email-integration"
                className="sk-ghost-card scroll-mt-24 rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
              >
                <AccordionTrigger
                  id="email-integration-trigger"
                  className="py-3 hover:no-underline sm:py-6"
                >
                  <div className="flex items-center gap-3">
                    <SettingsRowIcon icon={Mail} />
                    <h2 className="text-sm font-bold sm:text-lg">
                      {t("settings.companyEmail")}
                    </h2>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-2">
                  {props.emailConnection ? (
                    <Suspense
                      fallback={
                        <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
                      }
                    >
                      <EmailIntegrationPanel
                        initialState={props.emailConnection}
                      />
                    </Suspense>
                  ) : (
                    <PanelSkeleton />
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                id="integrations"
                value="integrations"
                className="sk-ghost-card scroll-mt-24 rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
              >
                <AccordionTrigger
                  id="integrations-trigger"
                  className="py-3 hover:no-underline sm:py-6"
                >
                  <div className="flex items-center gap-3">
                    <SettingsRowIcon icon={Plug} />
                    <h2 className="text-sm font-bold sm:text-lg">
                      {t("settings.integrations")}
                    </h2>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pt-2">
                  <Suspense
                    fallback={
                      <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
                    }
                  >
                    <IntegrationsPanel />
                  </Suspense>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="ai"
                className="sk-ghost-card rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
              >
                <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                  <div className="flex items-center gap-3">
                    <SettingsRowIcon icon={Sparkles} />
                    <h2 className="text-sm font-bold sm:text-lg">
                      {t("settings.aiBehavior")}
                    </h2>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-5 pb-6 pt-2">
                  {props.isWorkspaceReady ? (
                    <AiBehaviorSettingsForm
                      initialEmailSignature={props.personalizedEmailSignature}
                      senderFullName={props.signatureAuthor}
                      senderEmail={props.signatureEmail}
                      initialSystemPrompt={props.systemPrompt}
                      initialForbiddenWords={props.forbiddenWords}
                    />
                  ) : (
                    <PanelSkeleton />
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="team"
                className="sk-ghost-card rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
              >
                <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
                  <div className="flex items-center gap-3">
                    <SettingsRowIcon icon={Users} />
                    <h2 className="text-sm font-bold sm:text-lg">
                      {t("settings.team")}
                    </h2>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-6 pt-2">
                  <TeamAccessPanel />
                </AccordionContent>
              </AccordionItem>
            </SettingsAccordion>
          </Suspense>

          <div className="flex justify-end pt-2">
            <SettingsSaveButton />
          </div>
        </div>
      </SettingsSaveProvider>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-10 w-36 rounded-xl" />
    </div>
  );
}
