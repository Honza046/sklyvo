"use client";

import { Suspense, useEffect, useMemo } from "react";
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

  // #region agent log
  useEffect(() => {
    const nav =
      typeof performance !== "undefined"
        ? performance.getEntriesByType("navigation")[0]
        : undefined;
    const navTiming = nav as PerformanceNavigationTiming | undefined;
    fetch("http://127.0.0.1:7726/ingest/2b791012-cefe-498e-8f7b-78369eeb4e50", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "088b81",
      },
      body: JSON.stringify({
        sessionId: "088b81",
        runId: "cleanup-v1",
        hypothesisId: "A-B-C",
        location: "app-shell.tsx:route-change",
        message: "route navigation timing",
        data: {
          pathname,
          activeHref,
          domContentLoadedMs: navTiming?.domContentLoadedEventEnd,
          loadEventEndMs: navTiming?.loadEventEnd,
          transferSize: navTiming?.transferSize,
          resourceCount: performance.getEntriesByType("resource").length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [pathname, activeHref]);
  // #endregion

  if (PERSISTENT_SIDEBAR_PATHS.has(activeHref)) {
    return (
      <Suspense fallback={null}>
        <DashboardShell activeHref={activeHref}>{children}</DashboardShell>
      </Suspense>
    );
  }

  return <>{children}</>;
}
