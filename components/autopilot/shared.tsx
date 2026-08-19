"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  phone?: string;
  author?: string;
  scheduledAt?: string;
  createdAt?: string;
};

export type WorkspaceLead = {
  id: string;
  company: string;
  url: string;
  email: string;
  phone: string;
  createdAt: string;
  leadStatus:
    | "NEW"
    | "CONTACTED"
    | "REPLIED"
    | "MEETING_SET"
    | "CLOSED_WON"
    | "CLOSED_LOST"
    | "BREAK_UP";
  /** Neviditelné tagy — jen pro filtraci. */
  tags: string[];
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
  "sk-data-panel mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-[color:var(--n-card)] shadow-sm sm:rounded-2xl";

export const AUTOPILOT_HIDDEN_SCROLLBAR_CLASS =
  "scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export const AUTOPILOT_TABLE_HEAD_CELL_CLASS =
  "h-8 bg-transparent px-3 py-1.5 align-middle sk-type-label";

export const SNIPER_SETTINGS_STORAGE_KEY = "sklyvo-autopilot-sniper-settings";
export const FULL_AUTO_SETTINGS_STORAGE_KEY =
  "sklyvo-autopilot-full-auto-settings";

export const FULL_AUTO_STATUS_BADGES: Record<
  FullAutoAutomationStatus,
  { label: string; className: string }
> = {
  found: {
    label: "Nalezeno",
    className: "bg-[color-mix(in_oklab,#34d399_14%,var(--n-field))] text-emerald-700 ",
  },
  generating: {
    label: "Generování AI",
    className: "bg-amber-50 text-amber-700 ",
  },
  queued: {
    label: "Ve frontě",
    className: "bg-[color-mix(in_oklab,var(--sk-brand)_14%,var(--n-field))] text-[color:var(--sk-brand)] ",
  },
  sent: {
    label: "Odesláno",
    className: "bg-sky-50 text-sky-700 ",
  },
  failed: {
    label: "Chyba",
    className: "bg-rose-50 text-rose-700 ",
  },
};

export const STATUS_META: Record<
  RunStatus,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  pending: {
    icon: Clock,
    className: "text-muted-foreground",
    label: "Ve frontě",
  },
  processing: { icon: Loader2, className: "text-amber-500", label: "Generuji" },
  queued: {
    icon: CheckCircle2,
    className: "text-emerald-500",
    label: "Ve frontě k odeslání",
  },
  error: { icon: XCircle, className: "text-rose-500", label: "Chyba" },
};

export function leadFullWebsiteUrl(domainOrUrl: string): string {
  const raw = (domainOrUrl ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function formatFoundDate(iso: string, locale = "cs-CZ"): string {
  if (!iso?.trim()) return "—";
  const raw = iso.trim();
  // Už lokalizovaný český formát z CRM (`31. 7. 2026`)
  if (/^\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
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

export function formatQueueDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function FullAutoStatusBadge({
  status,
}: {
  status: FullAutoAutomationStatus;
}) {
  const meta = FULL_AUTO_STATUS_BADGES[status] ?? FULL_AUTO_STATUS_BADGES.found;
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

export function leadStatusClassName(
  status: WorkspaceLead["leadStatus"],
): string {
  if (status === "NEW") return "text-emerald-700 ";
  if (status === "CONTACTED" || status === "REPLIED") return "text-[color:var(--sk-brand)] ";
  if (status === "MEETING_SET" || status === "CLOSED_WON")
    return "text-sky-700 ";
  if (status === "BREAK_UP") return "text-amber-700 ";
  return "text-muted-foreground";
}

const WORKSPACE_LEAD_STATUS_KEYS: Record<WorkspaceLead["leadStatus"], string> =
  {
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
    (status: WorkspaceLead["leadStatus"]) =>
      t(WORKSPACE_LEAD_STATUS_KEYS[status]),
    [t],
  );

  return { leadStatusLabel: localizedLeadStatusLabel, dateLocale };
}

export function AutopilotPowerBadge({ enabled }: { enabled: boolean | null }) {
  return (
    <span
      className={cn(
        "sk-autopilot-power-badge",
        enabled === null
          ? "sk-autopilot-power-badge--loading"
          : enabled
            ? "sk-autopilot-power-badge--on"
            : "sk-autopilot-power-badge--off",
      )}
    >
      {enabled === null ? "…" : enabled ? "Zapnuto" : "Vypnuto"}
    </span>
  );
}

export function AutopilotPowerButton({
  enabled,
  onClick,
  disabled,
  accent: _accent = "emerald",
}: {
  enabled: boolean | null;
  onClick: () => void;
  disabled?: boolean;
  accent?: "emerald" | "blue" | "violet";
}) {
  void _accent;
  const loading = enabled === null || disabled;
  const isOn = enabled === true;

  const label = disabled
    ? "Ukládám…"
    : enabled === null
      ? "…"
      : enabled
        ? "Vypnout"
        : "Zapnout";

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={cn(
        "sk-autopilot-power-btn",
        isOn
          ? "sk-autopilot-power-btn--deactivate"
          : "sk-autopilot-power-btn--activate",
        loading && "sk-autopilot-power-btn--loading",
      )}
    >
      {label}
    </button>
  );
}

export function AutopilotIconButton({
  onClick,
  label,
  children,
  className,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("sk-autopilot-icon-btn", className)}
    >
      {children}
    </button>
  );
}

export function AutopilotControlPanel({
  icon,
  iconWrapClassName = "",
  iconAccent,
  title,
  description,
  filters,
  actions,
  powerEnabled,
}: {
  icon: React.ReactNode;
  iconWrapClassName?: string;
  iconAccent?: string;
  title: string;
  description: string;
  filters?: React.ReactNode;
  actions: React.ReactNode;
  /** Pokud je předáno, zobrazí badge Zapnuto/Vypnuto u názvu. */
  powerEnabled?: boolean | null;
}) {
  return (
    <div className="sk-autopilot-control">
      <div className="sk-autopilot-control__inner">
        <div className="sk-autopilot-control__main">
          <div
            className={cn("sk-autopilot-control__icon", iconWrapClassName)}
            data-accent={iconAccent}
          >
            {icon}
          </div>
          <div className="sk-autopilot-control__copy">
            <div className="sk-autopilot-control__title-row">
              <h2 className="sk-autopilot-control__title">{title}</h2>
              {powerEnabled != null ? (
                <AutopilotPowerBadge enabled={powerEnabled} />
              ) : null}
            </div>
            <p className="sk-autopilot-control__desc">{description}</p>
          </div>
        </div>
        <div className="sk-autopilot-control__actions">{actions}</div>
      </div>
      {filters ? (
        <div className="sk-autopilot-control__filters">{filters}</div>
      ) : null}
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
        "sk-pager flex shrink-0 items-center justify-between gap-2 border-0 bg-transparent px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] leading-none text-muted-foreground sm:text-xs">
          <span className="sm:hidden">
            {shownFrom}–{shownTo} / {totalItems}
          </span>
          <span className="hidden sm:inline">
            Zobrazeno {shownFrom} až {shownTo} z {totalItems} firem
          </span>
        </p>
        {selectedCount != null && selectedCount > 0 && (
          <p className="mt-1 text-[10px] leading-none text-muted-foreground sm:text-[11px]">
            Vybráno: {selectedCount}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="sk-pager-btn h-7 gap-0.5 rounded-lg px-1.5 text-[11px] font-medium text-muted-foreground shadow-none hover:text-foreground sm:px-2 sm:text-xs"
          onClick={onPrevious}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="!size-3.5 shrink-0" />
          <span className="hidden sm:inline">Předchozí</span>
        </Button>
        <span className="min-w-[2.5rem] text-center text-[11px] tabular-nums leading-none text-muted-foreground sm:text-xs">
          {safePage}/{totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="sk-pager-btn h-7 gap-0.5 rounded-lg px-1.5 text-[11px] font-medium text-muted-foreground shadow-none hover:text-foreground sm:px-2 sm:text-xs"
          onClick={onNext}
          disabled={safePage >= totalPages}
        >
          <span className="hidden sm:inline">Následující</span>
          <ChevronRight className="!size-3.5 shrink-0" />
        </Button>
      </div>
    </div>
  );
}

/** Vycentrované kolečko při prvním načtení tabulky bez dat. */
export function AutopilotTableLoadingSpinner({
  colSpan,
}: {
  colSpan: number;
}) {
  return (
    <AutopilotTableEmptyState colSpan={colSpan}>
      <Loader2
        className="h-7 w-7 animate-spin text-[#6b7078]"
        strokeWidth={2}
        aria-hidden
      />
      <span className="sr-only">Načítání</span>
    </AutopilotTableEmptyState>
  );
}

/** Prázdný / loading stav uvnitř široké tabulky — vycentrováno ve viewportu karty. */
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
    <tr className="sk-table-empty">
      <td colSpan={colSpan} className="p-0 align-middle">
        <div
          className={cn(
            "sticky left-0 flex h-full min-h-[min(36dvh,260px)] w-full max-w-full flex-col items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground",
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
    <AutopilotIconButton onClick={onClick} label={label} className={className}>
      <Settings className="h-4 w-4" />
    </AutopilotIconButton>
  );
}
