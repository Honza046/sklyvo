"use server";

import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export type LeadStatus = "NEW" | "CONTACTED" | "REPLIED" | "MEETING_SET" | "CLOSED_WON" | "CLOSED_LOST";

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

type DashboardData = {
  statusCounts: Record<LeadStatus, number>;
  recentActivities: DashboardLeadActivity[];
  attentionTasks: DashboardAttentionLead[];
  totalValue: number;
};

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

  if (!workspaceId) {
    return {
      statusCounts: emptyCounts,
      recentActivities: [],
      attentionTasks: [],
      totalValue: 0,
    };
  }

  const [groupedCounts, recentActivities, valueAggregate, repliedLeadsRaw] = await Promise.all([
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
    prisma.lead.aggregate({
      where: { workspaceId },
      _sum: { value: true },
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
  ]);

  const ATTENTION_TASK_LIMIT = 8;

  let attentionTasks: DashboardAttentionLead[] = repliedLeadsRaw.map((item) => ({
    id: item.id,
    companyName: item.companyName,
    status: item.status as LeadStatus,
  }));

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

  const statusCounts = groupedCounts.reduce((acc, item) => {
    acc[item.status as LeadStatus] = item._count._all;
    return acc;
  }, { ...emptyCounts });

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
    totalValue: valueAggregate._sum.value ?? 0,
  };
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
export async function getDashboardFunnelStats(days: number): Promise<Record<LeadStatus, number>> {
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
