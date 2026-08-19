export type PremiumTool = "autopilot" | "storage" | "generator";

/** Free 10-kreditový účet bez aktivního trialu / placeného tarifu. */
export function isPremiumToolsLocked(input: {
  planTier?: string | null;
  subscriptionStatus?: string | null;
  isTrial?: boolean;
  trialRemainingDays?: number;
}): boolean {
  const planTier = (input.planTier ?? "NONE").toUpperCase();
  const status = (input.subscriptionStatus ?? "FREE").toUpperCase();
  const hasPaidPlanTier = planTier !== "NONE" && planTier !== "FREE";
  const hasFullCreditAllowance =
    status === "ACTIVE" ||
    hasPaidPlanTier ||
    (Boolean(input.isTrial) && (input.trialRemainingDays ?? 0) > 0);
  return !hasFullCreditAllowance;
}
