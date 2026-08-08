"use client";

import { useCallback, useState, useTransition } from "react";
import { getDashboardFunnelStats } from "@/app/actions/dashboard";
import type { LeadStatus } from "@/app/actions/dashboard";
import { FUNNEL_STATUS_META } from "@/lib/dashboard-funnel-meta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DashboardConversionFunnelProps = {
  initialCounts: Record<LeadStatus, number>;
};

export function DashboardConversionFunnel({ initialCounts }: DashboardConversionFunnelProps) {
  const [days, setDays] = useState("30");
  const [counts, setCounts] = useState<Record<LeadStatus, number>>(initialCounts);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback((nextDays: string) => {
    setDays(nextDays);
    startTransition(() => {
      void getDashboardFunnelStats(Number(nextDays)).then(setCounts);
    });
  }, []);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const getFunnelWidth = (value: number) => {
    if (total <= 0 || value <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  };

  return (
    <div className="sk-surface sk-surface--pad flex shrink-0 flex-col">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 sm:mb-2 sm:gap-2">
        <h2 className="text-sm font-bold text-[color:var(--sk-ink)] sm:text-base">
          Konverzní trychtýř
        </h2>
        <Select value={days} onValueChange={refresh} disabled={isPending}>
          <SelectTrigger
            className="sk-select"
            aria-label="Časové okno trychtýře"
          >
            <SelectValue placeholder="Období" />
          </SelectTrigger>
          <SelectContent className="rounded-lg border-border/60 bg-card text-sm shadow-md">
            <SelectItem value="7" className="text-xs">
              Poslední týden
            </SelectItem>
            <SelectItem value="30" className="text-xs">
              Poslední měsíc
            </SelectItem>
            <SelectItem value="90" className="text-xs">
              Poslední čtvrtletí
            </SelectItem>
            <SelectItem value="180" className="text-xs">
              Poslední půlrok
            </SelectItem>
            <SelectItem value="365" className="text-xs">
              Poslední rok
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 sm:gap-1.5">
        {FUNNEL_STATUS_META.map((row) => {
          const count = counts[row.key];
          const width = getFunnelWidth(count);
          return (
            <div key={row.key} className="space-y-0.5">
              <div className="flex justify-between text-[11px] font-semibold text-[color:var(--sk-ink)] sm:text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.dotClass}`} />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="shrink-0 tabular-nums">{count}</span>
              </div>
              <div className="sk-funnel-bar h-1 sm:h-1.5">
                <div className="sk-funnel-bar__fill" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
