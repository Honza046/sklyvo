"use client";

import type { ReactNode } from "react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardRangeProvider } from "@/components/dashboard/dashboard-range-context";

export function DashboardFrame({
  firstName,
  children,
}: {
  firstName: string;
  children: ReactNode;
}) {
  return (
    <DashboardRangeProvider>
      <div className="sk-dashboard-frame flex h-full min-h-0 w-full flex-col gap-2 md:gap-3">
        <DashboardPageHeader firstName={firstName} />
        {children}
      </div>
    </DashboardRangeProvider>
  );
}
