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

/** Max Google Places results we ask per single text query. */
const MAX_RESULTS_PER_QUERY = 20;
/** Soft cap on queries per cron run (rotation covers the rest across days). */
const MAX_QUERIES_PER_RUN = 48;

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
 /** ISO country for Places regionCode; empty = no bias. */
 countryCode: string;
 companySize: RadarCompanySize;
 autoStartOutreach: boolean;
 scheduleDays: number[];
 scheduleTime: string;
 resultsPerQuery: number;
 /** Soft lower target — keep searching until reached when possible. */
 minCompaniesPerRun: number;
 maxCompaniesPerRun: number;
 /** Multi-source discovery flags. */
 sourcePlaces: boolean;
 sourceWeb: boolean;
 sourceLinkedin: boolean;
};

function pragueDayOfYear(now = new Date()): number {
 const parts = new Intl.DateTimeFormat("en-GB", {
 timeZone: "Europe/Prague",
 year: "numeric",
 month: "2-digit",
 day: "2-digit",
 }).formatToParts(now);
 const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
 const y = get("year");
 const m = get("month");
 const d = get("day");
 const utc = Date.UTC(y, m - 1, d);
 const start = Date.UTC(y, 0, 0);
 return Math.floor((utc - start) / 86_400_000);
}

function rotateArray<T>(items: T[], offset: number): T[] {
 if (items.length === 0) return items;
 const shift = ((offset % items.length) + items.length) % items.length;
 if (shift === 0) return items;
 return [...items.slice(shift), ...items.slice(0, shift)];
}

export function buildRadarSearchQueries(
 settings: RadarSettingsPayload,
 now = new Date(),
): RadarSearchQuery[] {
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
 const maxPerRun = Math.max(1, settings.maxCompaniesPerRun || 50);
 const minPerRun = Math.max(1, Math.min(settings.minCompaniesPerRun || 1, maxPerRun));

 const allCombos: string[] = [];
 for (const industry of industries) {
 for (const location of locations) {
 const parts = [industry, location, sizeHint].filter(Boolean);
 allCombos.push(parts.join(" "));
 }
 }

 // Každý den jiný start v matici obor × město → víc nových firem po vyloučení duplicit.
 const rotated = rotateArray(allCombos, pragueDayOfYear(now) * 3);

 // Kolik firem chceme z jednoho dotazu, aby šlo naplnit denní cíl.
 const queriesBudget = Math.min(MAX_QUERIES_PER_RUN, Math.max(rotated.length, 1));
 const derivedPerQuery = Math.ceil(maxPerRun / Math.min(queriesBudget, 10));
 const perQuery = Math.max(
 1,
 Math.min(
 MAX_RESULTS_PER_QUERY,
 Math.max(settings.resultsPerQuery || 0, derivedPerQuery, Math.ceil(minPerRun / 4)),
 ),
 );

 return rotated.slice(0, MAX_QUERIES_PER_RUN).map((query) => ({
 query,
 limit: perQuery,
 }));
}

export function toRadarSettingsPayload(record: {
 targetIndustries: string[];
 locations: string;
 countryCode?: string | null;
 companySize: string;
 autoStartOutreach: boolean;
 scheduleDays: number[];
 scheduleTime: string;
 resultsPerQuery: number;
 minCompaniesPerRun?: number | null;
 maxCompaniesPerRun: number;
 sourcePlaces?: boolean | null;
 sourceWeb?: boolean | null;
 sourceLinkedin?: boolean | null;
}): RadarSettingsPayload {
 const companySize = RADAR_COMPANY_SIZE_OPTIONS.some((o) => o.value === record.companySize)
 ? (record.companySize as RadarCompanySize)
 : "any";

 const maxCompaniesPerRun = Math.max(1, record.maxCompaniesPerRun || 50);
 const minCompaniesPerRun = Math.max(
 1,
 Math.min(record.minCompaniesPerRun || Math.min(20, maxCompaniesPerRun), maxCompaniesPerRun),
 );

 const rawCountry = (record.countryCode ?? "CZ").trim().toUpperCase();
 const countryCode =
 rawCountry === "" || rawCountry === "NONE" ? "" : rawCountry;

 return {
 targetIndustries: record.targetIndustries ?? [],
 locations: record.locations ?? "",
 countryCode,
 companySize,
 autoStartOutreach: record.autoStartOutreach ?? false,
 scheduleDays: record.scheduleDays?.length ? record.scheduleDays : [1, 4],
 scheduleTime: record.scheduleTime || "03:00",
 resultsPerQuery: record.resultsPerQuery || 20,
 minCompaniesPerRun,
 maxCompaniesPerRun,
 sourcePlaces: record.sourcePlaces ?? true,
 sourceWeb: record.sourceWeb ?? true,
 sourceLinkedin: record.sourceLinkedin ?? true,
 };
}
