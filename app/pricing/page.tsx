"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { startTrialCheckout } from "@/app/actions/billing";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";
type AccountType = "single" | "agency";

type Plan = {
  tier: string;
  name: string;
  subtitle: string;
  priceMonthly: string;
  priceYearly: string;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  credits: string;
  features: string[];
  isPopular?: boolean;
};

const singlePlans: Plan[] = [
  {
    tier: "STARTER",
    name: "Starter",
    subtitle: "Pro jednotlivce, kdo začíná",
    priceMonthly: "990 Kč / měs",
    priceYearly: "9 490 Kč / rok",
    credits: "1 500 kreditů / měs",
    features: ["1 aktivní účet", "1 mailový identifikátor", "Základní šablony", "Email support (48 h)"],
    stripePriceIdMonthly: "price_1TTR7ULylMkTRLPv0aKsMf6m",
    stripePriceIdYearly: "price_1TTR7ULylMkTRLPveZMSNDo0",
  },
  {
    tier: "PRO",
    name: "Pro",
    subtitle: "Pro aktivní freelancery",
    priceMonthly: "2 490 Kč / měs",
    priceYearly: "23 900 Kč / rok",
    credits: "4 500 kreditů / měs",
    features: ["3 mailové identifikátory", "AI personalizace Sniperu", "A/B testování", "Pokročilé šablony", "Chat support (24 h)"],
    isPopular: true,
    stripePriceIdMonthly: "price_1TTR9LLylMkTRLPvOy6G6eFc",
    stripePriceIdYearly: "price_1TTR9LLylMkTRLPvekSzl2hx",
  },
  {
    tier: "PREMIUM",
    name: "Premium",
    subtitle: "Power user a velké objemy",
    priceMonthly: "5 990 Kč / měs",
    priceYearly: "57 500 Kč / rok",
    credits: "12 000 kreditů / měs",
    features: ["Neomezené identifikátory", "AI + vlastní prompty", "Priorita ve frontě", "Dedicated manager", "API přístup"],
    stripePriceIdMonthly: "price_1TTRAJLylMkTRLPvZ4g1enS7",
    stripePriceIdYearly: "price_1TTRAJLylMkTRLPvGnnFjFTx",
  },
];

const agencyPlans: Plan[] = [
  {
    tier: "AGENCY_STARTER",
    name: "Agency Starter",
    subtitle: "Až 3 účty • sdílený pool",
    priceMonthly: "2 990 Kč / měs",
    priceYearly: "28 700 Kč / rok",
    credits: "6 000 kreditů / měs",
    features: ["Až 3 uživatelské účty", "Sdílený pool akcí", "Společná databáze", "Admin dashboard", "White label (logo)"],
    stripePriceIdMonthly: "price_1TTRAxLylMkTRLPvkFnoL2AA",
    stripePriceIdYearly: "price_1TTRAxLylMkTRLPvJqogNxh6",
  },
  {
    tier: "AGENCY_GROWTH",
    name: "Agency Growth",
    subtitle: "Až 5 účtů • sdílený pool",
    priceMonthly: "6 990 Kč / měs",
    priceYearly: "67 100 Kč / rok",
    credits: "15 000 kreditů / měs",
    features: ["Až 5 uživatelských účtů", "Role a práva", "AI pro celý tým", "Týmové šablony a segmenty", "Priority support"],
    isPopular: true,
    stripePriceIdMonthly: "price_1TTREOLylMkTRLPvDcOljc76",
    stripePriceIdYearly: "price_1TTREOLylMkTRLPvrAJSv6sN",
  },
  {
    tier: "AGENCY_SCALE",
    name: "Agency Scale",
    subtitle: "Až 10 účtů • sdílený pool",
    priceMonthly: "14 990 Kč / měs",
    priceYearly: "143 900 Kč / rok",
    credits: "36 000 kreditů / měs",
    features: ["Až 10 uživatelských účtů", "Custom onboarding", "API a webhooky", "Dedicated account manager", "SLA 99,9 %"],
    stripePriceIdMonthly: "price_1TTREvLylMkTRLPveDQIsP3y",
    stripePriceIdYearly: "price_1TTREvLylMkTRLPvGRhDYJna",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [accountType, setAccountType] = useState<AccountType>("single");
  const plans = useMemo(() => (accountType === "single" ? singlePlans : agencyPlans), [accountType]);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleActivate = async (planTier: string, priceId: string) => {
    setLoadingTier(planTier);
    const result = await startTrialCheckout(planTier, priceId);
    setLoadingTier(null);

    if ("error" in result && result.error) {
      alert(result.error);
      return;
    }

    if ("url" in result && result.url) {
      window.location.href = result.url;
    }
  };

  return (
      <div className="flex w-full flex-col items-center justify-start py-4">
        
        <div className="mb-6 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Vyberte tarif podle typu účtu
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Aktivace vyžaduje platební kartu. První platba proběhne až po 3 dnech trialu.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
          <span className={cn("text-sm font-semibold", billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground")}>
            Měsíčně
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle((prev) => (prev === "monthly" ? "yearly" : "monthly"))}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors"
            aria-label="Přepnout fakturaci"
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                billingCycle === "yearly" ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
          <span className={cn("text-sm font-semibold", billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground")}>
            Ročně (Sleva 20%)
          </span>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setAccountType("single")}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              accountType === "single"
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            SINGLE ACCOUNT
          </button>
          <button
            type="button"
            onClick={() => setAccountType("agency")}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              accountType === "agency"
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            AGENCY ACCOUNT
          </button>
        </div>

        <div className="mb-6 max-w-5xl px-4 text-center text-sm text-muted-foreground">
          {accountType === "single"
            ? "1 uživatel, 1 aktivní účet, vlastní databáze kontaktů"
            : "Tým pod jednou značkou, sdílený pool akcí, až 10 účtů"}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
          {plans.map((plan) => {
            const currentPriceId =
              billingCycle === "monthly" ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
            return (
            <div
              key={plan.tier}
              className={cn(
                "rounded-3xl p-6 flex flex-col relative transition-all duration-300",
                plan.isPopular
                  ? "border-2 border-blue-600 bg-card shadow-xl scale-105 z-10"
                  : "border border-border/60 bg-card shadow-sm hover:border-blue-300 dark:hover:border-blue-800",
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center shadow-md">
                  <Zap className="mr-1 h-3 w-3" /> Nejčastější volba
                </div>
              )}

              <h3 className={cn("text-lg font-bold mb-1", plan.isPopular ? "text-blue-600 dark:text-blue-400" : "")}>
                {plan.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-4 min-h-[36px]">{plan.subtitle}</p>

              <div className="mb-4">
                <span className="text-3xl font-extrabold">
                  {billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly}
                </span>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-3 mb-5 border border-blue-100 dark:border-blue-800/50 text-center">
                <span className="text-sm font-extrabold tracking-tight text-foreground">{plan.credits}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-xs font-medium">
                    <Check className={cn("mr-2 h-4 w-4", plan.isPopular ? "text-blue-600 dark:text-blue-400" : "text-emerald-500")} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                  type="button"
                  onClick={() => void handleActivate(plan.tier, currentPriceId)}
                  disabled={loadingTier === plan.tier}
                  variant={plan.isPopular ? "default" : "outline"}
                  className={cn(
                    "w-full h-10 rounded-xl text-sm font-bold shadow-sm transition-all",
                    plan.isPopular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "border-border/60 hover:bg-muted",
                  )}
                >
                  {loadingTier === plan.tier ? "Aktivuji..." : "Aktivovat"}
                </Button>
            </div>
            );
          })}
        </div>
      </div>
  );
}