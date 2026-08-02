"use client";

import Link from "next/link";
import type { LeadStatus } from "@/app/actions/dashboard";
import { DashboardConversionFunnel } from "@/components/dashboard-conversion-funnel";
import { Button } from "@/components/ui/button";
import {
  Users,
  Mail,
  Target,
  ArrowRight,
  Activity,
  Zap,
  Clock,
  MessageCircleWarning,
  ClipboardList,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";

type DashboardActivityItem = {
  id: string;
  companyName: string;
  leadStatus: LeadStatus;
  updatedAt: Date;
  createdAt: Date;
};

type AttentionTask = {
  id: string;
  companyName: string;
  status: LeadStatus;
};

const DASHBOARD_PANEL_CARD =
  "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:gap-4 sm:p-4";

const DASHBOARD_PANEL_LIST_SCROLL =
  "min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export type DashboardBodyViewProps = {
  emailsSent: number;
  funnelInitialCounts: Record<LeadStatus, number>;
  recentActivity: DashboardActivityItem[];
  leadsCount: number;
  activeDeals: number;
  pipelineValue: number;
  attentionRows: AttentionTask[];
};

function AttentionTaskIcon({ status }: { status: LeadStatus }) {
  if (status === "NEW") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <Clock className="h-4 w-4" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
      <MessageCircleWarning className="h-4 w-4" />
    </div>
  );
}

export function DashboardBodyView({
  emailsSent,
  funnelInitialCounts,
  recentActivity,
  leadsCount,
  activeDeals,
  pipelineValue,
  attentionRows,
}: DashboardBodyViewProps) {
  const { t, language } = useLanguage();
  const dateLocale = DATE_LOCALE[language];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatActivityTime = (date: Date) => {
    const now = new Date();
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return t("dashboard.timeNow");
    if (date.toDateString() === now.toDateString()) {
      const time = new Intl.DateTimeFormat(dateLocale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
      return t("dashboard.timeToday", { time });
    }
    if (minutes < 60) return t("dashboard.timeMinutesAgo", { minutes });
    if (hours < 24) return t("dashboard.timeHoursAgo", { hours });
    if (days < 7) return t("dashboard.timeDaysAgo", { days });

    return new Intl.DateTimeFormat(dateLocale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const attentionTaskSubtitle = (status: LeadStatus) =>
    status === "NEW" ? t("dashboard.attentionNewLead") : t("dashboard.attentionReplied");

  return (
    <div className="scrollbar-hide flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto sm:gap-3 lg:overflow-hidden">
      <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 sm:rounded-lg sm:p-2">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              {t("dashboard.statsNewLeads")}
            </h3>
          </div>
          <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">{leadsCount}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 sm:rounded-lg sm:p-2">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              {t("dashboard.statsEmailsSent")}
            </h3>
          </div>
          <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">{emailsSent}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 sm:rounded-lg sm:p-2">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              {t("dashboard.statsActiveDeals")}
            </h3>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-base font-bold tabular-nums text-foreground sm:text-xl">{activeDeals}</p>
            <p className="mb-0.5 shrink-0 text-right text-[9px] font-medium leading-tight text-muted-foreground sm:text-[10px]">
              {t("dashboard.statsInCrm")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-sm transition-all hover:border-blue-200 group dark:hover:border-blue-800 sm:rounded-2xl sm:p-4">
          <div className="mb-1 flex items-center gap-1.5 sm:mb-1.5 sm:gap-2">
            <div className="rounded-md bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 sm:rounded-lg sm:p-2">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-widest">
              {t("dashboard.statsPipelineValue")}
            </h3>
          </div>
          <p className="text-base font-bold tabular-nums leading-tight text-foreground sm:text-xl">
            {formatCurrency(pipelineValue)}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 pb-1 lg:grid-cols-3 lg:gap-4 lg:overflow-hidden lg:pb-0">
        <div className="contents lg:col-span-2 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-3">
          <div className="order-1 shrink-0 lg:order-none">
            <DashboardConversionFunnel initialCounts={funnelInitialCounts} />
          </div>

          <div className={`order-3 max-h-[260px] lg:order-none lg:max-h-none ${DASHBOARD_PANEL_CARD}`}>
            <div className="flex shrink-0 items-center justify-between gap-3">
              <h3 className="m-0 shrink-0 font-semibold text-foreground">{t("dashboard.activityTitle")}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">
                {recentActivity.length > 0
                  ? t("dashboard.activityRecent", { count: recentActivity.length })
                  : t("dashboard.activityPeriod")}
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-border/40 bg-muted/30 p-6 text-center dark:bg-muted/20">
                <h4 className="mb-2 m-0 text-base font-semibold text-foreground">
                  {t("dashboard.activityEmptyTitle")}
                </h4>
                <p className="m-0 text-sm text-muted-foreground">{t("dashboard.activityEmptyDesc")}</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border/40 bg-muted/20 dark:bg-muted/15">
                <div className={DASHBOARD_PANEL_LIST_SCROLL}>
                  <ul className="divide-y divide-border/50">
                    {recentActivity.map((item) => (
                      <li key={item.id} className="px-4 py-3">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {t("dashboard.activityNewLead")}{" "}
                          <Link
                            href="/crm"
                            className="font-semibold text-foreground underline-offset-4 hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                          >
                            {item.companyName}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatActivityTime(item.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="contents lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-3">
          <div className="order-2 flex shrink-0 flex-col rounded-2xl border border-border/60 bg-card p-3 shadow-sm md:p-4 lg:order-none">
            <h2 className="mb-2 shrink-0 text-base font-bold">{t("dashboard.quickActions")}</h2>

            <div className="flex shrink-0 flex-col gap-2">
              <Link
                href="/radar"
                className="group flex items-center justify-between rounded-xl border border-border/60 bg-background p-2.5 transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-800"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-transform group-hover:scale-110 dark:bg-blue-900/30 dark:text-blue-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{t("dashboard.quickRadarTitle")}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {t("dashboard.quickRadarDesc")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 translate-x-0 text-muted-foreground transition-colors group-hover:translate-x-1 group-hover:text-blue-600" />
              </Link>

              <Link
                href="/sniper"
                className="group flex items-center justify-between rounded-xl border border-border/60 bg-background p-2.5 transition-all hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-800"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{t("dashboard.quickSniperTitle")}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {t("dashboard.quickSniperDesc")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 translate-x-0 text-muted-foreground transition-colors group-hover:translate-x-1 group-hover:text-emerald-600" />
              </Link>
            </div>
          </div>

          <div className={`order-4 mb-1 max-h-[280px] lg:order-none lg:mb-0 lg:max-h-none ${DASHBOARD_PANEL_CARD}`}>
            <h3 className="shrink-0 font-semibold text-foreground">{t("dashboard.attentionTitle")}</h3>
            <div className={DASHBOARD_PANEL_LIST_SCROLL}>
              {attentionRows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
                  <div className="rounded-full bg-muted p-4 text-muted-foreground">
                    <ClipboardList className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t("dashboard.attentionEmptyTitle")}
                    </p>
                    <p className="max-w-[260px] text-xs text-muted-foreground">
                      {t("dashboard.attentionEmptyDesc")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0">
                  {attentionRows.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between border-b border-border/40 p-3 transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <AttentionTaskIcon status={task.status} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{task.companyName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {attentionTaskSubtitle(task.status)}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <Link href="/crm">{t("common.resolve")}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
