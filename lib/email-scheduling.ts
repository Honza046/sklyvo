export type ScheduleTimeWindow = {
 start: string;
 end: string;
};

const PRAGUE_TZ = "Europe/Prague";

function parseTimeHHMM(value: string): { hour: number; minute: number } | null {
 const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
 if (!match) return null;
 const hour = Number(match[1]);
 const minute = Number(match[2]);
 if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
 return { hour, minute };
}

function getZonedParts(date: Date, timeZone: string) {
 const parts = new Intl.DateTimeFormat("en-US", {
 timeZone,
 year: "numeric",
 month: "2-digit",
 day: "2-digit",
 hour: "2-digit",
 minute: "2-digit",
 second: "2-digit",
 hour12: false,
 }).formatToParts(date);

 const read = (type: Intl.DateTimeFormatPartTypes) =>
 Number(parts.find((part) => part.type === type)?.value ?? "0");

 return {
 year: read("year"),
 month: read("month"),
 day: read("day"),
 hour: read("hour") % 24,
 minute: read("minute"),
 second: read("second"),
 };
}

/** Převede kalendářní den + HH:MM v Europe/Prague na UTC instant. */
export function pragueDateTime(
 year: number,
 month: number,
 day: number,
 hour: number,
 minute: number,
): Date {
 let utcMs = Date.UTC(year, month - 1, day, hour - 1, minute, 0);

 for (let attempt = 0; attempt < 6; attempt += 1) {
 const parts = getZonedParts(new Date(utcMs), PRAGUE_TZ);
 const targetMinutes = hour * 60 + minute;
 const actualMinutes = parts.hour * 60 + parts.minute;
 const dayDiff =
 (parts.year - year) * 525600 +
 (parts.month - month) * 43200 +
 (parts.day - day) * 1440;

 const deltaMinutes = dayDiff * 1440 + (actualMinutes - targetMinutes);
 if (deltaMinutes === 0) {
 return new Date(utcMs);
 }
 utcMs -= deltaMinutes * 60_000;
 }

 return new Date(utcMs);
}

function startOfPragueDay(date: Date): { year: number; month: number; day: number } {
 const parts = getZonedParts(date, PRAGUE_TZ);
 return { year: parts.year, month: parts.month, day: parts.day };
}

function addPragueDays(base: { year: number; month: number; day: number }, days: number) {
 const utc = Date.UTC(base.year, base.month - 1, base.day + days, 12, 0, 0);
 return startOfPragueDay(new Date(utc));
}

/** Weekday v Europe/Prague: 0=Ne … 6=So (jako `Date.getDay()`). */
export function pragueWeekday(day: { year: number; month: number; day: number }): number {
 const probe = pragueDateTime(day.year, day.month, day.day, 12, 0);
 const label = new Intl.DateTimeFormat("en-US", {
 timeZone: PRAGUE_TZ,
 weekday: "short",
 }).format(probe);
 const map: Record<string, number> = {
 Sun: 0,
 Mon: 1,
 Tue: 2,
 Wed: 3,
 Thu: 4,
 Fri: 5,
 Sat: 6,
 };
 return map[label] ?? probe.getUTCDay();
}

function randomMinuteInWindow(
 day: { year: number; month: number; day: number },
 start: string,
 end: string,
): Date | null {
 const startParts = parseTimeHHMM(start);
 const endParts = parseTimeHHMM(end);
 if (!startParts || !endParts) return null;

 const startMs = pragueDateTime(
 day.year,
 day.month,
 day.day,
 startParts.hour,
 startParts.minute,
 ).getTime();
 const endMs = pragueDateTime(day.year, day.month, day.day, endParts.hour, endParts.minute).getTime();
 if (endMs <= startMs) return null;

 const randomMs = startMs + Math.floor(Math.random() * (endMs - startMs));
 return new Date(randomMs);
}

/**
 * Rozdělí `count` e-mailů do časových oken s limitem `maxEmailsPerBatch` na dávku.
 * Časy jsou náhodně rozprostřené uvnitř každého okna.
 * `allowedWeekdays` — 0=Ne … 6=So; prázdné / neuvedené = každý den.
 */
export function computeScheduledTimes(
 count: number,
 windows: ScheduleTimeWindow[],
 maxEmailsPerBatch: number,
 now: Date = new Date(),
 allowedWeekdays?: number[],
): Date[] {
 if (count <= 0) return [];

 const validWindows = windows.filter((window) => {
 const start = parseTimeHHMM(window.start);
 const end = parseTimeHHMM(window.end);
 return Boolean(start && end);
 });

 if (validWindows.length === 0) {
 throw new Error("Neplatná časová okna pro plánování.");
 }

 const dayFilter =
 allowedWeekdays && allowedWeekdays.length > 0
 ? new Set(allowedWeekdays)
 : null;

 const batchSize = Math.max(1, Math.min(maxEmailsPerBatch, 500));
 const results: Date[] = [];
 let dayOffset = 0;
 let windowIndex = 0;
 let batchCount = 0;
 let guard = 0;

 while (results.length < count) {
 guard += 1;
 if (guard > count * 400) {
 throw new Error("Nepodařilo se naplánovat odeslání — zkontrolujte dny a časová okna.");
 }

 const day = addPragueDays(startOfPragueDay(now), dayOffset);

 if (dayFilter && !dayFilter.has(pragueWeekday(day))) {
 dayOffset += 1;
 windowIndex = 0;
 batchCount = 0;
 continue;
 }

 const window = validWindows[windowIndex % validWindows.length];
 const scheduled = randomMinuteInWindow(day, window.start, window.end);

 if (!scheduled) {
 windowIndex += 1;
 if (windowIndex >= validWindows.length) {
 windowIndex = 0;
 dayOffset += 1;
 batchCount = 0;
 }
 continue;
 }

 if (scheduled.getTime() <= now.getTime() && dayOffset === 0) {
 windowIndex += 1;
 if (windowIndex >= validWindows.length) {
 windowIndex = 0;
 dayOffset += 1;
 batchCount = 0;
 }
 continue;
 }

 results.push(scheduled);
 batchCount += 1;

 if (batchCount >= batchSize) {
 batchCount = 0;
 windowIndex += 1;
 if (windowIndex >= validWindows.length) {
 windowIndex = 0;
 dayOffset += 1;
 }
 }
 }

 return results.sort((a, b) => a.getTime() - b.getTime());
}

export function formatSchedulePreview(date: Date): string {
 return new Intl.DateTimeFormat("cs-CZ", {
 timeZone: PRAGUE_TZ,
 weekday: "short",
 day: "numeric",
 month: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 }).format(date);
}
