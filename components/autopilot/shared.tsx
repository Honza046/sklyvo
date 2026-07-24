"use client";

import {
  CheckCircle2,
  Clock,
  Loader2,
  Settings,
  XCircle,
} from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import type { FullAutoAutomationStatus } from "@/app/actions/autopilot";

export type AutopilotLead = {
  id: string;
  company: string;
  url: string;
  email: string;
};

export type WorkspaceLead = {
  id: string;
  company: string;
  url: string;
  email: string;
  phone: string;
  createdAt: string;
  leadStatus: "NEW" | "CONTACTED" | "REPLIED" | "MEETING_SET" | "CLOSED_WON" | "CLOSED_LOST" | "BREAK_UP";
};

export type RunStatus = "pending" | "processing" | "queued" | "error";

export type RunState = {
  status: RunStatus;
  message?: string;
  queueId?: string;
  subject?: string;
  htmlBody?: string;
};

export const ITEMS_PER_PAGE = 10;

export const AUTOPILOT_TABLE_CARD_CLASS =
  "mt-8 flex flex-col overflow-x-hidden rounded-2xl border border-border/60 bg-card shadow-sm";

export const AUTOPILOT_TABLE_SCROLL_CLASS =
  "h-[350px] min-h-[350px] max-h-[350px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export const AUTOPILOT_HIDDEN_SCROLLBAR_CLASS =
  "scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export const SNIPER_SELECTION_TABLE_SCROLL_CLASS = AUTOPILOT_TABLE_SCROLL_CLASS;

export const SNIPER_QUEUE_TABLE_SCROLL_CLASS =
  "h-[190px] min-h-[190px] max-h-[190px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export const AUTOPILOT_TABLE_HEAD_CELL_CLASS =
  "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950";

export const SNIPER_SETTINGS_STORAGE_KEY = "venegard-autopilot-sniper-settings";
export const FULL_AUTO_SETTINGS_STORAGE_KEY = "venegard-autopilot-full-auto-settings";

export const FULL_AUTO_STATUS_BADGES: Record<
  FullAutoAutomationStatus,
  { label: string; className: string }
> = {
  found: {
    label: "Nalezeno",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  generating: {
    label: "Generování AI",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  queued: {
    label: "Ve frontě",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  sent: {
    label: "Odesláno",
    className: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  },
  failed: {
    label: "Chyba",
    className: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
};

export const STATUS_META: Record<
  RunStatus,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  pending: { icon: Clock, className: "text-muted-foreground", label: "Ve frontě" },
  processing: { icon: Loader2, className: "text-amber-500", label: "Generuji" },
  queued: { icon: CheckCircle2, className: "text-emerald-500", label: "Ve frontě k odeslání" },
  error: { icon: XCircle, className: "text-rose-500", label: "Chyba" },
};

export function leadFullWebsiteUrl(domainOrUrl: string): string {
  const raw = (domainOrUrl ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function formatFoundDate(iso: string, locale = "cs-CZ"): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function formatProcessedDateTime(iso: string): string {
  return new Date(iso).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FullAutoStatusBadge({ status }: { status: FullAutoAutomationStatus }) {
  const meta = FULL_AUTO_STATUS_BADGES[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function leadStatusLabel(status: WorkspaceLead["leadStatus"]): string {
  const labels: Record<WorkspaceLead["leadStatus"], string> = {
    NEW: "Uloženo do CRM",
    CONTACTED: "Osloveno",
    REPLIED: "Odpověď",
    MEETING_SET: "Schůzka",
    CLOSED_WON: "Vyhráno",
    CLOSED_LOST: "Ztraceno",
    BREAK_UP: "Breakup",
  };
  return labels[status];
}

export function leadStatusClassName(status: WorkspaceLead["leadStatus"]): string {
  if (status === "NEW") return "text-emerald-700 dark:text-emerald-400";
  if (status === "CONTACTED" || status === "REPLIED") return "text-blue-700 dark:text-blue-400";
  if (status === "MEETING_SET" || status === "CLOSED_WON") return "text-violet-700 dark:text-violet-400";
  if (status === "BREAK_UP") return "text-amber-700 dark:text-amber-400";
  return "text-muted-foreground";
}

const WORKSPACE_LEAD_STATUS_KEYS: Record<WorkspaceLead["leadStatus"], string> = {
  NEW: "autopilot.workspaceLead.NEW",
  CONTACTED: "autopilot.workspaceLead.CONTACTED",
  REPLIED: "autopilot.workspaceLead.REPLIED",
  MEETING_SET: "autopilot.workspaceLead.MEETING_SET",
  CLOSED_WON: "autopilot.workspaceLead.CLOSED_WON",
  CLOSED_LOST: "autopilot.workspaceLead.CLOSED_LOST",
  BREAK_UP: "autopilot.workspaceLead.BREAK_UP",
};

export function useAutopilotLabels() {
  const { t, language } = useLanguage();
  const dateLocale = DATE_LOCALE[language];

  const localizedLeadStatusLabel = useCallback(
    (status: WorkspaceLead["leadStatus"]) => t(WORKSPACE_LEAD_STATUS_KEYS[status]),
    [t],
  );

  return { leadStatusLabel: localizedLeadStatusLabel, dateLocale };
}

export function AutopilotPowerBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        enabled
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
      )}
    >
      {enabled ? "Zapnuto" : "Vypnuto"}
    </span>
  );
}

export function AutopilotPowerButton({
  enabled,
  onClick,
  disabled,
  accent = "emerald",
}: {
  enabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  accent?: "emerald" | "blue" | "violet";
}) {
  const onClass = {
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    violet: "bg-violet-600 text-white hover:bg-violet-700",
  }[accent];
  const offClass = {
    emerald:
      "border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-950 dark:text-emerald-300",
    blue: "border border-blue-300 bg-white text-blue-800 hover:bg-blue-50 dark:border-blue-700 dark:bg-zinc-950 dark:text-blue-300",
    violet:
      "border border-violet-300 bg-white text-violet-800 hover:bg-violet-50 dark:border-violet-700 dark:bg-zinc-950 dark:text-violet-300",
  }[accent];

  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn("shrink-0 px-5 font-semibold", enabled ? offClass : onClass)}
    >
      {disabled ? "Ukládám…" : enabled ? "Vypnout" : "Zapnout"}
    </Button>
  );
}

export function AutopilotControlPanel({
  icon,
  iconWrapClassName,
  title,
  description,
  extra,
  actions,
  powerEnabled,
}: {
  icon: React.ReactNode;
  iconWrapClassName: string;
  title: string;
  description: string;
  extra?: React.ReactNode;
  actions: React.ReactNode;
  /** Pokud je předáno, zobrazí badge Zapnuto/Vypnout u názvu. */
  powerEnabled?: boolean;
}) {
  return (
    <div className="relative shrink-0 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={cn("shrink-0 rounded-xl p-2", iconWrapClassName)}>{icon}</div>
          <div className="min-w-0 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              {powerEnabled != null ? <AutopilotPowerBadge enabled={powerEnabled} /> : null}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            {extra}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      </div>
    </div>
  );
}

export function AutopilotTablePagination({
  shownFrom,
  shownTo,
  totalItems,
  safePage,
  totalPages,
  onPrevious,
  onNext,
  selectedCount,
  className,
}: {
  shownFrom: number;
  shownTo: number;
  totalItems: number;
  safePage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  selectedCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 border-t border-border/60 bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-xs text-muted-foreground">
          Zobrazeno {shownFrom} až {shownTo} z {totalItems} firem
        </p>
        {selectedCount != null && selectedCount > 0 && (
          <p className="text-xs text-gray-400 dark:text-muted-foreground">
            Vybráno: {selectedCount} firem
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={safePage <= 1}>
          Předchozí
        </Button>
        <span className="text-xs text-muted-foreground">
          Strana {safePage} / {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={onNext} disabled={safePage >= totalPages}>
          Následující
        </Button>
      </div>
    </div>
  );
}

export function AutopilotTableEmptyState({
  colSpan,
  children,
  className,
}: {
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0 align-middle">
        <div
          className={cn(
            "flex h-[300px] w-full flex-col items-center justify-center text-center text-sm text-gray-400 dark:text-muted-foreground",
            className,
          )}
        >
          {children}
        </div>
      </td>
    </tr>
  );
}

export function AutopilotSettingsIconButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "h-9 w-9 shrink-0 p-0 text-gray-400 hover:bg-transparent hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
        className,
      )}
    >
      <Settings className="h-4 w-4" />
    </Button>
  );
}
