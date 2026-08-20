"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getDashboardRangeBundle,
  type DashboardRangeBundle,
} from "@/app/actions/dashboard";

export const DASHBOARD_RANGE_KEYS = ["7d", "1m", "3m", "6m", "1y"] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_KEYS)[number];

const RANGE_DAYS: Record<DashboardRangeKey, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const ALL_RANGE_DAYS = Object.values(RANGE_DAYS);

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
  bundle: DashboardRangeBundle | null;
  pending: boolean;
  seedBundle: (days: number, data: DashboardRangeBundle) => void;
};

const DashboardRangeContext = createContext<DashboardRangeContextValue | null>(
  null,
);

export function DashboardRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<DashboardRangeKey>("1m");
  const [bundle, setBundle] = useState<DashboardRangeBundle | null>(null);
  const [pending, setPending] = useState(false);
  const cacheRef = useRef(new Map<number, DashboardRangeBundle>());
  const inflightRef = useRef(new Map<number, Promise<DashboardRangeBundle>>());
  const seededRef = useRef(false);

  const days = RANGE_DAYS[range];

  const loadDays = useCallback(async (targetDays: number) => {
    const cached = cacheRef.current.get(targetDays);
    if (cached) return cached;

    const inflight = inflightRef.current.get(targetDays);
    if (inflight) return inflight;

    const request = getDashboardRangeBundle(targetDays)
      .then((data) => {
        cacheRef.current.set(targetDays, data);
        inflightRef.current.delete(targetDays);
        return data;
      })
      .catch((error) => {
        inflightRef.current.delete(targetDays);
        throw error;
      });

    inflightRef.current.set(targetDays, request);
    return request;
  }, []);

  const seedBundle = useCallback((seedDays: number, data: DashboardRangeBundle) => {
    cacheRef.current.set(seedDays, data);
    if (!seededRef.current) {
      seededRef.current = true;
      setBundle(data);
    }
  }, []);

  const setRange = useCallback(
    (next: DashboardRangeKey) => {
      const nextDays = RANGE_DAYS[next];
      setRangeState(next);

      const cached = cacheRef.current.get(nextDays);
      if (cached) {
        // Instant paint + animations from previous values → cached target.
        setBundle(cached);
        setPending(false);
      } else {
        setPending(true);
      }

      void loadDays(nextDays).then((data) => {
        cacheRef.current.set(nextDays, data);
        setBundle(data);
        setPending(false);
      });
    },
    [loadDays],
  );

  // Prefetch other ranges after first paint so later switches feel instant.
  useEffect(() => {
    if (!seededRef.current) return;
    const timer = window.setTimeout(() => {
      for (const targetDays of ALL_RANGE_DAYS) {
        if (cacheRef.current.has(targetDays)) continue;
        void loadDays(targetDays);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loadDays, bundle]);

  const value = useMemo(
    () => ({
      range,
      setRange,
      days,
      periodLabelKey: DASHBOARD_RANGE_PERIOD_KEYS[range],
      bundle,
      pending,
      seedBundle,
    }),
    [range, setRange, days, bundle, pending, seedBundle],
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
