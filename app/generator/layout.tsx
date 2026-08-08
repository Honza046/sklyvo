import { PlanFeatureGateClient } from "@/components/plan-feature-gate-client";

export default function GeneratorLayout({ children }: { children: React.ReactNode }) {
  return <PlanFeatureGateClient tool="generator">{children}</PlanFeatureGateClient>;
}
