"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, Zap } from "lucide-react";
import { startTrialCheckout } from "@/app/actions/billing";
import { useSlidingThumb } from "@/components/sklyvo/use-sliding-thumb";
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
    features: [
      "1 aktivní účet",
      "1 mailový identifikátor",
      "Základní šablony",
      "Email support (48 h)",
    ],
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
    features: [
      "3 mailové identifikátory",
      "AI personalizace Sniperu",
      "A/B testování",
      "Pokročilé šablony",
      "Chat support (24 h)",
    ],
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
    features: [
      "Neomezené identifikátory",
      "AI + vlastní prompty",
      "Priorita ve frontě",
      "Dedicated manager",
      "API přístup",
    ],
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
    features: [
      "Až 3 uživatelské účty",
      "Sdílený pool akcí",
      "Společná databáze",
      "Admin dashboard",
      "White label (logo)",
    ],
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
    features: [
      "Až 5 uživatelských účtů",
      "Role a práva",
      "AI pro celý tým",
      "Týmové šablony a segmenty",
      "Priority support",
    ],
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
    features: [
      "Až 10 uživatelských účtů",
      "Custom onboarding",
      "API a webhooky",
      "Dedicated account manager",
      "SLA 99,9 %",
    ],
    stripePriceIdMonthly: "price_1TTREvLylMkTRLPveDQIsP3y",
    stripePriceIdYearly: "price_1TTREvLylMkTRLPvGRhDYJna",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [accountType, setAccountType] = useState<AccountType>("single");
  const plans = useMemo(
    () => (accountType === "single" ? singlePlans : agencyPlans),
    [accountType],
  );
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const accountTypeIndex = accountType === "single" ? 0 : 1;
  const { trackRef: accountTabsRef, thumbStyle: accountThumbStyle } =
    useSlidingThumb(accountTypeIndex, [accountType]);

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
    <div className="sk-pricing flex w-full flex-col items-center justify-start py-4">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="sk-type-h1">Vyberte tarif podle typu účtu</h1>
        <p className="sk-type-body mx-auto max-w-xl">
          Aktivace vyžaduje platební kartu. První platba proběhne až po 3 dnech
          trialu.
        </p>
      </div>

      <div className="sk-pricing__cycle mb-5">
        <span
          className={cn(
            "text-sm font-semibold",
            billingCycle === "monthly"
              ? "text-[color:var(--sk-ink)]"
              : "text-muted-foreground",
          )}
        >
          Měsíčně
        </span>
        <Switch
          checked={billingCycle === "yearly"}
          onCheckedChange={(checked) =>
            setBillingCycle(checked ? "yearly" : "monthly")
          }
          aria-label="Přepnout fakturaci"
        />
        <span
          className={cn(
            "text-sm font-semibold",
            billingCycle === "yearly"
              ? "text-[color:var(--sk-ink)]"
              : "text-muted-foreground",
          )}
        >
          Ročně (Sleva 20%)
        </span>
      </div>

      <div
        ref={accountTabsRef as React.RefObject<HTMLDivElement>}
        className="sk-view-toggle sk-pricing__tabs mb-4"
      >
        <span
          className="sk-view-toggle__thumb"
          style={accountThumbStyle}
          aria-hidden
        />
        <button
          type="button"
          data-slide-item
          onClick={() => setAccountType("single")}
          className={cn(
            "sk-view-toggle__item sk-pricing__tab",
            accountType === "single" && "sk-view-toggle__item--active",
          )}
        >
          Single account
        </button>
        <button
          type="button"
          data-slide-item
          onClick={() => setAccountType("agency")}
          className={cn(
            "sk-view-toggle__item sk-pricing__tab",
            accountType === "agency" && "sk-view-toggle__item--active",
          )}
        >
          Agency account
        </button>
      </div>

      <p className="mb-6 w-full text-center text-sm text-muted-foreground">
        {accountType === "single"
          ? "1 uživatel, 1 aktivní účet, vlastní databáze kontaktů"
          : "Tým pod jednou značkou, sdílený pool akcí, až 10 účtů"}
      </p>

      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3 md:items-stretch">
        {plans.map((plan) => {
          const currentPriceId =
            billingCycle === "monthly"
              ? plan.stripePriceIdMonthly
              : plan.stripePriceIdYearly;
          return (
            <div
              key={plan.tier}
              className={cn(
                "sk-pricing__card",
                plan.isPopular && "sk-pricing__card--popular",
              )}
            >
              {plan.isPopular && (
                <div className="sk-pricing__badge">
                  <Zap className="h-3 w-3" />
                  Nejčastější volba
                </div>
              )}

              <h3 className="sk-type-h3 mb-1 text-[color:var(--sk-ink)]">
                {plan.name}
              </h3>
              <p className="mb-4 min-h-[36px] text-xs text-muted-foreground">
                {plan.subtitle}
              </p>

              <div className="mb-4">
                <span className="sk-type-h1">
                  {billingCycle === "monthly"
                    ? plan.priceMonthly
                    : plan.priceYearly}
                </span>
              </div>

              <div className="sk-pricing__credits mb-5">
                <span className="text-sm font-extrabold tracking-tight text-[color:var(--sk-ink)]">
                  {plan.credits}
                </span>
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start text-xs font-medium text-[color:var(--sk-ink)]"
                  >
                    <Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                onClick={() => void handleActivate(plan.tier, currentPriceId)}
                disabled={loadingTier === plan.tier}
                variant="primary"
                className="sk-pricing__cta mt-auto h-11 w-full"
              >
                {loadingTier === plan.tier ? "Aktivuji…" : "Aktivovat"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
