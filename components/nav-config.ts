import {
  Crosshair,
  LayoutDashboard,
  Radio,
  Users,
  FolderOpen,
} from "lucide-react";

export const MAIN_NAV = [
  { href: "/", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/sniper", labelKey: "nav.sniper", icon: Crosshair },
  { href: "/radar", labelKey: "nav.radar", icon: Radio },
  { href: "/crm", labelKey: "nav.crm", icon: Users },
  { href: "/uloziste", labelKey: "nav.storage", icon: FolderOpen },
  // Generátor — schováno z navigace (PDF šablona ještě není ready); route /generator zůstává
] as const;

/** Outreach tools — under “Nástroje” (Autopilot is rendered separately). */
export const TOOL_NAV_HREFS = new Set<string>(["/sniper", "/radar"]);

/** CRM + storage — under “Práce”, not tools. */
export const WORK_NAV_HREFS = new Set<string>(["/crm", "/uloziste"]);

export const AUTOPILOT_SUB_NAV = [
  { href: "/autopilot/radar", labelKey: "nav.autopilotCollect" },
  { href: "/autopilot/sniper", labelKey: "nav.autopilotSend" },
  { href: "/autopilot/full-auto", labelKey: "nav.autopilotFullAuto" },
] as const;
