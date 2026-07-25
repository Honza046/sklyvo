export type FullAutoFrequency = "once_weekly" | "twice_weekly" | "daily";

export type SendingStrategy = "batch" | "immediate";

export type RadarCompanySize = "any" | "micro" | "small" | "medium" | "large";

export type AutopilotAutomationSettings = {
  radarDays: number[];
  radarRunTime: string;
  targetIndustries: string;
  locations: string;
  companySize: RadarCompanySize;
  autoStartOutreach: boolean;
  maxCompaniesPerRun: number;
  minCompaniesPerRun: number;
  window1Start: string;
  window1End: string;
  window2Start: string;
  window2End: string;
  maxEmailsPerBatch: number;
  /** Dny v týdnu pro odesílání (0=Ne … 6=So), jako `Date.getDay()` / Prague. */
  sendDays: number[];
  sendingStrategy: SendingStrategy;
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
  companySize: "any",
  autoStartOutreach: false,
  maxCompaniesPerRun: 50,
  minCompaniesPerRun: 20,
  window1Start: "09:00",
  window1End: "11:30",
  window2Start: "14:00",
  window2End: "16:00",
  maxEmailsPerBatch: 20,
  sendDays: [1, 2, 3, 4, 5],
  sendingStrategy: "batch",
  fullAutoFrequency: "twice_weekly",
  fullAutoRunTime: "08:00",
};

export const FULL_AUTO_FREQUENCY_LABELS: Record<FullAutoFrequency, string> = {
  once_weekly: "Jednou týdně",
  twice_weekly: "Dvakrát týdně",
  daily: "Každý pracovní den",
};
