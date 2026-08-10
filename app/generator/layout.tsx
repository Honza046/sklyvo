import { PlanFeatureGateClient } from "@/components/plan-feature-gate-client";
import { requireSessionUserId } from "@/lib/require-session";

export default async function GeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionUserId();
  return (
    <PlanFeatureGateClient tool="generator">{children}</PlanFeatureGateClient>
  );
}
