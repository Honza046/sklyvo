"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

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

export function PlanFeatureGate({
  locked,
  tool,
  children,
}: {
  locked: boolean;
  tool: PremiumTool;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  if (!locked) {
    return <>{children}</>;
  }

  const title = t(`planGate.${tool}.title`);
  const description = t(`planGate.${tool}.description`);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="pointer-events-none min-h-0 flex-1 select-none opacity-40 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <div className="sk-plan-gate max-w-md text-center">
          <div className="sk-plan-gate__icon mx-auto mb-3">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-[color:var(--sk-ink)] sm:text-base">
            {title}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
            {description}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-center">
            <Button asChild className="h-9 rounded-xl text-sm sm:h-10">
              <Link href="/pricing">{t("planGate.choosePlan")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
