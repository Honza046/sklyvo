"use client";

import Link from "next/link";
import type { LeadStatus } from "@/app/actions/dashboard";
import { DashboardConversionFunnel } from "@/components/dashboard-conversion-funnel";
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
  createdAt: string;
};

type AttentionTask = {
  id: string;
  companyName: string;
  status: LeadStatus;
};

const CZK_PER_USD = 23;

function AttentionTaskIcon({ status }: { status: LeadStatus }) {
  if (status === "NEW") {
    return (
      <span className="sk-list__icon">
        <Clock className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span className="sk-list__icon sk-list__icon--alert">
      <MessageCircleWarning className="h-3.5 w-3.5" />
    </span>
  );
}

export type DashboardOverviewProps = {
  emailsSent: number;
  funnelInitialCounts: Record<LeadStatus, number>;
  recentActivity: DashboardActivityItem[];
  leadsCount: number;
  activeDeals: number;
  pipelineValue: number;
  attentionRows: AttentionTask[];
};

export function DashboardOverview({
  emailsSent,
  funnelInitialCounts,
  recentActivity,
  leadsCount,
  activeDeals,
  pipelineValue,
  attentionRows,
}: DashboardOverviewProps) {
  const { t, language } = useLanguage();
  const dateLocale = DATE_LOCALE[language] || "cs-CZ";
  const useUsd = language === "en";

  const formatCurrency = (amount: number) => {
    if (useUsd) {
      const usd = Math.round(amount / CZK_PER_USD);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(usd);
    }
    return new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatActivityTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (Number.isNaN(date.getTime()) || minutes < 1) {
      return t("dashboard.timeNow");
    }
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
    status === "NEW"
      ? t("dashboard.attentionNewLead")
      : t("dashboard.attentionReplied");

  return (
    <div className="sk-dashboard-scroll scrollbar-hide flex min-h-0 w-full flex-1 flex-col gap-2 md:gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4 lg:gap-3">
        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Target />
            </div>
            <h3 className="sk-stat__label">{t("dashboard.statsNewLeads")}</h3>
          </div>
          <p className="sk-stat__value">{leadsCount}</p>
        </div>

        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Mail />
            </div>
            <h3 className="sk-stat__label">{t("dashboard.statsEmailsSent")}</h3>
          </div>
          <p className="sk-stat__value">{emailsSent}</p>
        </div>

        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Users />
            </div>
            <h3 className="sk-stat__label">{t("dashboard.statsActiveDeals")}</h3>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="sk-stat__value">{activeDeals}</p>
            <p className="sk-stat__suffix">{t("dashboard.statsInCrm")}</p>
          </div>
        </div>

        <div className="sk-stat">
          <div className="mb-0.5 flex items-center gap-1.5">
            <div className="sk-chip">
              <Activity />
            </div>
            <h3 className="sk-stat__label">
              {t("dashboard.statsPipelineValue")}
            </h3>
          </div>
          <p className="sk-stat__value leading-tight">
            {formatCurrency(pipelineValue)}
          </p>
        </div>
      </div>

      <div className="sk-overview-grid">
        <div className="sk-overview-grid__left">
          <div className="shrink-0">
            <DashboardConversionFunnel initialCounts={funnelInitialCounts} />
          </div>

          <div className="sk-surface sk-panel-bottom flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h3 className="sk-type-h3 m-0">{t("dashboard.activityTitle")}</h3>
              <span className="sk-type-small">
                {recentActivity.length > 0
                  ? t("dashboard.activityRecent", {
                      count: recentActivity.length,
                    })
                  : t("dashboard.activityPeriod")}
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="sk-surface--empty flex-1">
                <h4 className="sk-type-h3 mb-1 sm:mb-2">
                  {t("dashboard.activityEmptyTitle")}
                </h4>
                <p className="sk-type-body">
                  {t("dashboard.activityEmptyDesc")}
                </p>
              </div>
            ) : (
              <ul className="sk-list sk-panel-bottom__scroll scrollbar-hide">
                {recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="sk-list__row sk-list__row--activity"
                  >
                    <p className="sk-list__title m-0 leading-snug">
                      {t("dashboard.activityNewLead")}{" "}
                      <Link
                        href="/crm"
                        className="sk-link-brand font-semibold underline-offset-4 hover:underline"
                      >
                        {item.companyName}
                      </Link>
                    </p>
                    <p className="sk-list__meta m-0 mt-1">
                      {formatActivityTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="sk-overview-grid__right">
          <div className="sk-surface sk-surface--pad flex shrink-0 grow-0 flex-col">
            <h2 className="sk-type-h3 mb-1.5 shrink-0 sm:mb-2">
              {t("dashboard.quickActions")}
            </h2>
            <div className="flex shrink-0 flex-col gap-2.5">
              <Link href="/radar" className="sk-action-row group">
                <span className="sk-action-row__icon sk-action-row__icon--dark">
                  <Zap className="h-4 w-4" />
                </span>
                <span className="sk-action-row__body">
                  <span className="sk-action-row__title">
                    {t("dashboard.quickRadarTitle")}
                  </span>
                  <span className="sk-action-row__meta">
                    {t("dashboard.quickRadarDesc")}
                  </span>
                </span>
                <span className="sk-action-row__go">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link href="/sniper" className="sk-action-row group">
                <span className="sk-action-row__icon">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="sk-action-row__body">
                  <span className="sk-action-row__title">
                    {t("dashboard.quickSniperTitle")}
                  </span>
                  <span className="sk-action-row__meta">
                    {t("dashboard.quickSniperDesc")}
                  </span>
                </span>
                <span className="sk-action-row__go">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          <div className="sk-surface sk-panel-bottom flex min-h-0 flex-1 flex-col overflow-hidden">
            <h3 className="sk-type-h3 mb-2 shrink-0">
              {t("dashboard.attentionTitle")}
            </h3>
            <div className="sk-panel-bottom__scroll scrollbar-hide">
              {attentionRows.length === 0 ? (
                <div className="sk-surface--empty">
                  <div className="sk-list__icon sk-list__icon--lg">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="sk-type-h3">
                      {t("dashboard.attentionEmptyTitle")}
                    </p>
                    <p className="sk-type-small max-w-[260px]">
                      {t("dashboard.attentionEmptyDesc")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="sk-list">
                  {attentionRows.map((task) => (
                    <div key={task.id} className="sk-list__row">
                      <AttentionTaskIcon status={task.status} />
                      <div className="sk-list__body">
                        <div className="sk-list__title">{task.companyName}</div>
                        <div className="sk-list__meta">
                          {attentionTaskSubtitle(task.status)}
                        </div>
                      </div>
                      <Link href="/crm" className="sk-list__action">
                        {t("common.resolve")}
                      </Link>
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
