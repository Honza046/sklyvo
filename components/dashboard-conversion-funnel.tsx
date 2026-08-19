"use client";

import { useEffect, useLayoutEffect, useState, useTransition } from "react";
import { getDashboardFunnelStats } from "@/app/actions/dashboard";
import type { LeadStatus } from "@/app/actions/dashboard";
import { useDashboardRange } from "@/components/dashboard/dashboard-range-context";
import { AnimatedMetricValue } from "@/components/dashboard/animated-metric-value";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

const FUNNEL_ROWS: Array<{
  labelKey: string;
  keys: LeadStatus[];
  color: string;
}> = [
  { labelKey: "dashboard.funnelLead", keys: ["NEW"], color: "#60A5FA" },
  { labelKey: "dashboard.funnelContacted", keys: ["CONTACTED"], color: "#38BDF8" },
  { labelKey: "dashboard.funnelWon", keys: ["CLOSED_WON"], color: "#34D399" },
];

const FUNNEL_ANIM_DELAY_MS = 0;
const FUNNEL_ANIM_DURATION_MS = 900;

const REST_KEYS: LeadStatus[] = ["REPLIED", "MEETING_SET", "CLOSED_LOST"];

export type DashboardConversionFunnelProps = {
  initialCounts: Record<LeadStatus, number>;
};

export function DashboardConversionFunnel({
  initialCounts,
}: DashboardConversionFunnelProps) {
  const { t } = useLanguage();
  const { days, periodLabelKey } = useDashboardRange();
  const [counts, setCounts] =
    useState<Record<LeadStatus, number>>(initialCounts);
  const [isPending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startTransition(() => {
      void getDashboardFunnelStats(days).then(setCounts);
    });
  }, [days]);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const countsKey = `${days}|${FUNNEL_ROWS.map((row) =>
    row.keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0),
  ).join(",")}|${REST_KEYS.reduce((sum, k) => sum + (counts[k] ?? 0), 0)}`;

  useLayoutEffect(() => {
    setReady(false);
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [countsKey]);

  const getFunnelWidth = (value: number) => {
    if (total <= 0 || value <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  };

  const restCount = REST_KEYS.reduce((sum, k) => sum + (counts[k] ?? 0), 0);

  return (
    <div
      className="sk-surface sk-surface--pad flex shrink-0 flex-col"
      aria-busy={isPending}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 sm:mb-2 sm:gap-2">
        <h2 className="sk-type-h3">{t("dashboard.funnelTitle")}</h2>
        <span className="sk-funnel-period">{t(periodLabelKey)}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
        {FUNNEL_ROWS.map((row) => {
          const count = row.keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
          const width = getFunnelWidth(count);
          return (
            <div key={row.labelKey}>
              <div className="mb-1 flex items-center justify-between text-[12.5px] font-semibold">
                <span className="flex min-w-0 items-center gap-2 text-[color:var(--sk-ink-soft)]">
                  <span
                    className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ background: row.color }}
                  />
                  {t(row.labelKey)}
                </span>
                <span className="shrink-0 tabular-nums text-[color:var(--sk-ink)]">
                  <AnimatedMetricValue
                    value={count}
                    delay={FUNNEL_ANIM_DELAY_MS}
                    duration={FUNNEL_ANIM_DURATION_MS}
                  />
                </span>
              </div>
              <div className={cn("sk-funnel-bar", ready && "is-ready")}>
                <div
                  className="sk-funnel-bar__fill"
                  style={
                    {
                      "--funnel-width": `${width}%`,
                      background: row.color,
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          );
        })}

        <div
          className="flex items-center justify-between border-t pt-3 text-xs font-semibold"
          style={{ borderColor: "rgba(255,255,255,0.09)" }}
        >
          <span style={{ color: "var(--sk-muted)" }}>
            {t("dashboard.funnelRest")}
          </span>
          <span style={{ color: "var(--sk-muted)" }} className="tabular-nums">
            <AnimatedMetricValue
              value={restCount}
              delay={FUNNEL_ANIM_DELAY_MS}
              duration={FUNNEL_ANIM_DURATION_MS}
            />
          </span>
        </div>
      </div>
    </div>
  );
}
