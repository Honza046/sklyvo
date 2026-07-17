/** Výchozí limity automatického Radaru (dotazy se skládají z RadarSettings v DB). */
export const AUTOMATED_RADAR_CONFIG = {
  scrapeWebsites: true,
} as const;

export type AutomatedRadarRunResult = {
  ok: true;
  workspacesProcessed: number;
  queriesRun: number;
  createdCount: number;
  skippedCount: number;
  errors: string[];
};
