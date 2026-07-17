"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";

const ACCOUNT_SETTINGS_ROUTE_PREFIXES = ["/settings/connect-email"] as const;

const PERSISTENT_SIDEBAR_PATHS = new Set([
  "/",
  "/sniper",
  "/radar",
  "/crm",
  "/autopilot",
  "/help",
  "/settings",
  "/account",
  "/pricing",
]);

function isAccountSettingsRoute(pathname: string) {
  return ACCOUNT_SETTINGS_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isWorkspaceSettingsRoute(pathname: string) {
  return (
    pathname === "/settings" ||
    pathname === "/settings/billing" ||
    pathname.startsWith("/settings/billing/")
  );
}

function normalizeActiveHref(pathname: string) {
  if (
    pathname === "/" ||
    pathname.startsWith("/sniper") ||
    pathname.startsWith("/radar") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/autopilot") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/pricing")
  ) {
    if (pathname.startsWith("/sniper")) return "/sniper";
    if (pathname.startsWith("/radar")) return "/radar";
    if (pathname.startsWith("/crm")) return "/crm";
    if (pathname.startsWith("/autopilot")) return "/autopilot";
    if (pathname.startsWith("/help")) return "/help";
    if (pathname.startsWith("/settings")) {
      if (isAccountSettingsRoute(pathname)) return "/account";
      if (isWorkspaceSettingsRoute(pathname)) return "/settings";
      return "/account";
    }
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
