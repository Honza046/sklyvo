import { Suspense } from "react";
import Link from "next/link";
import { getSessionUser } from "@/app/actions/auth";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings,
  Users,
  Zap,
  Briefcase,
  Mail,
  CreditCard,
  Shield,
  Building2,
  Gauge,
  Sparkles,
  Plug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { personalizeEmailSignature } from "@/lib/email-format";
import { authorFromSessionUser } from "@/lib/lead-provenance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function SettingsRowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="sk-settings-row-icon" aria-hidden>
      <Icon strokeWidth={2} />
    </span>
  );
}
export default async function SettingsPage() {
  const session = await getSessionUser();
  const workspace = session.workspace;
  const isWorkspaceReady = Boolean(workspace);

  const planTier = workspace?.planTier;
  const isFreePlanTier =
    !planTier || planTier === "NONE" || planTier === "FREE";
  const isAgencyPlan =
    typeof planTier === "string" && planTier.toUpperCase().includes("AGENCY");

  let billingManagerName: string | null = null;
  if (isAgencyPlan && workspace?.id) {
    const owner = await prisma.user.findFirst({
      where: { workspaceId: workspace.id, role: "OWNER" },
      select: { name: true, email: true },
    });
    const name = owner?.name?.trim();
    if (name) {
      billingManagerName = name;
    } else if (owner?.email) {
      const local = owner.email.split("@")[0] ?? "";
      billingManagerName = local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
    }
  }

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
  const signatureAuthor =
    authorFromSessionUser(session.user) ||
    session.user?.name?.trim() ||
    "Uživatel";
  const signatureEmail = session.user?.email?.trim() || "";
  const personalizedEmailSignature = personalizeEmailSignature(
    workspace?.emailSignature ?? "",
    { fullName: signatureAuthor, senderEmail: signatureEmail },
  );
  const emailConnection = isWorkspaceReady ? await getEmailConnectionState() : null;

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-start pb-24 pt-0 md:pb-28">
      <div className="mb-2 space-y-1 px-1 text-center sm:mb-6 sm:space-y-2">
        <div className="mb-1 flex items-center justify-center gap-2 sm:mb-2 sm:gap-3">
          <span className="sk-page-badge" aria-hidden>
            <Settings strokeWidth={2} />
          </span>
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
        
        {/* PŘEDPLATNÉ */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm sm:rounded-2xl">
          {isWorkspaceReady ? (
            <div className="flex flex-col gap-4 p-3.5 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="sk-settings-row-icon" aria-hidden>
                  <CreditCard strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Předplatné
                  </p>
                  <p className="mt-0.5 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    {workspace?.subscriptionStatus === "FREE" || isFreePlanTier
                      ? "Free verze"
                      : workspace?.planTier}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {workspace?.subscriptionStatus === "FREE" || isFreePlanTier ? (
                      <span>Zkušební účet</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                          aria-hidden
                        />
                        Aktivní
                      </span>
                    )}
                    {isAgencyPlan ? (
                      <>
                        <span aria-hidden className="text-muted-foreground/40">
                          ·
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Shield className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} />
                          <span className="truncate">
                            Správce {billingManagerName?.trim() || "vlastník"}
                          </span>
                        </span>
                      </>
                    ) : null}
                  </p>
                  {subscriptionDateLine ? (
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      {subscriptionDateLine}
                    </p>
                  ) : workspace?.subscriptionStatus === "FREE" ? (
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      Bez aktivního placeného tarifu
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-end sm:items-center">
                <SubscriptionBillingButton
                  showChoosePlan={workspace?.subscriptionStatus === "FREE"}
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

        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/40" />}>
        <SettingsAccordion>

          {/* PROFIL FIRMY PRO AI */}
          <AccordionItem
            value="company-profile"
            className="rounded-xl border border-border/60 bg-card px-3 shadow-sm sm:rounded-2xl sm:px-6 transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-3 hover:no-underline sm:py-6">
              <div className="flex items-center gap-3">
                <SettingsRowIcon icon={Building2} />
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
                <SettingsRowIcon icon={Briefcase} />
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
                <SettingsRowIcon icon={Gauge} />
                <h2 className="text-sm font-bold sm:text-lg">Spotřeba</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-6 pt-2">
              <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background p-5">
                {isWorkspaceReady && creditsLeft !== null && creditsTotal !== undefined ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold">Využití limitu</h4>
                        {creditsRenewalSubline ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{creditsRenewalSubline}</p>
                        ) : null}
                      </div>
                      <p className="text-2xl font-bold tabular-nums text-foreground">
                        {creditPercentage.toFixed(0)}&nbsp;%
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Progress value={creditPercentage} className="h-2.5 rounded-full" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Vyčerpáno {creditPercentage.toFixed(0)} %
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                      <Skeleton className="h-7 w-14" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-28" />
                  </>
                )}
              </div>

              <div className="sk-billing-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 shrink-0 text-[color:var(--sk-brand)]" />
                  <div>
                    <p className="sk-billing-card__title text-sm font-semibold">Potřebujete více výkonu?</p>
                    <p className="sk-billing-card__meta text-xs">
                      Přejděte na vyšší tarif nebo si dokupte jednorázový balíček.
                    </p>
                  </div>
                </div>
                <Button asChild className="h-9 rounded-xl px-4 text-sm font-semibold">
                  <Link href="/pricing">Vybrat tarif</Link>
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
                <SettingsRowIcon icon={Mail} />
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
                <SettingsRowIcon icon={Plug} />
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
                <SettingsRowIcon icon={Sparkles} />
                <h2 className="text-sm font-bold sm:text-lg">Chování AI a Šablony</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              {isWorkspaceReady ? (
                <AiBehaviorSettingsForm
                  initialEmailSignature={personalizedEmailSignature}
                  senderFullName={signatureAuthor}
                  senderEmail={signatureEmail}
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
                <SettingsRowIcon icon={Users} />
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