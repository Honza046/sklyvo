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

/** Např. "Radar · Jan" — vždy se snaží ukázat i jméno. */
export function formatLeadProvenance(
  source: string | null | undefined,
  author: string | null | undefined,
): string {
  const tool = leadSourceLabel(source);
  const who = shortLeadAuthorName(author);
  if (tool && who) return `${tool} · ${who}`;
  if (who) return who;
  return tool || "";
}

/** Zdroj a autor zvlášť — pro CRM UI. */
export function leadProvenanceParts(
  source: string | null | undefined,
  author: string | null | undefined,
): { sourceLabel: string; authorLabel: string } {
  return {
    sourceLabel: leadSourceLabel(source),
    authorLabel: shortLeadAuthorName(author),
  };
}

export function authorFromSessionName(name: string | null | undefined): string | null {
  return normalizeLeadAuthor(name) ?? (name?.trim() || null);
}

/** Jméno z session — name, jinak e-mail (jan@… → Jan Sedlář). */
export function authorFromSessionUser(user: {
  name?: string | null;
  email?: string | null;
} | null | undefined): string | null {
  if (!user) return null;
  return (
    authorFromSessionName(user.name) ??
    normalizeLeadAuthor(user.email) ??
    authorFromSessionName(user.email?.split("@")[0] ?? null)
  );
}
