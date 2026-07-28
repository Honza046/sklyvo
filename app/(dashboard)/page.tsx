import { Suspense } from "react";
import { getSessionUser } from "@/app/actions/auth";
import { DashboardBody } from "@/app/dashboard-body";
import { DashboardBodySkeleton } from "@/components/dashboard-loading";
import {
  DashboardLoadingSubtitle,
  DashboardSubtitle,
} from "@/components/dashboard/dashboard-loading-client";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardOnboardingGate } from "@/components/dashboard-onboarding-gate";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionUser();
  const firstName = session.user?.firstName ?? "Uživatel";
  const emailsSent = session.workspace?.emailsSent ?? 0;
  const needsOnboarding =
    !!session.workspace && !(session.workspace.companyName ?? "").trim();

  return (
    <DashboardOnboardingGate needsOnboarding={needsOnboarding}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-2 overflow-hidden p-0 md:gap-3 md:p-6">
        <DashboardPageHeader firstName={firstName} />

        <Suspense
          fallback={
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden md:gap-3">
              <DashboardLoadingSubtitle />
              <DashboardBodySkeleton />
            </div>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden md:gap-3">
            <DashboardSubtitle />
            <DashboardBody emailsSent={emailsSent} />
          </div>
        </Suspense>
      </div>
    </DashboardOnboardingGate>
  );
}
