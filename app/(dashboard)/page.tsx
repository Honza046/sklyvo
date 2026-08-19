import type { Metadata } from "next";
import { Suspense } from "react";
import { getSessionUser } from "@/app/actions/auth";
import { DashboardBody } from "@/app/dashboard-body";
import { DashboardBodySkeleton } from "@/components/dashboard-loading";
import { MetricsStripSkeleton } from "@/components/dashboard/animated-metric-value";
import { DashboardLoadingSubtitle } from "@/components/dashboard/dashboard-loading-client";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { DashboardOnboardingGate } from "@/components/dashboard-onboarding-gate";
import { LandingPage } from "@/components/sklyvo/landing-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return {
      title: { absolute: "Sklyvo — outreach na autopilota" },
      description: "Sklyvo finds the clients you need and reaches them for you.",
    };
  }
  return {};
}

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return <LandingPage />;
  }
  const firstName = session.user?.firstName ?? "Uživatel";
  const needsOnboarding =
    !!session.workspace && !(session.workspace.companyName ?? "").trim();

  return (
    <DashboardOnboardingGate needsOnboarding={needsOnboarding}>
      <DashboardFrame firstName={firstName}>
        <Suspense
          fallback={
            <div className="sk-dashboard-scroll scrollbar-hide flex min-h-0 flex-1 flex-col gap-2 md:gap-3">
              <DashboardLoadingSubtitle />
              <MetricsStripSkeleton />
              <DashboardBodySkeleton />
            </div>
          }
        >
          <DashboardBody />
        </Suspense>
      </DashboardFrame>
    </DashboardOnboardingGate>
  );
}
