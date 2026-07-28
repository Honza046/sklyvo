import { Suspense } from "react";
import Link from "next/link";
import { getSessionUser } from "@/app/actions/auth";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings, Bot, Users, Zap, Coins, Link as LinkIcon, Briefcase, Mail
} from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
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
import { parseStoredAiBehaviorSettings } from "@/lib/ai-behavior-settings";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSessionUser();
  const workspace = session.workspace;
  const isWorkspaceReady = Boolean(workspace);

  const planTier = workspace?.planTier;
  const isFreePlanTier =
    !planTier || planTier === "NONE" || planTier === "FREE";
  const isAgencyPlan =
    typeof planTier === "string" && planTier.toUpperCase().includes("AGENCY");

  const creditsUsed = workspace?.creditsUsed;
  const creditsTotal = workspace?.creditsTotal;
  const creditsLeft =
    typeof creditsUsed === "number" && typeof creditsTotal === "number"
      ? Math.max(0, creditsTotal - creditsUsed)
      : null;
  const creditPercentage =
    typeof creditsUsed === "number" &&
    typeof creditsTotal === "number" &&
    creditsTotal > 0
      ? (creditsUsed / creditsTotal) * 100
      : 0;

  const nowMs = Date.now();
  const trialEndsAt = workspace?.trialEndsAt;
  const subscriptionPeriodEnd = workspace?.subscriptionPeriodEnd;
  const subscriptionStatus = workspace?.subscriptionStatus ?? "FREE";

  const isTrialWithFutureEnd =
    subscriptionStatus === "TRIAL" &&
    trialEndsAt &&
    !Number.isNaN(trialEndsAt.getTime()) &&
    nowMs < trialEndsAt.getTime();

  const renewalReferenceDate = isTrialWithFutureEnd ? trialEndsAt : subscriptionPeriodEnd;

  const daysUntilRenewal =
    renewalReferenceDate && !Number.isNaN(renewalReferenceDate.getTime())
      ? Math.max(
          0,
          Math.ceil(
            (renewalReferenceDate.getTime() - nowMs) / (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const creditsRenewalSubline = (() => {
    if (daysUntilRenewal === null) return null;
    const d = daysUntilRenewal;
    const dayWord = d === 1 ? "den" : d >= 2 && d <= 4 ? "dny" : "dní";
    if (isTrialWithFutureEnd) {
      return `Zkušební doba končí za ${d} ${dayWord}.`;
    }
    return `Váš měsíční limit se obnoví za ${d} ${dayWord}.`;
  })();

  const subscriptionDateLine = (() => {
    if (!trialEndsAt || Number.isNaN(trialEndsAt.getTime())) {
      if (subscriptionPeriodEnd && !Number.isNaN(subscriptionPeriodEnd.getTime())) {
        const dateStr = subscriptionPeriodEnd.toLocaleDateString("cs-CZ");
        if (subscriptionStatus === "ACTIVE") {
          return `Tarif se obnoví: ${dateStr}`;
        }
        return `Předplatné končí: ${dateStr}`;
      }
      return null;
    }
    if (nowMs < trialEndsAt.getTime()) {
      return `Zkušební doba končí: ${trialEndsAt.toLocaleDateString("cs-CZ")}`;
    }
    if (subscriptionPeriodEnd && !Number.isNaN(subscriptionPeriodEnd.getTime())) {
      const dateStr = subscriptionPeriodEnd.toLocaleDateString("cs-CZ");
      if (subscriptionStatus === "ACTIVE") {
        return `Tarif se obnoví: ${dateStr}`;
      }
      return `Předplatné končí: ${dateStr}`;
    }
    return null;
  })();

  const aiBehaviorSettings = parseStoredAiBehaviorSettings(workspace?.systemPrompt);
  const emailConnection = isWorkspaceReady ? await getEmailConnectionState() : null;

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-start pb-24 pt-0 md:pb-28">
      <div className="mb-2 space-y-1 px-1 text-center sm:mb-6 sm:space-y-2">
        <div className="mb-1 flex items-center justify-center gap-2 sm:mb-2 sm:gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:rounded-2xl sm:p-3">
            <Settings className="h-5 w-5 sm:h-8 sm:w-8" />
          </div>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          Pracovní prostor
        </h1>
        <p className="mx-auto max-w-lg px-2 text-[11px] text-muted-foreground sm:text-sm">
          Spravujte nastavení projektu, integrace s vaším CRM a čerpání AI kreditů.
        </p>
      </div>

      <SettingsSaveProvider>
      <div className="flex w-full max-w-3xl flex-col gap-2.5 px-0 sm:gap-6 sm:px-4">
        
        {/* PŮVODNÍ HLAVIČKA S PŘEDPLATNÝM */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-2xl sm:p-5">
          {isWorkspaceReady ? (
            <>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Předplatné</p>
                {workspace?.subscriptionStatus === "FREE" ? (
                  <p className="text-base font-semibold sm:text-lg">Bez aktivního tarifu (Free verze)</p>
                ) : (
                  <p className="text-base font-semibold sm:text-lg">
                    {isFreePlanTier ? "Free verze" : workspace?.planTier}
                  </p>
                )}
                {subscriptionDateLine && (
                  <p className="text-xs text-muted-foreground">{subscriptionDateLine}</p>
                )}
              </div>
              <SubscriptionBillingButton
                showChoosePlan={workspace?.subscriptionStatus === "FREE"}
                isAgency={isAgencyPlan}
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-10 w-32 rounded-xl" />
            </>
          )}
        </div>

        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/40" />}>
        <SettingsAccordion>

          {/* PROFIL FIRMY PRO AI */}
          <AccordionItem
            value="company-profile"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Bot className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold sm:text-lg">Profil vaší firmy</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              <p className="text-sm text-muted-foreground">
                Popis firmy, služeb a výhod, podle kterého Sniper personalizuje odchozí e-maily.
              </p>
              {isWorkspaceReady ? (
                <CompanyProfileForm initialContext={workspace?.companyContext ?? ""} />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-44 w-full rounded-xl" />
                  <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          
          {/* NABÍZENÉ SLUŽBY FIRMY */}
          <AccordionItem
            value="offered-services"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold sm:text-lg">Nabízené služby</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              <p className="mb-4 text-sm text-muted-foreground">
                Služby, které vaše firma nabízí. Sniper je používá při generování obchodních e-mailů.
              </p>
              {isWorkspaceReady ? (
                <OfferedServicesManager
                  initialServices={workspace?.offeredServices ?? []}
                  initialCompanyServices={workspace?.companyServices ?? ""}
                />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-full max-w-md rounded-full" />
                  <Skeleton className="h-9 w-full max-w-lg rounded-full" />
                  <Skeleton className="h-11 w-full rounded-xl" />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* PŮVODNÍ SEKCE: KREDITY */}
          <AccordionItem
            value="credits"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger id="credits-trigger" className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Coins className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold sm:text-lg">Spotřeba a Kredity</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-6 pt-2">
              <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background p-5">
                {isWorkspaceReady && creditsLeft !== null && creditsTotal !== undefined ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">Zbývající kredity</h4>
                        {creditsRenewalSubline ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{creditsRenewalSubline}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">
                          {creditsLeft} <span className="text-sm font-medium text-muted-foreground">/ {creditsTotal}</span>
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Progress value={creditPercentage} className="h-2.5 rounded-full" />
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Vyčerpáno {creditPercentage.toFixed(0)} %</span>
                        <span>{creditsTotal} Max</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                      <div className="space-y-2 text-right">
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold">Potřebujete více výkonu?</p>
                    <p className="text-xs text-muted-foreground">Přejděte na vyšší tarif nebo si dokupte jednorázový balíček.</p>
                  </div>
                </div>
                <Button asChild className="rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700">
                  <Link href="/settings/billing">Navýšit limit</Link>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* PROPOJENÍ FIREMNÍHO E-MAILU */}
          <AccordionItem
            id={EMAIL_SETUP_SETTINGS_HASH}
            value="email-integration"
            className="scroll-mt-24 rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger id="email-integration-trigger" className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold sm:text-lg">Propojení firemního e-mailu</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              {emailConnection ? (
                <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/40" />}>
                  <EmailIntegrationPanel initialState={emailConnection} />
                </Suspense>
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-xl" />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* PŮVODNÍ SEKCE: INTEGRACE */}
          <AccordionItem
            id="integrations"
            value="integrations"
            className="scroll-mt-24 rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger id="integrations-trigger" className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold sm:text-lg">Integrace a Webhooky</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/40" />}>
                <IntegrationsPanel />
              </Suspense>
            </AccordionContent>
          </AccordionItem>

          {/* PŮVODNÍ SEKCE: AI CHOVÁNÍ */}
          <AccordionItem
            value="ai"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Bot className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold sm:text-lg">Chování AI a Šablony</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              {isWorkspaceReady ? (
                <AiBehaviorSettingsForm
                  initialEmailSignature={workspace?.emailSignature ?? ""}
                  initialSystemPrompt={aiBehaviorSettings.systemPrompt}
                  initialForbiddenWords={aiBehaviorSettings.forbiddenWords}
                />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-[100px] w-full rounded-lg" />
                  <Skeleton className="h-[60px] w-full rounded-lg" />
                  <Skeleton className="h-[150px] w-full rounded-lg" />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* PŮVODNÍ SEKCE: TÝM */}
          <AccordionItem
            value="team"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold sm:text-lg">Tým a přístupy</h2>
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