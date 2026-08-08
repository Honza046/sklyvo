import Stripe from "stripe";

const API_VERSION = "2026-04-22.dahlia" as const;

let stripeSingleton: Stripe | null = null;

/** Lazily construct Stripe — avoids build-time crash when STRIPE_SECRET_KEY is unset. */
export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  stripeSingleton = new Stripe(key, { apiVersion: API_VERSION });
  return stripeSingleton;
}

/**
 * Drop-in for existing `stripe.*` call sites. Touches the real client only on use.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, _receiver) {
    const client = getStripe();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
