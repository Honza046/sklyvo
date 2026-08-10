/** Výchozí limity automatického Radaru (dotazy se skládají z RadarSettings v DB). */
export const AUTOMATED_RADAR_CONFIG = {
 scrapeWebsites: true,
 /** 1 kredit za každou nově uloženou firmu (včetně scrape kontaktů z webu). */
 creditsPerNewLead: 1,
} as const;

export type AutomatedRadarRunResult = {
 ok: true;
 workspacesProcessed: number;
 queriesRun: number;
 createdCount: number;
 skippedCount: number;
 creditsCharged: number;
 errors: string[];
};
