"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import {
  DEFAULT_RADAR_INDUSTRIES,
  DEFAULT_RADAR_LOCATIONS,
  joinCommaSeparatedInput,
  parseCommaSeparatedInput,
  toRadarSettingsPayload,
  type RadarCompanySize,
  type RadarSettingsPayload,
} from "@/lib/radar-settings-meta";
import { prisma } from "@/lib/prisma";

export type RadarSettingsFormData = {
  targetIndustries: string;
  locations: string;
  companySize: RadarCompanySize;
  autoStartOutreach: boolean;
  radarDays: number[];
  radarRunTime: string;
  maxCompaniesPerRun: number;
};

export type RadarSettingsView = RadarSettingsFormData;

function formToPayload(form: RadarSettingsFormData): RadarSettingsPayload {
  return {
    targetIndustries: parseCommaSeparatedInput(form.targetIndustries),
    locations: form.locations.trim(),
    companySize: form.companySize,
    autoStartOutreach: form.autoStartOutreach,
    scheduleDays: form.radarDays,
    scheduleTime: form.radarRunTime,
    resultsPerQuery: 8,
    maxCompaniesPerRun: Math.max(1, form.maxCompaniesPerRun || 50),
  };
}

function recordToForm(record: RadarSettingsPayload): RadarSettingsFormData {
  return {
    targetIndustries: joinCommaSeparatedInput(record.targetIndustries),
    locations: record.locations.trim(),
    companySize: record.companySize,
    autoStartOutreach: record.autoStartOutreach,
    radarDays: record.scheduleDays,
    radarRunTime: record.scheduleTime,
    maxCompaniesPerRun: record.maxCompaniesPerRun,
  };
}

export async function getRadarSettings(): Promise<
  { settings: RadarSettingsView } | { error: string }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const record = await prisma.radarSettings.findUnique({
    where: { workspaceId },
  });

  if (!record) {
    return {
      settings: {
        targetIndustries: "",
        locations: "",
        companySize: "any",
        autoStartOutreach: false,
        radarDays: [1, 4],
        radarRunTime: "03:00",
        maxCompaniesPerRun: 50,
      },
    };
  }

  return {
    settings: recordToForm(toRadarSettingsPayload(record)),
  };
}

export async function saveRadarSettings(
  form: RadarSettingsFormData,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const payload = formToPayload(form);

  if (payload.scheduleDays.length === 0) {
    return { error: "Vyberte alespoň jeden den pro automatické spouštění Radaru." };
  }

  await prisma.radarSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      targetIndustries: payload.targetIndustries,
      locations: payload.locations,
      companySize: payload.companySize,
      autoStartOutreach: payload.autoStartOutreach,
      scheduleDays: payload.scheduleDays,
      scheduleTime: payload.scheduleTime,
      resultsPerQuery: payload.resultsPerQuery,
      maxCompaniesPerRun: payload.maxCompaniesPerRun,
    },
    update: {
      targetIndustries: payload.targetIndustries,
      locations: payload.locations,
      companySize: payload.companySize,
      autoStartOutreach: payload.autoStartOutreach,
      scheduleDays: payload.scheduleDays,
      scheduleTime: payload.scheduleTime,
      resultsPerQuery: payload.resultsPerQuery,
      maxCompaniesPerRun: payload.maxCompaniesPerRun,
    },
  });

  revalidatePath("/autopilot");
  revalidatePath("/radar");

  return { ok: true };
}

export async function loadRadarSettingsPayloadForWorkspace(
  workspaceId: string,
): Promise<RadarSettingsPayload> {
  const record = await prisma.radarSettings.findUnique({
    where: { workspaceId },
  });

  if (!record) {
    return toRadarSettingsPayload({
      targetIndustries: DEFAULT_RADAR_INDUSTRIES,
      locations: joinCommaSeparatedInput(DEFAULT_RADAR_LOCATIONS),
      companySize: "any",
      autoStartOutreach: false,
      scheduleDays: [1, 4],
      scheduleTime: "03:00",
      resultsPerQuery: 8,
      maxCompaniesPerRun: 50,
    });
  }

  return toRadarSettingsPayload(record);
}
