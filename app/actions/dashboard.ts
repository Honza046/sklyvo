"use server";

import { getSessionUser } from "@/app/actions/auth";
import { triggerWorkspaceEmailReplySync, workspaceHasEmailReplySync } from "@/lib/email-reply-sync";
import { prisma, runPrismaQuery } from "@/lib/prisma";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "MEETING_SET"
  | "CLOSED_WON"
  | "CLOSED_LOST";

type DashboardLeadActivity = {
  id: string;
  companyName: string;
  leadStatus: LeadStatus;
  updatedAt: Date;
  createdAt: Date;
};

export type DashboardAttentionLead = {
  id: string;
  companyName: string;
  status: LeadStatus;
};

export type DashboardOverviewStats = {
  /** Leady vytvořené ve zvoleném období. */
  newCompanies: number;
  /** Odeslané maily (EmailQueue SENT) ve zvoleném období. */
  emailsSent: number;
  /** Leady v CRM vytvořené ve zvoleném období. */
  totalLeadsInCrm: number;
  /** Leady ve stavu NEW — čekají na první oslovení. */
  queueCount: number;
};

type DashboardData = {
  statusCounts: Record<LeadStatus, number>;
  recentActivities: DashboardLeadActivity[];
  attentionTasks: DashboardAttentionLead[];
  overviewStats: DashboardOverviewStats;
};

const OVERVIEW_DAYS = 30;

export async function getDashboardData(): Promise<DashboardData> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;

  const emptyCounts: Record<LeadStatus, number> = {
    NEW: 0,
    CONTACTED: 0,
    REPLIED: 0,
    MEETING_SET: 0,
    CLOSED_WON: 0,
    CLOSED_LOST: 0,
  };

  const emptyOverview: DashboardOverviewStats = {
    newCompanies: 0,
    emailsSent: 0,
    totalLeadsInCrm: 0,
    queueCount: 0,
  };

  if (!workspaceId) {
    return {
      statusCounts: emptyCounts,
      recentActivities: [],
      attentionTasks: [],
      overviewStats: emptyOverview,
    };
  }

  const since = new Date(Date.now() - OVERVIEW_DAYS * 24 * 60 * 60 * 1000);

  const [
    groupedCounts,
    recentActivities,
    repliedLeadsRaw,
    newCompanies,
    emailsSent,
    totalLeadsInCrm,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        companyName: true,
        status: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.lead.findMany({
      where: { workspaceId, status: "REPLIED" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        companyName: true,
        status: true,
      },
    }),
    prisma.lead.count({
      where: { workspaceId, createdAt: { gte: since } },
    }),
    prisma.emailQueue.count({
      where: {
        status: "SENT",
        sentAt: { gte: since },
        lead: { workspaceId },
      },
    }),
    prisma.lead.count({
      where: { workspaceId },
    }),
  ]);

  const ATTENTION_TASK_LIMIT = 8;

  let attentionTasks: DashboardAttentionLead[] = repliedLeadsRaw.map(
    (item) => ({
      id: item.id,
      companyName: item.companyName,
      status: item.status as LeadStatus,
    }),
  );

  const fillCount = Math.max(0, ATTENTION_TASK_LIMIT - attentionTasks.length);
  if (fillCount > 0) {
    const freshLeads = await prisma.lead.findMany({
      where: { workspaceId, status: "NEW" },
      orderBy: { createdAt: "asc" },
      take: fillCount,
      select: { id: true, companyName: true, status: true },
    });
    attentionTasks = [
      ...attentionTasks,
      ...freshLeads.map((item) => ({
        id: item.id,
        companyName: item.companyName,
        status: item.status as LeadStatus,
      })),
    ];
  }

  const statusCounts = groupedCounts.reduce(
    (acc, item) => {
      acc[item.status as LeadStatus] = item._count._all;
      return acc;
    },
    { ...emptyCounts },
  );

  const queueCount = statusCounts.NEW;

  return {
    statusCounts,
    recentActivities: recentActivities.map((item) => ({
      id: item.id,
      companyName: item.companyName,
      leadStatus: item.status as LeadStatus,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
    })),
    attentionTasks,
    overviewStats: {
      newCompanies,
      emailsSent,
      totalLeadsInCrm,
      queueCount,
    },
  };
}

/** KPI lišta nahoře — nové leady, e-maily a CRM počty ve zvoleném období. */
export async function getDashboardOverviewStats(
  days: number,
): Promise<Pick<DashboardOverviewStats, "newCompanies" | "emailsSent" | "totalLeadsInCrm">> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  const empty = { newCompanies: 0, emailsSent: 0, totalLeadsInCrm: 0 };

  if (!workspaceId) return empty;

  const safeDays = Math.min(3650, Math.max(1, Math.floor(Number(days)) || 30));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const [newCompanies, emailsSent, totalLeadsInCrm] = await Promise.all([
    prisma.lead.count({
      where: { workspaceId, createdAt: { gte: since } },
    }),
    prisma.emailQueue.count({
      where: {
        status: "SENT",
        sentAt: { gte: since },
        lead: { workspaceId },
      },
    }),
    prisma.lead.count({
      where: { workspaceId, createdAt: { gte: since } },
    }),
  ]);

  return { newCompanies, emailsSent, totalLeadsInCrm };
}

export type DashboardTodayStats = {
  sent: number;
  repliesNew: number;
  scheduled: number;
};

/** Živá čísla za dnešní den (od půlnoci) — pro banner "DNES" na Přehledu. */
export async function getDashboardTodayStats(): Promise<DashboardTodayStats> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;

  if (!workspaceId) {
    return { sent: 0, repliesNew: 0, scheduled: 0 };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  triggerWorkspaceEmailReplySync(workspaceId);

  const replySyncActive = await workspaceHasEmailReplySync(workspaceId);

  const [sent, repliesNew, scheduled] = await Promise.all([
    prisma.emailQueue.count({
      where: {
        status: "SENT",
        sentAt: { gte: startOfDay, lt: endOfDay },
        lead: { workspaceId },
      },
    }),
    replySyncActive
      ? runPrismaQuery(() =>
          prisma.lead.count({
            where: {
              workspaceId,
              repliedAt: { gte: startOfDay, lt: endOfDay },
            },
          }),
        )
      : Promise.resolve(0),
    prisma.emailQueue.count({
      where: {
        status: "PENDING",
        scheduledAt: { gte: startOfDay, lt: endOfDay },
        lead: { workspaceId },
      },
    }),
  ]);

  return { sent, repliesNew, scheduled };
}

export type DashboardChartPoint = { date: string; sent: number; replied: number };

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Denní počty odeslaných e-mailů a nových odpovědí za posledních `days` dní (včetně dneška). */
export async function getDashboardChartSeries(
  days: number,
): Promise<DashboardChartPoint[]> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  const safeDays = Math.min(365, Math.max(1, Math.floor(Number(days)) || 7));

  if (!workspaceId) return [];

  const todayStart = startOfLocalDay(new Date());
  const since = new Date(todayStart.getTime() - (safeDays - 1) * 86400000);

  triggerWorkspaceEmailReplySync(workspaceId);

  const replySyncActive = await workspaceHasEmailReplySync(workspaceId);

  const [sentRows, repliedRows] = await Promise.all([
    prisma.emailQueue.findMany({
      where: { status: "SENT", sentAt: { gte: since }, lead: { workspaceId } },
      select: { sentAt: true },
    }),
    replySyncActive
      ? runPrismaQuery(() =>
          prisma.lead.findMany({
            where: { workspaceId, repliedAt: { gte: since, not: null } },
            select: { repliedAt: true },
          }),
        )
      : Promise.resolve([]),
  ]);

  const bucket = new Map<string, { sent: number; replied: number }>();
  for (let i = 0; i < safeDays; i += 1) {
    const d = new Date(since.getTime() + i * 86400000);
    bucket.set(localDateKey(d), { sent: 0, replied: 0 });
  }

  for (const row of sentRows) {
    if (!row.sentAt) continue;
    const key = localDateKey(row.sentAt);
    const entry = bucket.get(key);
    if (entry) entry.sent += 1;
  }
  for (const row of repliedRows) {
    if (!row.repliedAt) continue;
    const key = localDateKey(row.repliedAt);
    const entry = bucket.get(key);
    if (entry) entry.replied += 1;
  }

  return Array.from(bucket.entries()).map(([date, v]) => ({ date, ...v }));
}

export type DashboardGeoStat = { countryCode: string; count: number };

/** Rozložení leadů podle země (Lead.countryCode) — pro panel "Kde oslovujete nejvíc". */
export async function getDashboardGeoStats(): Promise<DashboardGeoStat[]> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) return [];

  const rows = await prisma.lead.groupBy({
    by: ["countryCode"],
    where: { workspaceId, countryCode: { not: null } },
    _count: { _all: true },
  });

  return rows
    .filter((r) => r.countryCode)
    .map((r) => ({ countryCode: r.countryCode as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

const EMPTY_FUNNEL_COUNTS: Record<LeadStatus, number> = {
  NEW: 0,
  CONTACTED: 0,
  REPLIED: 0,
  MEETING_SET: 0,
  CLOSED_WON: 0,
  CLOSED_LOST: 0,
};

/** Počty leadů podle stavu za posledních `days` dní (podle data vytvoření záznamu). */
export async function getDashboardFunnelStats(
  days: number,
): Promise<Record<LeadStatus, number>> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;

  if (!workspaceId) {
    return { ...EMPTY_FUNNEL_COUNTS };
  }

  const safeDays = Math.min(3650, Math.max(1, Math.floor(Number(days)) || 30));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const groupedCounts = await prisma.lead.groupBy({
    by: ["status"],
    where: {
      workspaceId,
      createdAt: { gte: since },
    },
    _count: { _all: true },
  });

  return groupedCounts.reduce(
    (acc, item) => {
      acc[item.status as LeadStatus] = item._count._all;
      return acc;
    },
    { ...EMPTY_FUNNEL_COUNTS },
  );
}
