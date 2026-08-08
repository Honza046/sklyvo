const ACCOUNT_SETTINGS_ROUTE_PREFIXES = ["/settings/connect-email"] as const;

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

/** Map a pathname to the sidebar nav key (e.g. /sniper/foo → /sniper). */
export function normalizeActiveHref(pathname: string) {
  if (
    pathname === "/" ||
    pathname.startsWith("/sniper") ||
    pathname.startsWith("/radar") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/uloziste") ||
    pathname.startsWith("/generator") ||
    pathname.startsWith("/autopilot") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/pricing")
  ) {
    if (pathname.startsWith("/sniper")) return "/sniper";
    if (pathname.startsWith("/radar")) return "/radar";
    if (pathname.startsWith("/crm")) return "/crm";
    if (pathname.startsWith("/uloziste")) return "/uloziste";
    if (pathname.startsWith("/generator")) return "/generator";
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
