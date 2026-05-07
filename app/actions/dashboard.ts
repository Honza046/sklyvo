"use server";

import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

type LeadStatus = "NEW" | "CONTACTED" | "REPLIED" | "MEETING_SET" | "CLOSED_WON" | "CLOSED_LOST";

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
      take: 3,
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
      take: 3,
      select: {
        id: true,
        companyName: true,
        status: true,
      },
    }),
  ]);

  let attentionTasks: DashboardAttentionLead[] = repliedLeadsRaw.map((item) => ({
    id: item.id,
    companyName: item.companyName,
    status: item.status as LeadStatus,
  }));

  const fillCount = Math.max(0, 3 - attentionTasks.length);
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
