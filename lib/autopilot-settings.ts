export type FullAutoFrequency = "once_weekly" | "twice_weekly" | "daily";

export type SendingStrategy = "batch" | "immediate" | "queue";

export type RadarCompanySize = "any" | "micro" | "small" | "medium" | "large";

export type AutopilotAutomationSettings = {
  radarDays: number[];
  radarRunTime: string;
  targetIndustries: string;
  locations: string;
  countryCode: string;
  companySize: RadarCompanySize;
  autoStartOutreach: boolean;
  maxCompaniesPerRun: number;
  minCompaniesPerRun: number;
  window1Start: string;
  window1End: string;
  window2Start: string;
  window2End: string;
  /** Druhé časové okno — vypnuté = nepoužívá se při plánování. */
  window2Enabled: boolean;
  window3Start: string;
  window3End: string;
  /** Třetí časové okno — vypnuté = nepoužívá se při plánování. */
  window3Enabled: boolean;
  maxEmailsPerBatch: number;
  /** Dny v týdnu pro odesílání (0=Ne … 6=So), jako `Date.getDay()` / Prague. */
  sendDays: number[];
  sendingStrategy: SendingStrategy;
  /** Autopilot Sniper: generovat jen pro firmy s e-mailem. */
  onlyWithEmail: boolean;
  fullAutoFrequency: FullAutoFrequency;
  fullAutoRunTime: string;
};

export const RADAR_WEEKDAYS = [
  { value: 1, label: "Po" },
  { value: 2, label: "Út" },
  { value: 3, label: "St" },
  { value: 4, label: "Čt" },
  { value: 5, label: "Pá" },
  { value: 6, label: "So" },
  { value: 0, label: "Ne" },
] as const;

/** Pracovní dny pro odesílání e-mailů (bez víkendu). */
export const SEND_WEEKDAYS = RADAR_WEEKDAYS.filter(
  (day) => day.value >= 1 && day.value <= 5,
);

export const DEFAULT_AUTOPILOT_SETTINGS: AutopilotAutomationSettings = {
  radarDays: [1, 4],
  radarRunTime: "03:00",
  targetIndustries: "",
  locations: "",
  countryCode: "CZ",
  companySize: "any",
  autoStartOutreach: false,
  maxCompaniesPerRun: 50,
  minCompaniesPerRun: 20,
  window1Start: "09:00",
  window1End: "11:30",
  window2Start: "14:00",
  window2End: "16:00",
  window2Enabled: false,
  window3Start: "17:00",
  window3End: "18:30",
  window3Enabled: false,
  maxEmailsPerBatch: 20,
  sendDays: [1, 2, 3, 4, 5],
  sendingStrategy: "queue",
  onlyWithEmail: false,
  fullAutoFrequency: "twice_weekly",
  fullAutoRunTime: "08:00",
};

export const FULL_AUTO_FREQUENCY_LABELS: Record<FullAutoFrequency, string> = {
  once_weekly: "Jednou týdně",
  twice_weekly: "Dvakrát týdně",
  daily: "Každý pracovní den",
};

/** Aktivní časová okna pro plánování (základní + volitelná 2. a 3.). */
export function getActiveScheduleWindows(settings: AutopilotAutomationSettings): {
  start: string;
  end: string;
}[] {
  const windows: { start: string; end: string }[] = [
    { start: settings.window1Start, end: settings.window1End },
  ];
  if (settings.window2Enabled) {
    windows.push({ start: settings.window2Start, end: settings.window2End });
  }
  if (settings.window3Enabled) {
    windows.push({ start: settings.window3Start, end: settings.window3End });
  }
  return windows;
}

/** Časy pro select (06:00–22:00 po 15 min). */
export const SCHEDULE_TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === 22 && minute > 0) break;
      options.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      );
    }
  }
  return options;
})();

/** Zajistí, že hodnota je v seznamu optionů (např. legacy 11:30 už je v 15min krocích). */
export function ensureScheduleTimeOption(value: string): string {
  if (SCHEDULE_TIME_OPTIONS.includes(value)) return value;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return "09:00";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const rounded = Math.round(minute / 15) * 15;
  const adjHour = rounded === 60 ? hour + 1 : hour;
  const adjMin = rounded === 60 ? 0 : rounded;
  const normalized = `${String(Math.min(22, Math.max(6, adjHour))).padStart(2, "0")}:${String(adjMin).padStart(2, "0")}`;
  return SCHEDULE_TIME_OPTIONS.includes(normalized) ? normalized : "09:00";
}
