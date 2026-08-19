import {
  GridIcon,
  SniperIcon,
  RadarIcon,
  PeopleIcon,
  FolderIcon,
} from "@/components/sklyvo/nav-icons";

export const MAIN_NAV = [
  { href: "/", labelKey: "nav.overview", icon: GridIcon },
  { href: "/sniper", labelKey: "nav.sniper", icon: SniperIcon },
  { href: "/radar", labelKey: "nav.radar", icon: RadarIcon },
  { href: "/crm", labelKey: "nav.crm", icon: PeopleIcon },
  { href: "/uloziste", labelKey: "nav.storage", icon: FolderIcon },
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
