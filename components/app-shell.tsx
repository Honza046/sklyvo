"use client";

import { Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { normalizeActiveHref } from "@/lib/nav-active-href";

const PERSISTENT_SIDEBAR_PATHS = new Set([
  "/",
  "/sniper",
  "/radar",
  "/crm",
  "/uloziste",
  "/generator",
  "/autopilot",
  "/help",
  "/settings",
  "/account",
  "/pricing",
]);

export type HomeShellMode = "landing" | "dashboard";

export function AppShell({
  children,
  homeMode,
}: {
  children: React.ReactNode;
  homeMode: HomeShellMode;
}) {
  const pathname = usePathname();
  const activeHref = useMemo(() => normalizeActiveHref(pathname), [pathname]);

  // Guests must never see the dashboard chrome — soft-nav to a protected route
  // (e.g. /pricing from the landing) used to flash an empty shell before login.
  const usePersistentShell =
    homeMode === "dashboard" && PERSISTENT_SIDEBAR_PATHS.has(activeHref);

  if (usePersistentShell) {
    return (
      <Suspense fallback={null}>
        <DashboardShell activeHref={activeHref}>{children}</DashboardShell>
      </Suspense>
    );
  }

  return <>{children}</>;
}
