"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const DASHBOARD_RANGE_KEYS = ["7d", "1m", "3m", "6m", "1y"] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_KEYS)[number];

const RANGE_DAYS: Record<DashboardRangeKey, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

/** i18n keys under `dashboard.funnelPeriod*` */
export const DASHBOARD_RANGE_PERIOD_KEYS: Record<DashboardRangeKey, string> = {
  "7d": "dashboard.funnelPeriod7d",
  "1m": "dashboard.funnelPeriod1m",
  "3m": "dashboard.funnelPeriod3m",
  "6m": "dashboard.funnelPeriod6m",
  "1y": "dashboard.funnelPeriod1y",
};

type DashboardRangeContextValue = {
  range: DashboardRangeKey;
  setRange: (range: DashboardRangeKey) => void;
  days: number;
  periodLabelKey: string;
};

const DashboardRangeContext = createContext<DashboardRangeContextValue | null>(
  null,
);

export function DashboardRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DashboardRangeKey>("1m");

  const value = useMemo(
    () => ({
      range,
      setRange,
      days: RANGE_DAYS[range],
      periodLabelKey: DASHBOARD_RANGE_PERIOD_KEYS[range],
    }),
    [range],
  );

  return (
    <DashboardRangeContext.Provider value={value}>
      {children}
    </DashboardRangeContext.Provider>
  );
}

export function useDashboardRange() {
  const ctx = useContext(DashboardRangeContext);
  if (!ctx) {
    throw new Error("useDashboardRange must be used within DashboardRangeProvider");
  }
  return ctx;
}

export function dashboardRangeDays(key: DashboardRangeKey): number {
  return RANGE_DAYS[key];
}
