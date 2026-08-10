/**
 * Radar settings loader — NOT a server action (no "use server").
 * Callable only from trusted server code with a known workspaceId.
 */
import {
  DEFAULT_RADAR_INDUSTRIES,
  DEFAULT_RADAR_LOCATIONS,
  joinCommaSeparatedInput,
  toRadarSettingsPayload,
  type RadarSettingsPayload,
} from "@/lib/radar-settings-meta";
import { prisma } from "@/lib/prisma";

export async function loadRadarSettingsPayloadForWorkspace(
  workspaceId: string,
): Promise<RadarSettingsPayload> {
  const id = workspaceId.trim();
  if (!id) {
    return toRadarSettingsPayload({
      targetIndustries: DEFAULT_RADAR_INDUSTRIES,
      locations: joinCommaSeparatedInput(DEFAULT_RADAR_LOCATIONS),
      countryCode: "CZ",
      companySize: "any",
      autoStartOutreach: false,
      scheduleDays: [1, 4],
      scheduleTime: "03:00",
      resultsPerQuery: 20,
      minCompaniesPerRun: 20,
      maxCompaniesPerRun: 50,
      sourcePlaces: true,
      sourceWeb: true,
      sourceLinkedin: true,
    });
  }

  const record = await prisma.radarSettings.findUnique({
    where: { workspaceId: id },
  });

  if (!record) {
    return toRadarSettingsPayload({
      targetIndustries: DEFAULT_RADAR_INDUSTRIES,
      locations: joinCommaSeparatedInput(DEFAULT_RADAR_LOCATIONS),
      countryCode: "CZ",
      companySize: "any",
      autoStartOutreach: false,
      scheduleDays: [1, 4],
      scheduleTime: "03:00",
      resultsPerQuery: 20,
      minCompaniesPerRun: 20,
      maxCompaniesPerRun: 50,
      sourcePlaces: true,
      sourceWeb: true,
      sourceLinkedin: true,
    });
  }

  return toRadarSettingsPayload(record);
}
