"use client";

import React, { useEffect, useLayoutEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { LeadStatus } from "@/app/actions/dashboard";
import {
  getDashboardChartSeries,
  getDashboardOverviewStats,
  type DashboardTodayStats,
  type DashboardChartPoint,
  type DashboardGeoStat,
} from "@/app/actions/dashboard";
import { DashboardConversionFunnel } from "@/components/dashboard-conversion-funnel";
import { useDashboardRange } from "@/components/dashboard/dashboard-range-context";
import { RADAR_COUNTRY_OPTIONS } from "@/lib/country-language";
import { RocketIcon, BotGlyphIcon } from "@/components/sklyvo/nav-icons";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

const COUNTRY_LABEL_BY_CODE = new Map(
  RADAR_COUNTRY_OPTIONS.map((c) => [c.code.toUpperCase(), c.label] as const),
);

/** Visual placeholder when workspace has no country breakdown yet — matches Matej mockup. */
const GEO_DEMO_ROWS = [
  { label: "Praha a Střední Čechy", pct: 42 },
  { label: "Morava a Slezsko", pct: 23 },
  { label: "Německo a Rakousko", pct: 18 },
  { label: "Ostatní", pct: 17 },
] as const;

import { GeoHeatMap } from "@/components/sklyvo/geo-heat-map";
import {
  AnimatedMetricValue,
} from "@/components/dashboard/animated-metric-value";

export type DashboardOverviewProps = {
  funnelInitialCounts: Record<LeadStatus, number>;
  newCompanies: number;
  emailsSent: number;
  totalLeadsInCrm: number;
  queueCount: number;
  todayStats: DashboardTodayStats;
  chartSeries: DashboardChartPoint[];
  geoStats: DashboardGeoStat[];
};

const OVERVIEW_ANIM_MS = 900;
const CHART_DRAW_MS = 1500;
const CHART_ANIM_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CHART_REPLIED_DELAY_MS = 0;
const CHART_REPLIED_DRAW_MS = CHART_DRAW_MS;

const CZ_MONTHS_SHORT = [
  "led",
  "úno",
  "bře",
  "dub",
  "kvě",
  "čvn",
  "čvc",
  "srp",
  "zář",
  "říj",
  "lis",
  "pro",
] as const;

function parseChartDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

type ChartAxisLabelMode = "day" | "dayMonth" | "month" | "monthYear";

function getChartAxisLabelMode(series: DashboardChartPoint[]): ChartAxisLabelMode {
  if (series.length < 2) return "dayMonth";

  const first = parseChartDate(series[0].date);
  const last = parseChartDate(series[series.length - 1].date);
  const spanDays =
    Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;
  const sameMonth =
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear();

  if (spanDays <= 10 && sameMonth) return "day";
  if (spanDays <= 62) return "dayMonth";
  if (spanDays <= 365) return "month";
  return "monthYear";
}

function formatChartAxisLabel(
  isoDate: string,
  mode: ChartAxisLabelMode,
): string {
  const d = parseChartDate(isoDate);
  const day = d.getDate();
  const month = d.getMonth() + 1;

  switch (mode) {
    case "day":
      return `${day}.`;
    case "dayMonth":
      return `${day}. ${month}.`;
    case "month":
      return CZ_MONTHS_SHORT[d.getMonth()];
    case "monthYear":
      return `${CZ_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  }
}

function buildChartAxisLabels(
  series: DashboardChartPoint[],
  stepX: number,
): Array<{
  x: number;
  text: string;
  i: number;
  anchor: "start" | "middle" | "end";
}> {
  const maxLabels = 7;
  const labelMode = getChartAxisLabelMode(series);
  const indices = new Set<number>([0, series.length - 1]);
  const step = Math.max(1, Math.ceil(series.length / maxLabels));

  for (let i = 0; i < series.length; i += step) {
    indices.add(i);
  }

  const sorted = Array.from(indices).sort((a, b) => a - b);

  return sorted.map((index, i) => ({
    x: index * stepX,
    text: formatChartAxisLabel(series[index].date, labelMode),
    i,
    anchor:
      index === 0 ? "start" : index === series.length - 1 ? "end" : "middle",
  }));
}

function buildEmptyChartAxisLabels(
  stepX: number,
): Array<{
  x: number;
  text: string;
  i: number;
  anchor: "start" | "middle" | "end";
}> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const points: DashboardChartPoint[] = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(today.getTime() - (7 - i) * 86_400_000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { date: `${y}-${m}-${day}`, sent: 0, replied: 0 };
  });

  return buildChartAxisLabels(points, stepX);
}

/** Sent/replied line chart from daily counts. */
function ChartSvg({
  series,
  play = true,
}: {
  series: DashboardChartPoint[];
  play?: boolean;
}) {
  const gradId = React.useId().replace(/:/g, "");
  const clipId = React.useId().replace(/:/g, "");
  const sentRef = React.useRef<SVGPathElement>(null);
  const repliedRef = React.useRef<SVGPathElement>(null);
  const [ready, setReady] = useState(false);
  const [repliedDashed, setRepliedDashed] = useState(false);
  const seriesKey = series
    .map((p) => `${p.date}:${p.sent}:${p.replied}`)
    .join("|");

  const width = 640;
  const chartH = 169;
  const labelH = 22;
  const totalH = chartH + labelH;
  const padY = 8;

  const hasData = series.length > 0;
  const maxSent = hasData ? Math.max(1, ...series.map((p) => p.sent)) : 1;
  const maxReplied = hasData ? Math.max(1, ...series.map((p) => p.replied)) : 1;
  const max = Math.max(maxSent, maxReplied) * 1.16;
  const stepX =
    series.length > 1 ? width / (series.length - 1) : width;

  const toY = (v: number) =>
    chartH - padY - (v / max) * (chartH - padY * 2);

  const sentPoints = hasData
    ? series.map((p, i) => [i * stepX, toY(p.sent)] as const)
    : Array.from({ length: 8 }, (_, i) => [i * (width / 7), chartH - padY] as const);
  const repliedPoints = hasData
    ? series.map((p, i) => [i * stepX, toY(p.replied)] as const)
    : sentPoints;

  const sentPath = sentPoints
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const repliedPath = repliedPoints
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${sentPath} L${width},${chartH} L0,${chartH} Z`;

  React.useLayoutEffect(() => {
    if (!play) {
      setReady(true);
      setRepliedDashed(true);
      return;
    }

    setReady(false);
    setRepliedDashed(false);

    const frame = requestAnimationFrame(() => setReady(true));
    const dashedTimer = window.setTimeout(
      () => setRepliedDashed(true),
      CHART_REPLIED_DELAY_MS + CHART_REPLIED_DRAW_MS + 40,
    );

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(dashedTimer);
    };
  }, [seriesKey, sentPath, repliedPath, play]);

  const labels = hasData
    ? buildChartAxisLabels(series, stepX)
    : buildEmptyChartAxisLabels(stepX);

  return (
    <svg
      viewBox={`0 0 ${width} ${totalH}`}
      className={cn(
        "sk-chart-panel__svg",
        ready && "is-ready",
        !ready && "is-loading",
      )}
      style={
        {
          "--sk-chart-anim-ms": play ? `${CHART_DRAW_MS}ms` : "0ms",
          "--sk-chart-anim-ease": CHART_ANIM_EASE,
        } as React.CSSProperties
      }
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#02a7ff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#02a7ff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect
            className="sk-chart-panel__clip-rect"
            x="0"
            y="0"
            width={width}
            height={chartH}
          />
        </clipPath>
      </defs>
      <line x1="0" y1={chartH * 0.33} x2={width} y2={chartH * 0.33} stroke="rgba(255,255,255,0.06)" />
      <line x1="0" y1={chartH * 0.66} x2={width} y2={chartH * 0.66} stroke="rgba(255,255,255,0.06)" />
      <line x1="0" y1={chartH} x2={width} y2={chartH} stroke="rgba(255,255,255,0.09)" />
      <g clipPath={`url(#${clipId})`}>
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
          className="sk-chart-panel__area"
        />
        <path
          ref={sentRef}
          d={sentPath}
          fill="none"
          stroke="#02a7ff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sk-chart-panel__line sk-chart-panel__line--sent"
        />
        <path
          ref={repliedRef}
          d={repliedPath}
          fill="none"
          stroke="#34d399"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "sk-chart-panel__line sk-chart-panel__line--replied",
            repliedDashed && "is-dashed",
          )}
        />
      </g>
      {labels.map((l) => (
        <text
          key={`${l.x}-${l.text}`}
          x={l.x}
          y={chartH + 16}
          fill="rgba(255,255,255,0.38)"
          fontSize="11"
          fontWeight="600"
          textAnchor={l.anchor}
          className="sk-chart-panel__label"
          style={{ "--label-i": l.i } as React.CSSProperties}
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}

export function DashboardOverview({
  funnelInitialCounts,
  newCompanies: initialNewCompanies,
  emailsSent: initialEmailsSent,
  totalLeadsInCrm: initialTotalLeadsInCrm,
  queueCount,
  todayStats,
  chartSeries: chartInitialSeries,
  geoStats,
}: DashboardOverviewProps) {
  const { t } = useLanguage();
  const { days, periodLabelKey } = useDashboardRange();
  const [newCompanies, setNewCompanies] = useState(initialNewCompanies);
  const [emailsSent, setEmailsSent] = useState(initialEmailsSent);
  const [totalLeadsInCrm, setTotalLeadsInCrm] = useState(initialTotalLeadsInCrm);
  const [chartSeries, setChartSeries] =
    useState<DashboardChartPoint[]>(chartInitialSeries);
  const [metricsPending, startMetricsTransition] = useTransition();
  const [chartPending, startChartTransition] = useTransition();

  useEffect(() => {
    startMetricsTransition(() => {
      void getDashboardOverviewStats(days).then((stats) => {
        setNewCompanies(stats.newCompanies);
        setEmailsSent(stats.emailsSent);
        setTotalLeadsInCrm(stats.totalLeadsInCrm);
      });
    });
  }, [days]);

  useEffect(() => {
    startChartTransition(() => {
      void getDashboardChartSeries(days).then(setChartSeries);
    });
  }, [days]);

  const chartTotalSent = chartSeries.reduce((sum, p) => sum + p.sent, 0);
  const chartTotalReplied = chartSeries.reduce((sum, p) => sum + p.replied, 0);
  const pipelineValue = 0;
  const chartRateDisplay =
    chartTotalSent > 0
      ? `${((chartTotalReplied / chartTotalSent) * 100).toFixed(1)} %`
      : "0.0 %";

  const geoTotal = geoStats.reduce((sum, g) => sum + g.count, 0);
  const geoLegendRows =
    geoStats.length > 0
      ? geoStats.map((g) => {
          const pct =
            geoTotal > 0 ? Math.round((g.count / geoTotal) * 100) : 0;
          const maxPct =
            geoTotal > 0
              ? Math.round((geoStats[0].count / geoTotal) * 100)
              : 0;
          const barWidth =
            maxPct > 0 ? Math.round((pct / maxPct) * 100) : 0;
          return {
            key: g.countryCode,
            name:
              COUNTRY_LABEL_BY_CODE.get(g.countryCode.toUpperCase()) ??
              g.countryCode,
            pct,
            barWidth,
          };
        })
      : GEO_DEMO_ROWS.map((row) => ({
          key: row.label,
          name: row.label,
          pct: row.pct,
          barWidth: Math.round((row.pct / GEO_DEMO_ROWS[0].pct) * 100),
        }));

  return (
    <div className="sk-dashboard-scroll scrollbar-hide flex min-h-0 w-full flex-1 flex-col gap-2 md:gap-3">
      <div className="sk-today-strip-wrap shrink-0">
        <div className="sk-today-strip">
          <div className="sk-today-strip__live">
            <span className="sk-today-strip__dot" aria-hidden />
            {t("dashboard.todayLabel")}
          </div>
          <div className="sk-today-strip__stat">
            <span className="sk-today-strip__num">{todayStats.sent}</span>
            <span className="sk-today-strip__label">
              {t("dashboard.todaySent")}
            </span>
          </div>
          <div className="sk-today-strip__stat">
            <span className="sk-today-strip__num">{todayStats.repliesNew}</span>
            <span className="sk-today-strip__label">
              {t("dashboard.todayReplies")}
            </span>
          </div>
          <div className="sk-today-strip__stat">
            <span className="sk-today-strip__num">{todayStats.scheduled}</span>
            <span className="sk-today-strip__label">
              {t("dashboard.todayScheduled")}
            </span>
          </div>
          <span className="sk-today-strip__peek" aria-hidden>
            <SklyvoMark
              size={58}
              interactive
              shadow={false}
              embed
              blend
              className="sk-today-strip__mark"
            />
          </span>
        </div>
      </div>

      <div
        className="sk-metrics-strip shrink-0"
        aria-busy={metricsPending}
      >
        <div className="sk-metrics-strip__cell">
          <div className="sk-metrics-strip__label">
            {t("dashboard.statsNewLeads")}
          </div>
          <div className="sk-metrics-strip__value">
            <AnimatedMetricValue value={newCompanies} delay={0} duration={OVERVIEW_ANIM_MS} />
          </div>
        </div>

        <div className="sk-metrics-strip__cell">
          <div className="sk-metrics-strip__label">
            {t("dashboard.statsEmailsSent")}
          </div>
          <div className="sk-metrics-strip__value">
            <AnimatedMetricValue value={emailsSent} delay={0} duration={OVERVIEW_ANIM_MS} />
          </div>
        </div>

        <div className="sk-metrics-strip__cell">
          <div className="sk-metrics-strip__label">
            {t("dashboard.statsDealsInCrm")}
          </div>
          <div className="sk-metrics-strip__value">
            <AnimatedMetricValue value={totalLeadsInCrm} delay={0} duration={OVERVIEW_ANIM_MS} />
            <span className="sk-metrics-strip__suffix">
              {t("dashboard.statsDealsInCrmSuffix")}
            </span>
          </div>
        </div>

        <div className="sk-metrics-strip__cell">
          <div className="sk-metrics-strip__label">
            {t("dashboard.statsPipelineValue")}
          </div>
          <div className="sk-metrics-strip__value">
            <AnimatedMetricValue value={pipelineValue} delay={0} duration={OVERVIEW_ANIM_MS} suffix=" Kč" />
            {pipelineValue > 0 ? (
              <span className="sk-metrics-strip__pipeline-change">
                <span className="sk-metrics-strip__pipeline-arrow" aria-hidden>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#062E20" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V6" /><path d="M6 12l6-6 6 6" />
                  </svg>
                </span>
                {t("dashboard.statsPipelineChange")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="sk-overview-grid min-h-0 flex-1">
        <div className="sk-overview-grid__left">
          <div className="sk-overview-funnel shrink-0">
            <DashboardConversionFunnel initialCounts={funnelInitialCounts} />
          </div>

          <div
            className="sk-chart-panel min-h-0 flex-1"
            aria-busy={chartPending}
          >
            <div className="sk-chart-panel__head">
              <h3 className="sk-type-h3 m-0">{t("dashboard.chartTitle")}</h3>
              <div className="sk-chart-panel__legend">
                <span className="sk-chart-panel__legend-item">
                  <span
                    className="sk-chart-panel__dot"
                    style={{ background: "#02a7ff" }}
                  />
                  {t("dashboard.chartSentLegend")}
                </span>
                <span className="sk-chart-panel__legend-item">
                  <span
                    className="sk-chart-panel__dot"
                    style={{ background: "#34d399" }}
                  />
                  {t("dashboard.chartRepliesLegend")}
                </span>
              </div>
              <span className="sk-funnel-period">{t(periodLabelKey)}</span>
            </div>
            <div className="sk-chart-panel__stats">
              <span className="sk-chart-panel__stat">
                <span className="sk-chart-panel__stat-value">{chartTotalSent}</span>
                <span className="sk-chart-panel__stat-label">
                  {t("dashboard.chartSentLegend")}
                </span>
              </span>
              <span className="sk-chart-panel__stat">
                <span className="sk-chart-panel__stat-value sk-chart-panel__stat-value--green">
                  {chartTotalReplied}
                </span>
                <span className="sk-chart-panel__stat-label">
                  {t("dashboard.chartRepliesLegend")}
                </span>
              </span>
              <span className="sk-chart-panel__stat">
                <span className="sk-chart-panel__stat-value">{chartRateDisplay}</span>
                <span className="sk-chart-panel__stat-label">
                  {t("dashboard.chartRateLegend")}
                </span>
              </span>
            </div>
            <div className="sk-chart-panel__plot">
              <ChartSvg series={chartSeries} play />
            </div>
          </div>
        </div>

        <div className="sk-overview-grid__right">
          <div className="sk-queue-panel">
            <div className="sk-queue-panel__head">
              <h3 className="sk-queue-panel__title">{t("dashboard.queueTitle")}</h3>
              <span className="sk-queue-panel__label">{t("dashboard.queueLabel")}</span>
            </div>
            <div className="sk-queue-panel__stat">
              <span className="sk-queue-panel__num">{queueCount}</span>
              <span className="sk-queue-panel__unit">{t("dashboard.queueUnit")}</span>
            </div>
            <div className="sk-queue-panel__actions">
              <Link href="/autopilot/sniper" className="sk-btn sk-btn--white sk-queue-panel__cta">
                <RocketIcon className="h-[13px] w-[13px]" aria-hidden />
                {t("dashboard.queueAutopilot")}
              </Link>
              <Link href="/sniper" className="sk-btn sk-btn--secondary sk-queue-panel__cta">
                {t("dashboard.queueSniper")}
              </Link>
              <Link href="/help" className="sk-queue-panel__bot">
                <BotGlyphIcon className="h-[15px] w-[15px]" aria-hidden />
                <span>
                  {t("dashboard.botHintQuestion")}{" "}
                  <strong>{t("dashboard.botHintAnswer")}</strong>
                </span>
              </Link>
            </div>
          </div>

          <div className="sk-geo-panel sk-geo-panel--map min-h-0 flex-1">
            <GeoHeatMap stats={geoStats} />
            <div className="sk-geo-map-veil" />
            <div className="sk-geo-panel__head">
              <h3 className="sk-type-h3 m-0">{t("dashboard.geoTitle")}</h3>
              <span className="sk-funnel-period">{t(periodLabelKey)}</span>
            </div>
            <div
              className="sk-geo-legend"
              data-demo={geoStats.length === 0 ? "" : undefined}
            >
              {geoLegendRows.map((row, i) => (
                <div key={row.key} className="sk-geo-legend__row">
                  <span className="sk-geo-legend__label">
                    <span
                      className="sk-geo-legend__dot"
                      style={{ opacity: 1 - i * 0.12 }}
                      aria-hidden
                    />
                    <span className="sk-geo-legend__name">{row.name}</span>
                  </span>
                  <span className="sk-geo-legend__track" aria-hidden>
                    <span
                      className="sk-geo-legend__fill"
                      style={{ width: `${row.barWidth}%` }}
                    />
                  </span>
                  <span className="sk-geo-legend__pct">{row.pct} %</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
