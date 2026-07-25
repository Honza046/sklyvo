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
  minCompaniesPerRun: number;
  maxCompaniesPerRun: number;
};

export type FullAutoSettingsFormData = {
  enabled: boolean;
  fullAutoFrequency: "once_weekly" | "twice_weekly" | "daily";
  fullAutoRunTime: string;
};

export type RadarSettingsView = RadarSettingsFormData;

function formToPayload(form: RadarSettingsFormData): RadarSettingsPayload {
  const maxCompaniesPerRun = Math.max(1, form.maxCompaniesPerRun || 50);
  const minCompaniesPerRun = Math.max(
    1,
    Math.min(form.minCompaniesPerRun || 20, maxCompaniesPerRun),
  );
  return {
    targetIndustries: parseCommaSeparatedInput(form.targetIndustries),
    locations: form.locations.trim(),
    companySize: form.companySize,
    autoStartOutreach: form.autoStartOutreach,
    scheduleDays: form.radarDays,
    scheduleTime: form.radarRunTime,
    // Dřív hardcode 8 → málo firem; teď dost na naplnění denního cíle.
    resultsPerQuery: 20,
    minCompaniesPerRun,
    maxCompaniesPerRun,
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
    minCompaniesPerRun: record.minCompaniesPerRun,
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
        minCompaniesPerRun: 20,
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
      minCompaniesPerRun: payload.minCompaniesPerRun,
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
      minCompaniesPerRun: payload.minCompaniesPerRun,
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
      resultsPerQuery: 20,
      minCompaniesPerRun: 20,
      maxCompaniesPerRun: 50,
    });
  }

  return toRadarSettingsPayload(record);
}

export async function getFullAutoSettings(): Promise<
  { settings: FullAutoSettingsFormData } | { error: string }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const record = await prisma.radarSettings.findUnique({
    where: { workspaceId },
    select: {
      fullAutoEnabled: true,
      fullAutoFrequency: true,
      fullAutoRunTime: true,
    },
  });

  const freq = record?.fullAutoFrequency;
  const fullAutoFrequency =
    freq === "once_weekly" || freq === "twice_weekly" || freq === "daily"
      ? freq
      : "twice_weekly";

  return {
    settings: {
      enabled: record?.fullAutoEnabled ?? false,
      fullAutoFrequency,
      fullAutoRunTime: record?.fullAutoRunTime || "08:00",
    },
  };
}

export async function saveFullAutoSettings(
  form: FullAutoSettingsFormData,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const frequency =
    form.fullAutoFrequency === "once_weekly" ||
    form.fullAutoFrequency === "twice_weekly" ||
    form.fullAutoFrequency === "daily"
      ? form.fullAutoFrequency
      : "twice_weekly";

  const runTime = form.fullAutoRunTime.trim() || "08:00";

  await prisma.radarSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      fullAutoEnabled: form.enabled,
      fullAutoFrequency: frequency,
      fullAutoRunTime: runTime,
    },
    update: {
      fullAutoEnabled: form.enabled,
      fullAutoFrequency: frequency,
      fullAutoRunTime: runTime,
    },
  });

  revalidatePath("/autopilot");
  return { ok: true };
}

export async function setFullAutoEnabled(
  enabled: boolean,
): Promise<{ ok: true; enabled: boolean } | { error: string }> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  await prisma.radarSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      fullAutoEnabled: enabled,
      fullAutoFrequency: "twice_weekly",
      fullAutoRunTime: "08:00",
      autoStartOutreach: enabled,
      emailSendCronEnabled: enabled,
    },
    update: {
      fullAutoEnabled: enabled,
      ...(enabled
        ? { autoStartOutreach: true, emailSendCronEnabled: true }
        : {}),
    },
  });

  revalidatePath("/autopilot");
  return { ok: true, enabled };
}

export type AutopilotPowerFlags = {
  radarCronEnabled: boolean;
  emailSendCronEnabled: boolean;
  fullAutoEnabled: boolean;
};

export async function getAutopilotPowerFlags(): Promise<
  { flags: AutopilotPowerFlags } | { error: string }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const record = await prisma.radarSettings.findUnique({
    where: { workspaceId },
    select: {
      radarCronEnabled: true,
      emailSendCronEnabled: true,
      fullAutoEnabled: true,
    },
  });

  return {
    flags: {
      radarCronEnabled: record?.radarCronEnabled ?? true,
      emailSendCronEnabled: record?.emailSendCronEnabled ?? false,
      fullAutoEnabled: record?.fullAutoEnabled ?? false,
    },
  };
}

export async function setRadarCronEnabled(
  enabled: boolean,
): Promise<{ ok: true; enabled: boolean } | { error: string }> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  await prisma.radarSettings.upsert({
    where: { workspaceId },
    create: { workspaceId, radarCronEnabled: enabled },
    update: { radarCronEnabled: enabled },
  });

  revalidatePath("/autopilot");
  return { ok: true, enabled };
}

export async function setEmailSendCronEnabled(
  enabled: boolean,
): Promise<{ ok: true; enabled: boolean } | { error: string }> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  await prisma.radarSettings.upsert({
    where: { workspaceId },
    create: { workspaceId, emailSendCronEnabled: enabled },
    update: { emailSendCronEnabled: enabled },
  });

  revalidatePath("/autopilot");
  return { ok: true, enabled };
}
