import type { CSSProperties } from "react";

export type CrmLeadStatusKey =
  | "new"
  | "contacted"
  | "follow_up"
  | "communication"
  | "agreed"
  | "rejected"
  | "breakup";

export type CrmLeadStatusDb =
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "MEETING_SET"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "BREAK_UP";

/** Matej CRM badge tints (workspace-v2 CRM_STATUS + CRM_PHASES). */
export const MATEJ_STATUS_TINT: Record<CrmLeadStatusKey, string> = {
  new: "#02A7FF",
  contacted: "#C9CDD3",
  follow_up: "#FBBF24",
  communication: "#C084FC",
  agreed: "#34D399",
  breakup: "#FF7802",
  rejected: "#FB7185",
};

export const LEAD_STATUS_CYCLE: CrmLeadStatusDb[] = [
  "NEW",
  "CONTACTED",
  "REPLIED",
  "MEETING_SET",
  "CLOSED_WON",
  "BREAK_UP",
  "CLOSED_LOST",
];

export function nextLeadStatus(current: CrmLeadStatusDb): CrmLeadStatusDb {
  const idx = LEAD_STATUS_CYCLE.indexOf(current);
  if (idx < 0) return "NEW";
  return LEAD_STATUS_CYCLE[(idx + 1) % LEAD_STATUS_CYCLE.length];
}

export function matejBadgeStyle(tint: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 24,
    padding: "0 10px",
    borderRadius: 7,
    background: `${tint}1F`,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    color: tint,
  };
}

export function matejAvatarStyle(name: string, size = 30): CSSProperties {
  const hue = (name.charCodeAt(0) * 37) % 360;
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    flex: "none",
    borderRadius: 9,
    background: `hsla(${hue}, 70%, 60%, 0.16)`,
    fontSize: 11,
    fontWeight: 700,
    color: `hsl(${hue}, 70%, 72%)`,
  };
}
