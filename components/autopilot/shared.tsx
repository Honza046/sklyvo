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

export const ITEMS_PER_PAGE = 50;

export const AUTOPILOT_TABLE_CARD_CLASS =
  "mt-2 flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm sm:mt-8 sm:rounded-2xl sm:overflow-x-hidden";

export const AUTOPILOT_TABLE_SCROLL_CLASS =
  "max-h-[min(42dvh,280px)] min-h-[160px] overflow-x-auto overflow-y-auto sm:h-[350px] sm:min-h-[350px] sm:max-h-[350px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

/** Desktop tabulka — bez min-width na mobilu (mobil používá seznam). */
export const AUTOPILOT_DESKTOP_TABLE_CLASS =
  "hidden w-full table-fixed text-sm md:table";

export const AUTOPILOT_HIDDEN_SCROLLBAR_CLASS =
  "scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export const SNIPER_SELECTION_TABLE_SCROLL_CLASS = AUTOPILOT_TABLE_SCROLL_CLASS;

export const SNIPER_QUEUE_TABLE_SCROLL_CLASS =
  "max-h-[min(35dvh,190px)] min-h-[140px] overflow-x-auto overflow-y-auto sm:h-[190px] sm:min-h-[190px] sm:max-h-[190px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

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
      className={cn("h-8 shrink-0 px-3 text-xs font-semibold sm:h-9 sm:px-5 sm:text-sm", enabled ? offClass : onClass)}
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
  /** Pokud je předáno, zobrazí badge Zapnuto/Vypnuto u názvu. */
  powerEnabled?: boolean;
}) {
  return (
    <>
      <div className="relative flex min-h-12 shrink-0 items-center rounded-xl border border-border/60 bg-card px-2.5 py-2 shadow-sm sm:h-[4.25rem] sm:min-h-16 sm:rounded-2xl sm:px-5 sm:py-0">
        <div className="flex w-full flex-row items-center justify-between gap-1.5 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
            <div className={cn("shrink-0 rounded-lg p-1.5 sm:rounded-xl sm:p-2", iconWrapClassName)}>{icon}</div>
            <div className="min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="truncate text-xs font-semibold leading-none text-foreground sm:text-base">
                  {title}
                </h2>
                {powerEnabled != null ? (
                  <span className="shrink-0">
                    <AutopilotPowerBadge enabled={powerEnabled} />
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-1 text-[10px] leading-snug text-muted-foreground sm:mt-1.5 sm:line-clamp-2 sm:truncate sm:text-xs sm:leading-none">
                {description}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">{actions}</div>
        </div>
      </div>
      {extra}
    </>
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
        "flex shrink-0 items-center justify-between gap-2 border-t border-border/40 bg-transparent px-3 py-2 sm:gap-3 sm:border-border/60 sm:bg-muted/30 sm:px-6 sm:py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground sm:text-xs">
          <span className="sm:hidden">
            {shownFrom}–{shownTo} / {totalItems}
          </span>
          <span className="hidden sm:inline">
            Zobrazeno {shownFrom} až {shownTo} z {totalItems} firem
          </span>
        </p>
        {selectedCount != null && selectedCount > 0 && (
          <p className="text-[10px] text-muted-foreground sm:text-xs">Vybráno: {selectedCount}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px] sm:h-9 sm:px-3 sm:text-sm"
          onClick={onPrevious}
          disabled={safePage <= 1}
        >
          <span className="sm:hidden">←</span>
          <span className="hidden sm:inline">Předchozí</span>
        </Button>
        <span className="text-[11px] text-muted-foreground sm:text-xs">
          {safePage}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[11px] sm:h-9 sm:px-3 sm:text-sm"
          onClick={onNext}
          disabled={safePage >= totalPages}
        >
          <span className="sm:hidden">→</span>
          <span className="hidden sm:inline">Následující</span>
        </Button>
      </div>
    </div>
  );
}

/** Prázdný / loading stav uvnitř široké tabulky — sticky left, ať je na mobilu uprostřed viewportu. */
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
            "sticky left-0 flex h-[min(42dvh,240px)] w-[min(100vw-1.5rem,100%)] flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground",
            className,
          )}
        >
          {children}
        </div>
      </td>
    </tr>
  );
}

/** Prázdný / loading stav pro mobilní seznam (mimo tabulku). */
export function AutopilotListEmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[180px] flex-col items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
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
        "h-8 w-8 shrink-0 p-0 text-gray-400 hover:bg-transparent hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 sm:h-9 sm:w-9",
        className,
      )}
    >
      <Settings className="h-4 w-4" />
    </Button>
  );
}
