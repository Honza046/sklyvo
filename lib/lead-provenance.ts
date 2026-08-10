import { normalizeLeadAuthor } from "@/lib/lead-author";

export type LeadSourceValue = "RADAR" | "SNIPER" | "MANUAL" | "AUTOPILOT" | "FULL_AUTO";
export type ContactedViaValue = "SNIPER" | "AUTOPILOT_SNIPER";

const SOURCE_LABEL: Record<LeadSourceValue, string> = {
 RADAR: "Radar",
 SNIPER: "Sniper",
 MANUAL: "Manuálně",
 AUTOPILOT: "Autopilot Radar",
 FULL_AUTO: "Full Auto",
};

const CONTACTED_VIA_LABEL: Record<ContactedViaValue, string> = {
 SNIPER: "Sniper",
 AUTOPILOT_SNIPER: "Autopilot Sniper",
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
 if (
 source === "RADAR" ||
 source === "SNIPER" ||
 source === "MANUAL" ||
 source === "AUTOPILOT" ||
 source === "FULL_AUTO"
 ) {
 return SOURCE_LABEL[source];
 }
 return SOURCE_LABEL.MANUAL;
}

export function contactedViaLabel(via: string | null | undefined): string {
 if (via === "SNIPER" || via === "AUTOPILOT_SNIPER") {
 return CONTACTED_VIA_LABEL[via];
 }
 return "";
}

/**
 * CRM štítek zdroje:
 * - po odeslání e-mailu → Sniper / Autopilot-Sniper
 * - jinak → Radar / Autopilot Radar / Manuálně / Sniper
 */
export function leadChannelLabel(
 source: string | null | undefined,
 contactedVia?: string | null | undefined,
): string {
 const via = contactedViaLabel(contactedVia);
 if (via) return via;
 return leadSourceLabel(source);
}

/** Např. "Radar · Jan" — vždy se snaží ukázat i jméno. */
export function formatLeadProvenance(
 source: string | null | undefined,
 author: string | null | undefined,
 contactedVia?: string | null | undefined,
): string {
 const tool = leadChannelLabel(source, contactedVia);
 const who = shortLeadAuthorName(author);
 if (tool && who) return `${tool} · ${who}`;
 if (who) return who;
 return tool || "";
}

/** Zdroj a autor zvlášť — pro CRM UI. */
export function leadProvenanceParts(
 source: string | null | undefined,
 author: string | null | undefined,
 contactedVia?: string | null | undefined,
): { sourceLabel: string; authorLabel: string } {
 return {
 sourceLabel: leadChannelLabel(source, contactedVia),
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
