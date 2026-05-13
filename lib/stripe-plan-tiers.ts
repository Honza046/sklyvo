import type Stripe from "stripe";

/** Všechny price ID z app/pricing/page.tsx (single + agency). */
export const STRIPE_PRICE_ID_TO_TIER: Record<string, string> = {
  price_1TTR7ULylMkTRLPv0aKsMf6m: "STARTER",
  price_1TTR7ULylMkTRLPveZMSNDo0: "STARTER",
  price_1TTR9LLylMkTRLPvOy6G6eFc: "PRO",
  price_1TTR9LLylMkTRLPvekSzl2hx: "PRO",
  price_1TTRAJLylMkTRLPvZ4g1enS7: "PREMIUM",
  price_1TTRAJLylMkTRLPvGnnFjFTx: "PREMIUM",
  price_1TTRAxLylMkTRLPvkFnoL2AA: "AGENCY_STARTER",
  price_1TTRAxLylMkTRLPvJqogNxh6: "AGENCY_STARTER",
  price_1TTREOLylMkTRLPvDcOljc76: "AGENCY_GROWTH",
  price_1TTREOLylMkTRLPvrAJSv6sN: "AGENCY_GROWTH",
  price_1TTREvLylMkTRLPveDQIsP3y: "AGENCY_SCALE",
  price_1TTREvLylMkTRLPvGRhDYJna: "AGENCY_SCALE",
};

/** Kredity podle tarifu (soulad s marketingem na pricing). */
export function creditsForPlanTier(tier: string): number {
  const key = tier.toUpperCase();
  const map: Record<string, number> = {
    STARTER: 1500,
    PRO: 4500,
    PREMIUM: 12000,
    AGENCY_STARTER: 6000,
    AGENCY_GROWTH: 15000,
    AGENCY_SCALE: 36000,
  };
  return map[key] ?? 10;
}

export function resolvePlanTierFromSubscription(sub: Stripe.Subscription): string | null {
  const meta = sub.metadata?.planTier?.trim();
  if (meta) return meta.toUpperCase();

  for (const item of sub.items?.data ?? []) {
    const pid = item.price?.id;
    if (pid && STRIPE_PRICE_ID_TO_TIER[pid]) {
      return STRIPE_PRICE_ID_TO_TIER[pid];
    }
  }
  return null;
}

/** Price ID → tier podle `STRIPE_PRICE_ID_TO_TIER` (Checkout / faktura). */
export function resolvePlanTierFromPriceId(priceId: string | null | undefined): string | null {
  if (!priceId?.trim()) return null;
  return STRIPE_PRICE_ID_TO_TIER[priceId] ?? null;
}

/** První známý tier z pole Stripe Price ID (pořadí jako vstup). */
export function resolvePlanTierFromStripePriceIds(priceIds: string[]): string | null {
  for (const id of priceIds) {
    const t = resolvePlanTierFromPriceId(id);
    if (t) return t;
  }
  return null;
}

function priceIdFromInvoiceLine(line: Stripe.InvoiceLineItem): string | null {
  const pd = line.pricing?.price_details?.price;
  if (pd) {
    return typeof pd === "string" ? pd : pd.id;
  }
  const legacy = (line as unknown as { price?: string | { id: string } }).price;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  return null;
}

/** Tarif z řádků faktury (nové API: `pricing.price_details.price`, legacy: `price`). */
export function resolvePlanTierFromInvoiceLines(
  lines: Stripe.InvoiceLineItem[] | null | undefined,
): string | null {
  if (!lines?.length) return null;
  for (const line of lines) {
    const pid = priceIdFromInvoiceLine(line);
    const tier = resolvePlanTierFromPriceId(pid);
    if (tier) return tier;
  }
  return null;
}
