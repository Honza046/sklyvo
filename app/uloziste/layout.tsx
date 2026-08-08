import { PlanFeatureGateClient } from "@/components/plan-feature-gate-client";

export default function UlozisteLayout({ children }: { children: React.ReactNode }) {
  return <PlanFeatureGateClient tool="storage">{children}</PlanFeatureGateClient>;
}
