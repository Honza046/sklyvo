/**
 * Cron job runners — NOT server actions. Only call from /api/cron/* with CRON_SECRET.
 */
import { prisma } from "@/lib/prisma";
import { createInternalWorkspaceToken } from "@/lib/internal-auth";
import { runAutomatedRadarForWorkspace } from "@/app/actions/radar";

function getPragueParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[get("weekday")] ?? now.getDay();
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const y = get("year");
  const m = get("month");
  const d = get("day");
  return {
    weekday,
    minutesOfDay: hour * 60 + minute,
    dateKey: `${y}-${m}-${d}`,
  };
}

const FULL_AUTO_DAYS: Record<string, number[]> = {
  once_weekly: [1],
  twice_weekly: [1, 4],
  daily: [1, 2, 3, 4, 5],
};

export async function processScheduledRadarRuns(): Promise<{
  ok: true;
  checked: number;
  ran: number;
  results: Array<{
    workspaceId: string;
    createdCount?: number;
    creditsCharged?: number;
    error?: string;
  }>;
}> {
  const { weekday, dateKey } = getPragueParts();
  const settings = await prisma.radarSettings.findMany({
    where: { radarCronEnabled: true },
    select: {
      workspaceId: true,
      scheduleDays: true,
      scheduleTime: true,
      lastScheduledRunAt: true,
    },
  });

  const results: Array<{
    workspaceId: string;
    createdCount?: number;
    creditsCharged?: number;
    error?: string;
  }> = [];
  let ran = 0;

  for (const row of settings) {
    const days = row.scheduleDays?.length ? row.scheduleDays : [1, 4];
    if (!days.includes(weekday)) continue;

    if (row.lastScheduledRunAt) {
      const last = getPragueParts(row.lastScheduledRunAt);
      if (last.dateKey === dateKey) continue;
    }

    const run = await runAutomatedRadarForWorkspace(row.workspaceId, {
      internalToken: createInternalWorkspaceToken(row.workspaceId),
    });
    if ("error" in run) {
      results.push({ workspaceId: row.workspaceId, error: run.error });
      continue;
    }

    await prisma.radarSettings.update({
      where: { workspaceId: row.workspaceId },
      data: { lastScheduledRunAt: new Date() },
    });

    ran += 1;
    results.push({
      workspaceId: row.workspaceId,
      createdCount: run.createdCount,
      creditsCharged: run.creditsCharged,
    });
  }

  return { ok: true, checked: settings.length, ran, results };
}

export async function processScheduledFullAutoRuns(): Promise<{
  ok: true;
  checked: number;
  ran: number;
  results: Array<{
    workspaceId: string;
    createdCount?: number;
    outreachQueued?: number;
    emailsSent?: number;
    error?: string;
  }>;
}> {
  const { weekday, dateKey } = getPragueParts();
  const settings = await prisma.radarSettings.findMany({
    where: { fullAutoEnabled: true },
    select: {
      workspaceId: true,
      fullAutoFrequency: true,
      lastFullAutoRunAt: true,
    },
  });

  const results: Array<{
    workspaceId: string;
    createdCount?: number;
    outreachQueued?: number;
    emailsSent?: number;
    error?: string;
  }> = [];
  let ran = 0;

  for (const row of settings) {
    const freq = row.fullAutoFrequency || "twice_weekly";
    const days = FULL_AUTO_DAYS[freq] ?? FULL_AUTO_DAYS.twice_weekly;
    if (!days.includes(weekday)) continue;

    if (row.lastFullAutoRunAt) {
      const last = getPragueParts(row.lastFullAutoRunAt);
      if (last.dateKey === dateKey) continue;
    }

    const wsToken = createInternalWorkspaceToken(row.workspaceId);
    const run = await runAutomatedRadarForWorkspace(row.workspaceId, {
      forceAutoStartOutreach: true,
      leadSource: "FULL_AUTO",
      internalToken: wsToken,
    });
    if ("error" in run) {
      results.push({ workspaceId: row.workspaceId, error: run.error });
      continue;
    }

    const { processEmailQueue } = await import("@/app/actions/autopilot");
    const send = await processEmailQueue(50, {
      workspaceId: row.workspaceId,
      ignoreSchedule: true,
      internalToken: wsToken,
    });

    await prisma.radarSettings.update({
      where: { workspaceId: row.workspaceId },
      data: { lastFullAutoRunAt: new Date() },
    });

    ran += 1;
    results.push({
      workspaceId: row.workspaceId,
      createdCount: run.createdCount,
      outreachQueued: run.outreachQueued,
      emailsSent: send.sent,
    });
  }

  return { ok: true, checked: settings.length, ran, results };
}
