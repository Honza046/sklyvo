/** Dny od odeslání do dalšího kroku outreach. */
export const OUTREACH_FOLLOW_UP_AFTER_DAYS = 14;
export const OUTREACH_BREAKUP_AFTER_DAYS = 14;

export type OutreachKindValue = "INITIAL" | "FOLLOW_UP" | "BREAKUP";

export const OUTREACH_KIND_LABELS: Record<OutreachKindValue, string> = {
  INITIAL: "První kontakt",
  FOLLOW_UP: "Follow-up",
  BREAKUP: "Breakup",
};

export function addDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/** Po úspěšném odeslání nastav další připomínku (nebo ukonči). */
export function nextOutreachAfterSend(
  kind: OutreachKindValue,
  from = new Date(),
): { nextOutreachAt: Date | null; nextOutreachKind: OutreachKindValue | null; leadStatus: string } {
  if (kind === "INITIAL") {
    return {
      nextOutreachAt: addDays(from, OUTREACH_FOLLOW_UP_AFTER_DAYS),
      nextOutreachKind: "FOLLOW_UP",
      leadStatus: "CONTACTED",
    };
  }
  if (kind === "FOLLOW_UP") {
    return {
      nextOutreachAt: addDays(from, OUTREACH_BREAKUP_AFTER_DAYS),
      nextOutreachKind: "BREAKUP",
      leadStatus: "CONTACTED",
    };
  }
  return {
    nextOutreachAt: null,
    nextOutreachKind: null,
    leadStatus: "BREAK_UP",
  };
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
