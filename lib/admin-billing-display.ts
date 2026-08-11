/** Shared billing labels for Sklyvo Admin tables. */

export function membershipLabel(planTier: string | null | undefined): string {
  const tier = (planTier ?? "NONE").trim().toUpperCase();
  if (!tier || tier === "NONE" || tier === "FREE") return "Bez členství";
  if (tier === "STARTER") return "Starter";
  if (tier === "PRO") return "Pro";
  if (tier === "PREMIUM") return "Premium";
  if (tier === "AGENCY") return "Agency";
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export function paymentBadge(status: string | null | undefined): {
  label: string;
  tone: "ok" | "bad" | "trial";
} {
  const s = (status ?? "FREE").trim().toUpperCase();
  if (s === "ACTIVE" || s === "PAID") {
    return { label: "Zaplaceno", tone: "ok" };
  }
  if (s === "TRIAL" || s === "TRIALING") {
    return { label: "Trial", tone: "trial" };
  }
  return { label: "Nezaplaceno", tone: "bad" };
}

export function formatAdminDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}
