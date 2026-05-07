"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";

const PERSISTENT_SIDEBAR_PATHS = new Set([
  "/",
  "/sniper",
  "/radar",
  "/crm",
  "/help",
  "/settings",
  "/account",
  "/pricing",
]);

function normalizeActiveHref(pathname: string) {
  if (
    pathname === "/" ||
    pathname.startsWith("/sniper") ||
    pathname.startsWith("/radar") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/pricing")
  ) {
    if (pathname.startsWith("/sniper")) return "/sniper";
    if (pathname.startsWith("/radar")) return "/radar";
    if (pathname.startsWith("/crm")) return "/crm";
    if (pathname.startsWith("/help")) return "/help";
    if (pathname.startsWith("/settings")) return "/settings";
    if (pathname.startsWith("/account")) return "/account";
    if (pathname.startsWith("/pricing")) return "/pricing";
    return "/";
  }
  return pathname;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeHref = useMemo(() => normalizeActiveHref(pathname), [pathname]);

  if (PERSISTENT_SIDEBAR_PATHS.has(activeHref)) {
    return <DashboardShell activeHref={activeHref}>{children}</DashboardShell>;
  }

  return <>{children}</>;
}
