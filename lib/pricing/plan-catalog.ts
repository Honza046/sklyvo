export type BillingCycle = "monthly" | "yearly";
export type AccountTab = "single" | "team";
export type AgencySize = "small" | "big";

export type PlanTierKey =
  | "STARTER"
  | "PRO"
  | "PREMIUM"
  | "AGENCY_STARTER"
  | "AGENCY_GROWTH";

export type SinglePlanKey = "BASIC" | "PLUS" | "PRO";

export type SinglePlanDef = {
  key: SinglePlanKey;
  tier: PlanTierKey;
  priceMonthlyCzk: number;
  priceYearlyMonthlyCzk: number;
  /** Display prices for English UI (nice round USD). */
  priceMonthlyUsd: number;
  priceYearlyMonthlyUsd: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  highlighted?: boolean;
};

export const SINGLE_PLAN_CATALOG: SinglePlanDef[] = [
  {
    key: "BASIC",
    tier: "STARTER",
    priceMonthlyCzk: 1190,
    priceYearlyMonthlyCzk: 990,
    priceMonthlyUsd: 49,
    priceYearlyMonthlyUsd: 39,
    stripePriceIdMonthly: "price_1TTR7ULylMkTRLPv0aKsMf6m",
    stripePriceIdYearly: "price_1TTR7ULylMkTRLPveZMSNDo0",
  },
  {
    key: "PLUS",
    tier: "PRO",
    priceMonthlyCzk: 2690,
    priceYearlyMonthlyCzk: 2240,
    priceMonthlyUsd: 99,
    priceYearlyMonthlyUsd: 79,
    highlighted: true,
    stripePriceIdMonthly: "price_1TTR9LLylMkTRLPvOy6G6eFc",
    stripePriceIdYearly: "price_1TTR9LLylMkTRLPvekSzl2hx",
  },
  {
    key: "PRO",
    tier: "PREMIUM",
    priceMonthlyCzk: 6390,
    priceYearlyMonthlyCzk: 5320,
    priceMonthlyUsd: 249,
    priceYearlyMonthlyUsd: 199,
    stripePriceIdMonthly: "price_1TTRAJLylMkTRLPvZ4g1enS7",
    stripePriceIdYearly: "price_1TTRAJLylMkTRLPvGnnFjFTx",
  },
];

export const AGENCY_SIZE_CATALOG: Record<
  AgencySize,
  {
    tier: PlanTierKey;
    priceMonthlyCzk: number;
    priceYearlyMonthlyCzk: number;
    priceMonthlyUsd: number;
    priceYearlyMonthlyUsd: number;
    stripePriceIdMonthly: string;
    stripePriceIdYearly: string;
  }
> = {
  small: {
    tier: "AGENCY_STARTER",
    priceMonthlyCzk: 1990,
    priceYearlyMonthlyCzk: 1660,
    priceMonthlyUsd: 79,
    priceYearlyMonthlyUsd: 65,
    stripePriceIdMonthly: "price_1TTRAxLylMkTRLPvkFnoL2AA",
    stripePriceIdYearly: "price_1TTRAxLylMkTRLPvJqogNxh6",
  },
  big: {
    tier: "AGENCY_GROWTH",
    priceMonthlyCzk: 1690,
    priceYearlyMonthlyCzk: 1410,
    priceMonthlyUsd: 69,
    priceYearlyMonthlyUsd: 55,
    stripePriceIdMonthly: "price_1TTREOLylMkTRLPvDcOljc76",
    stripePriceIdYearly: "price_1TTREOLylMkTRLPvrAJSv6sN",
  },
};

export type PricingCurrency = "CZK" | "USD";

/** English UI shows USD; Czech (and others for now) keep CZK. */
export function pricingCurrencyForLanguage(
  language: string,
): PricingCurrency {
  return language === "en" ? "USD" : "CZK";
}

export function formatCzk(amount: number, locale = "cs-CZ"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsd(amount: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPlanPrice(
  amount: number,
  currency: PricingCurrency,
  locale: string,
): string {
  return currency === "USD"
    ? formatUsd(amount, locale)
    : formatCzk(amount, locale);
}

export function planDisplayAmounts(
  plan: {
    priceMonthlyCzk: number;
    priceYearlyMonthlyCzk: number;
    priceMonthlyUsd: number;
    priceYearlyMonthlyUsd: number;
  },
  currency: PricingCurrency,
): { monthly: number; yearlyMonthly: number } {
  if (currency === "USD") {
    return {
      monthly: plan.priceMonthlyUsd,
      yearlyMonthly: plan.priceYearlyMonthlyUsd,
    };
  }
  return {
    monthly: plan.priceMonthlyCzk,
    yearlyMonthly: plan.priceYearlyMonthlyCzk,
  };
}
