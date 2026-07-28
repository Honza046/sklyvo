import { normalizeLeadAuthor } from "@/lib/lead-author";

export type LeadSourceValue = "RADAR" | "SNIPER" | "MANUAL" | "AUTOPILOT";

const SOURCE_LABEL: Record<LeadSourceValue, string> = {
  RADAR: "Radar",
  SNIPER: "Sniper",
  MANUAL: "Manuálně",
  AUTOPILOT: "Autopilot",
};

/** Krátké jméno pro CRM (Jan / Matěj / Filip), jinak celé jméno. */
export function shortLeadAuthorName(raw: string | null | undefined): string {
  const full = normalizeLeadAuthor(raw) ?? (raw ?? "").trim();
  if (!full) return "";
  if (full === "Jan Sedlář") return "Jan";
  if (full === "Matěj Pazdera") return "Matěj";
  if (full === "Filip Retzl") return "Filip";
  const first = full.split(/\s+/)[0];
  return first || full;
}

export function leadSourceLabel(source: string | null | undefined): string {
  if (source === "RADAR" || source === "SNIPER" || source === "MANUAL" || source === "AUTOPILOT") {
    return SOURCE_LABEL[source];
  }
  return SOURCE_LABEL.MANUAL;
}

/** Např. "Radar · Jan" nebo jen "Autopilot" když chybí autor. */
export function formatLeadProvenance(
  source: string | null | undefined,
  author: string | null | undefined,
): string {
  const tool = leadSourceLabel(source);
  const who = shortLeadAuthorName(author);
  if (tool && who) return `${tool} · ${who}`;
  return tool || who || "";
}

export function authorFromSessionName(name: string | null | undefined): string | null {
  return normalizeLeadAuthor(name) ?? (name?.trim() || null);
}
