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
    stripePriceIdMonthly: "price_1TTR7ULylMkTRLPv0aKsMf6m",
    stripePriceIdYearly: "price_1TTR7ULylMkTRLPveZMSNDo0",
  },
  {
    key: "PLUS",
    tier: "PRO",
    priceMonthlyCzk: 2690,
    priceYearlyMonthlyCzk: 2240,
    highlighted: true,
    stripePriceIdMonthly: "price_1TTR9LLylMkTRLPvOy6G6eFc",
    stripePriceIdYearly: "price_1TTR9LLylMkTRLPvekSzl2hx",
  },
  {
    key: "PRO",
    tier: "PREMIUM",
    priceMonthlyCzk: 6390,
    priceYearlyMonthlyCzk: 5320,
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
    stripePriceIdMonthly: string;
    stripePriceIdYearly: string;
  }
> = {
  small: {
    tier: "AGENCY_STARTER",
    priceMonthlyCzk: 1990,
    priceYearlyMonthlyCzk: 1660,
    stripePriceIdMonthly: "price_1TTRAxLylMkTRLPvkFnoL2AA",
    stripePriceIdYearly: "price_1TTRAxLylMkTRLPvJqogNxh6",
  },
  big: {
    tier: "AGENCY_GROWTH",
    priceMonthlyCzk: 1690,
    priceYearlyMonthlyCzk: 1410,
    stripePriceIdMonthly: "price_1TTREOLylMkTRLPvDcOljc76",
    stripePriceIdYearly: "price_1TTREOLylMkTRLPvrAJSv6sN",
  },
};

export function formatCzk(amount: number): string {
  const formatted = new Intl.NumberFormat("cs-CZ", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} Kč`;
}
