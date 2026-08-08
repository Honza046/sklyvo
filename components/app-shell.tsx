"use client";

import { useMemo } from "react";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeHref = useMemo(() => normalizeActiveHref(pathname), [pathname]);

  if (PERSISTENT_SIDEBAR_PATHS.has(activeHref)) {
    return <DashboardShell activeHref={activeHref}>{children}</DashboardShell>;
  }

  return <>{children}</>;
}
