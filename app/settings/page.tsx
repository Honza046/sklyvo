import Link from "next/link";
import { getSessionUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings, Bot, Users, Zap, Coins, Link as LinkIcon, Briefcase
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { OfferedServicesManager } from "@/app/settings/offered-services-manager";
import { IntegrationsPanel } from "@/app/settings/integrations-panel";
import { SettingsSaveButton } from "@/app/settings/settings-save-button";
import { SubscriptionBillingButton } from "@/app/settings/subscription-billing-button";
import { TeamAccessPanel } from "@/app/settings/team-access-panel";

export default async function SettingsPage() {
  const session = await getSessionUser();
  const workspace = session.workspace;
  const isWorkspaceReady = Boolean(workspace);

  const planTier = workspace?.planTier;
  const isFreePlanTier =
    !planTier || planTier === "NONE" || planTier === "FREE";

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
  const subscriptionDateLine = (() => {
    if (!trialEndsAt || Number.isNaN(trialEndsAt.getTime())) {
      if (subscriptionPeriodEnd && !Number.isNaN(subscriptionPeriodEnd.getTime())) {
        return `Předplatné končí: ${subscriptionPeriodEnd.toLocaleDateString("cs-CZ")}`;
      }
      return null;
    }
    if (nowMs < trialEndsAt.getTime()) {
      return `Zkušební doba končí: ${trialEndsAt.toLocaleDateString("cs-CZ")}`;
    }
    if (subscriptionPeriodEnd && !Number.isNaN(subscriptionPeriodEnd.getTime())) {
      return `Předplatné končí: ${subscriptionPeriodEnd.toLocaleDateString("cs-CZ")}`;
    }
    return null;
  })();

  return (
    <div className="flex h-full w-full flex-col items-center justify-start pt-0 pb-12">
      <div className="mb-6 space-y-2 text-center">
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Settings className="h-8 w-8" />
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Pracovní prostor
        </h1>
        <p className="mx-auto max-w-lg text-sm text-muted-foreground">
          Spravujte nastavení projektu, integrace s vaším CRM a čerpání AI kreditů.
        </p>
      </div>

      <div className="flex w-full max-w-3xl flex-col gap-6 px-4">
        
        {/* PŮVODNÍ HLAVIČKA S PŘEDPLATNÝM */}
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-5">
          {isWorkspaceReady ? (
            <>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Předplatné</p>
                {workspace?.subscriptionStatus === "FREE" ? (
                  <p className="text-lg font-semibold">Bez aktivního tarifu (Free verze)</p>
                ) : (
                  <p className="text-lg font-semibold">
                    {isFreePlanTier ? "Free verze" : workspace?.planTier}
                  </p>
                )}
                {subscriptionDateLine && (
                  <p className="text-xs text-muted-foreground">{subscriptionDateLine}</p>
                )}
              </div>
              <SubscriptionBillingButton showChoosePlan={workspace?.subscriptionStatus === "FREE"} />
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

        <Accordion type="single" collapsible defaultValue="offered-services" className="w-full space-y-4">
          
          {/* NABÍZENÉ SLUŽBY FIRMY */}
          <AccordionItem
            value="offered-services"
            className="rounded-2xl border border-border/60 bg-card px-6 shadow-sm transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Nabízené služby</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              <p className="mb-4 text-sm text-muted-foreground">
                Služby, které vaše firma nabízí. Sniper je používá při generování obchodních e-mailů.
              </p>
              {isWorkspaceReady ? (
                <OfferedServicesManager initialServices={workspace?.offeredServices ?? []} />
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
            className="rounded-2xl border border-border/60 bg-card px-6 shadow-sm transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Coins className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Spotřeba a Kredity</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-6 pt-2">
              <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background p-5">
                {isWorkspaceReady && creditsLeft !== null && creditsTotal !== undefined ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">Zbývající kredity</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">Váš měsíční limit se obnoví za 12 dní.</p>
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

          {/* PŮVODNÍ SEKCE: INTEGRACE */}
          <AccordionItem
            value="integrations"
            className="rounded-2xl border border-border/60 bg-card px-6 shadow-sm transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Integrace a Webhooky</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pt-2">
              <IntegrationsPanel />
            </AccordionContent>
          </AccordionItem>

          {/* PŮVODNÍ SEKCE: AI CHOVÁNÍ */}
          <AccordionItem
            value="ai"
            className="rounded-2xl border border-border/60 bg-card px-6 shadow-sm transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Bot className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Chování AI a Šablony</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 pb-6 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Podpis na konci zprávy (Sniper)
                </Label>
                <textarea
                  className="min-h-[100px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  ZAKÁZANÁ SLOVA A FRÁZE (BLACKLIST)
                </Label>
                <textarea
                  rows={2}
                  className="w-full resize-y rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500"
                  placeholder="např. synergie, namontujeme, -"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Tato slova AI nikdy nepoužije. Oddělujte čárkou (např. synergie, inovativní, zaručeně).
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Základní instrukce (System Prompt)
                </Label>
                <textarea
                  className="min-h-[150px] w-full resize-y rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500"
                  defaultValue="Jsi špičkový obchodník. Tvojí úlohou je psát stručné, úderné a vysoce konverzní texty. Nepoužívej zbytečné fráze. Zaměř se na hodnotu pro klienta."
                />
                <p className="text-[10px] text-muted-foreground">Tato instrukce ovlivňuje, jakým stylem Sniper generuje e-maily.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* PŮVODNÍ SEKCE: TÝM */}
          <AccordionItem
            value="team"
            className="rounded-2xl border border-border/60 bg-card px-6 shadow-sm transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
          >
            <AccordionTrigger className="py-6 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Tým a přístupy</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-6 pt-2">
              <TeamAccessPanel />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end pt-2">
          <SettingsSaveButton />
        </div>
      </div>
    </div>
  );
}