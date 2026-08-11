"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Check, Zap } from "lucide-react";
import { startTrialCheckout } from "@/app/actions/billing";
import { useSlidingThumb } from "@/components/sklyvo/use-sliding-thumb";
import { useLanguage } from "@/context/LanguageContext";
import { messages } from "@/lib/i18n/messages";
import { DATE_LOCALE, type Language } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";
type AccountType = "single" | "agency";

type PlanTierKey =
  | "STARTER"
  | "PRO"
  | "PREMIUM"
  | "AGENCY_STARTER"
  | "AGENCY_GROWTH"
  | "AGENCY_SCALE";

type PlanDef = {
  tier: PlanTierKey;
  priceMonthlyCzk: number;
  priceYearlyCzk: number;
  /** EN UI list price (Stripe checkout still uses CZK price IDs). */
  priceMonthlyUsd?: number;
  priceYearlyUsd?: number;
  credits: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  isPopular?: boolean;
};

/** Fallback FX when a plan has no explicit USD list price. */
const CZK_PER_USD = 23;

const singlePlans: PlanDef[] = [
  {
    tier: "STARTER",
    priceMonthlyCzk: 990,
    priceYearlyCzk: 9490,
    priceMonthlyUsd: 49,
    priceYearlyUsd: 469,
    credits: 1000,
    stripePriceIdMonthly: "price_1TTR7ULylMkTRLPv0aKsMf6m",
    stripePriceIdYearly: "price_1TTR7ULylMkTRLPveZMSNDo0",
  },
  {
    tier: "PRO",
    priceMonthlyCzk: 2490,
    priceYearlyCzk: 23900,
    priceMonthlyUsd: 109,
    priceYearlyUsd: 1049,
    credits: 2500,
    isPopular: true,
    stripePriceIdMonthly: "price_1TTR9LLylMkTRLPvOy6G6eFc",
    stripePriceIdYearly: "price_1TTR9LLylMkTRLPvekSzl2hx",
  },
  {
    tier: "PREMIUM",
    priceMonthlyCzk: 5990,
    priceYearlyCzk: 57500,
    priceMonthlyUsd: 259,
    priceYearlyUsd: 2489,
    credits: 6000,
    stripePriceIdMonthly: "price_1TTRAJLylMkTRLPvZ4g1enS7",
    stripePriceIdYearly: "price_1TTRAJLylMkTRLPvGnnFjFTx",
  },
];

const agencyPlans: PlanDef[] = [
  {
    tier: "AGENCY_STARTER",
    priceMonthlyCzk: 2990,
    priceYearlyCzk: 28700,
    priceMonthlyUsd: 129,
    priceYearlyUsd: 1239,
    credits: 3000,
    stripePriceIdMonthly: "price_1TTRAxLylMkTRLPvkFnoL2AA",
    stripePriceIdYearly: "price_1TTRAxLylMkTRLPvJqogNxh6",
  },
  {
    tier: "AGENCY_GROWTH",
    priceMonthlyCzk: 6990,
    priceYearlyCzk: 67100,
    priceMonthlyUsd: 299,
    priceYearlyUsd: 2869,
    credits: 7000,
    isPopular: true,
    stripePriceIdMonthly: "price_1TTREOLylMkTRLPvDcOljc76",
    stripePriceIdYearly: "price_1TTREOLylMkTRLPvrAJSv6sN",
  },
  {
    tier: "AGENCY_SCALE",
    priceMonthlyCzk: 14990,
    priceYearlyCzk: 143900,
    priceMonthlyUsd: 649,
    priceYearlyUsd: 6229,
    credits: 15000,
    stripePriceIdMonthly: "price_1TTREvLylMkTRLPveDQIsP3y",
    stripePriceIdYearly: "price_1TTREvLylMkTRLPvGRhDYJna",
  },
];

function usesUsdDisplay(language: Language): boolean {
  return language === "en";
}

function formatPlanPrice(
  plan: PlanDef,
  cycle: BillingCycle,
  language: Language,
): string {
  if (usesUsdDisplay(language)) {
    const usd =
      cycle === "monthly"
        ? (plan.priceMonthlyUsd ??
          Math.round(plan.priceMonthlyCzk / CZK_PER_USD))
        : (plan.priceYearlyUsd ??
          Math.round(plan.priceYearlyCzk / CZK_PER_USD));
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(usd);
  }

  const amountCzk =
    cycle === "monthly" ? plan.priceMonthlyCzk : plan.priceYearlyCzk;
  return new Intl.NumberFormat(DATE_LOCALE[language] || "cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amountCzk);
}

function formatCreditsCount(count: number, language: Language): string {
  return new Intl.NumberFormat(
    usesUsdDisplay(language) ? "en-US" : DATE_LOCALE[language] || "cs-CZ",
  ).format(count);
}

export default function PricingPage() {
  const { t, language } = useLanguage();
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
        <h1 className="sk-type-h1">{t("pricing.title")}</h1>
        <p className="sk-type-body mx-auto max-w-xl">{t("pricing.subtitle")}</p>
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
          {t("pricing.monthly")}
        </span>
        <Switch
          checked={billingCycle === "yearly"}
          onCheckedChange={(checked) =>
            setBillingCycle(checked ? "yearly" : "monthly")
          }
          aria-label={t("pricing.billingAria")}
        />
        <span
          className={cn(
            "text-sm font-semibold",
            billingCycle === "yearly"
              ? "text-[color:var(--sk-ink)]"
              : "text-muted-foreground",
          )}
        >
          {t("pricing.yearly")}
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
          {t("pricing.singleAccount")}
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
          {t("pricing.agencyAccount")}
        </button>
      </div>

      <p className="mb-6 w-full text-center text-sm text-muted-foreground">
        {accountType === "single"
          ? t("pricing.singleBlurb")
          : t("pricing.agencyBlurb")}
      </p>

      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3 md:items-stretch">
        {plans.map((plan) => {
          const currentPriceId =
            billingCycle === "monthly"
              ? plan.stripePriceIdMonthly
              : plan.stripePriceIdYearly;
          const planCopy = messages[language].pricing.plans[plan.tier];
          const priceLabel = t(
            billingCycle === "monthly"
              ? "pricing.perMonth"
              : "pricing.perYear",
            { price: formatPlanPrice(plan, billingCycle, language) },
          );

          return (
            <div
              key={plan.tier}
              className={cn(
                "sk-pricing__card",
                plan.isPopular && "sk-pricing__card--popular",
              )}
            >
              {plan.isPopular ? (
                <div className="sk-pricing__badge">
                  <Zap className="h-3 w-3" />
                  {t("pricing.popular")}
                </div>
              ) : null}

              <h3 className="sk-type-h3 mb-1 text-[color:var(--sk-ink)]">
                {planCopy.name}
              </h3>
              <p className="mb-4 min-h-[36px] text-xs text-muted-foreground">
                {planCopy.subtitle}
              </p>

              <div className="mb-4">
                <span className="sk-type-h1">{priceLabel}</span>
              </div>

              <div className="sk-pricing__credits mb-5">
                <span className="text-sm font-extrabold tracking-tight text-[color:var(--sk-ink)]">
                  {t("pricing.creditsPerMonth", {
                    count: formatCreditsCount(plan.credits, language),
                  })}
                </span>
              </div>

              <ul className="mb-6 flex-1 space-y-2.5">
                {planCopy.features.map((feature) => (
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
                {loadingTier === plan.tier
                  ? t("pricing.activating")
                  : t("pricing.activate")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
