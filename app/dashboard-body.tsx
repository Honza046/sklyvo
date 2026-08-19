import {
  getDashboardData,
  getDashboardFunnelStats,
  getDashboardTodayStats,
  getDashboardChartSeries,
  getDashboardGeoStats,
} from "@/app/actions/dashboard";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export async function DashboardBody() {
  const [
    dashboardData,
    funnelInitialCounts,
    todayStats,
    chartSeries,
    geoStats,
  ] = await Promise.all([
    getDashboardData(),
    getDashboardFunnelStats(30),
    getDashboardTodayStats(),
    getDashboardChartSeries(30),
    getDashboardGeoStats(),
  ]);
  const { overviewStats } = dashboardData;

  return (
    <DashboardOverview
      funnelInitialCounts={funnelInitialCounts}
      newCompanies={overviewStats.newCompanies}
      emailsSent={overviewStats.emailsSent}
      totalLeadsInCrm={overviewStats.totalLeadsInCrm}
      queueCount={overviewStats.queueCount}
      todayStats={todayStats}
      chartSeries={chartSeries}
      geoStats={geoStats}
    />
  );
}
