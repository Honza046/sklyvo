import { PlanFeatureGateClient } from "@/components/plan-feature-gate-client";
import { requireSessionUserId } from "@/lib/require-session";

export default async function UlozisteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionUserId();
  return (
    <PlanFeatureGateClient tool="storage">{children}</PlanFeatureGateClient>
  );
}
