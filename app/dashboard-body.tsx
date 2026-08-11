import {
  getDashboardData,
  getDashboardFunnelStats,
} from "@/app/actions/dashboard";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export async function DashboardBody({ emailsSent }: { emailsSent: number }) {
  const [dashboardData, funnelInitialCounts] = await Promise.all([
    getDashboardData(),
    getDashboardFunnelStats(30),
  ]);
  const recentActivity = dashboardData.recentActivities.map((item) => ({
    id: item.id,
    companyName: item.companyName,
    leadStatus: item.leadStatus,
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : String(item.createdAt),
  }));
  const leadsCount = dashboardData.statusCounts.NEW;
  const totalLeads = Object.values(dashboardData.statusCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const activeDeals = Math.max(
    0,
    totalLeads - dashboardData.statusCounts.CLOSED_LOST,
  );
  const pipelineValue = dashboardData.totalValue;
  const attentionRows = dashboardData.attentionTasks;

  return (
    <DashboardOverview
      emailsSent={emailsSent}
      funnelInitialCounts={funnelInitialCounts}
      recentActivity={recentActivity}
      leadsCount={leadsCount}
      activeDeals={activeDeals}
      pipelineValue={pipelineValue}
      attentionRows={attentionRows}
    />
  );
}
