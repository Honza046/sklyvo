export type RadarCompanySize = "any" | "micro" | "small" | "medium" | "large";

export const RADAR_COMPANY_SIZE_OPTIONS: Array<{ value: RadarCompanySize; label: string }> = [
  { value: "any", label: "Libovolná velikost" },
  { value: "micro", label: "Mikro (1–9 zaměstnanců)" },
  { value: "small", label: "Malá (10–49)" },
  { value: "medium", label: "Střední (50–249)" },
  { value: "large", label: "Velká (250+)" },
];

export const DEFAULT_RADAR_INDUSTRIES = [
  "marketingová agentura",
  "webové studio",
  "účetní firma",
];

export const DEFAULT_RADAR_LOCATIONS = ["Praha", "Brno", "Ostrava"];

const COMPANY_SIZE_QUERY_HINT: Record<RadarCompanySize, string> = {
  any: "",
  micro: "malá firma",
  small: "malá společnost",
  medium: "střední firma",
  large: "velká firma",
};

export function parseCommaSeparatedInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** @deprecated Prefer parseCommaSeparatedInput for Autopilot radar settings. */
export function parseMultilineInput(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinCommaSeparatedInput(values: string[]): string {
  return values.join(", ");
}

export function joinMultilineInput(values: string[]): string {
  return values.join("\n");
}

export type RadarSearchQuery = {
  query: string;
  limit: number;
};

export type RadarSettingsPayload = {
  targetIndustries: string[];
  locations: string;
  companySize: RadarCompanySize;
  autoStartOutreach: boolean;
  scheduleDays: number[];
  scheduleTime: string;
  resultsPerQuery: number;
  maxCompaniesPerRun: number;
};

export function buildRadarSearchQueries(settings: RadarSettingsPayload): RadarSearchQuery[] {
  const industries =
    settings.targetIndustries.length > 0 ? settings.targetIndustries : DEFAULT_RADAR_INDUSTRIES;

  const parsedLocations = parseCommaSeparatedInput(settings.locations);
  const locationLines =
    parsedLocations.length > 0
      ? parsedLocations
      : settings.locations.includes("\n")
        ? parseMultilineInput(settings.locations)
        : [];
  const locations = locationLines.length > 0 ? locationLines : DEFAULT_RADAR_LOCATIONS;

  const sizeHint = COMPANY_SIZE_QUERY_HINT[settings.companySize] ?? "";
  const limit = Math.max(1, Math.min(settings.resultsPerQuery, 20));

  const queries: RadarSearchQuery[] = [];

  for (const industry of industries) {
    for (const location of locations) {
      const parts = [industry, location, sizeHint].filter(Boolean);
      queries.push({ query: parts.join(" "), limit });
    }
  }

  return queries.slice(0, 24);
}

export function toRadarSettingsPayload(record: {
  targetIndustries: string[];
  locations: string;
  companySize: string;
  autoStartOutreach: boolean;
  scheduleDays: number[];
  scheduleTime: string;
  resultsPerQuery: number;
  maxCompaniesPerRun: number;
}): RadarSettingsPayload {
  const companySize = RADAR_COMPANY_SIZE_OPTIONS.some((o) => o.value === record.companySize)
    ? (record.companySize as RadarCompanySize)
    : "any";

  return {
    targetIndustries: record.targetIndustries ?? [],
    locations: record.locations ?? "",
    companySize,
    autoStartOutreach: record.autoStartOutreach ?? false,
    scheduleDays: record.scheduleDays?.length ? record.scheduleDays : [1, 4],
    scheduleTime: record.scheduleTime || "03:00",
    resultsPerQuery: record.resultsPerQuery || 8,
    maxCompaniesPerRun: record.maxCompaniesPerRun || 50,
  };
}
