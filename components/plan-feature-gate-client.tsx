"use client";

import { useEffect, useState } from "react";
import { getWorkspaceAccessState } from "@/app/actions/auth";
import {
  PlanFeatureGate,
  isPremiumToolsLocked,
  type PremiumTool,
} from "@/components/plan-feature-gate";

/**
 * Client wrapper that loads workspace access and soft-locks premium tools
 * for free (10 credit) accounts.
 */
export function PlanFeatureGateClient({
  tool,
  children,
}: {
  tool: PremiumTool;
  children: React.ReactNode;
}) {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await getWorkspaceAccessState();
        if (cancelled) return;
        setLocked(
          isPremiumToolsLocked({
            planTier: state.workspace?.planTier,
            subscriptionStatus: state.workspace?.subscriptionStatus,
            isTrial: state.isTrial,
            trialRemainingDays: state.trialRemainingDays,
          }),
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PlanFeatureGate locked={locked} tool={tool}>
        {children}
      </PlanFeatureGate>
    </div>
  );
}
