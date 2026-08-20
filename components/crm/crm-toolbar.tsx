"use client";

import { useRef } from "react";
import {
  Globe,
  Hand,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CrmFiltersPanel } from "@/components/crm/crm-row-widgets";
import type { CrmLeadStatusDb } from "@/lib/crm/matej-status";

type CrmToolbarProps = {
  t: (key: string, params?: Record<string, string | number>) => string;
  selectedCount: number;
  totalItems: number;
  allFilteredSelected: boolean;
  allPageSelected: boolean;
  pageSize: number;
  isBulkRunning: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (v: boolean) => void;
  view: "list" | "board";
  onViewChange: (v: "list" | "board") => void;
  onNewDeal: () => void;
  onClearSelection: () => void;
  onSelectAllFiltered: () => void;
  onBulkScrape: () => void;
  onBulkFollowUp: () => void;
  onBulkBreakup: () => void;
  onBulkStatus: (status: CrmLeadStatusDb) => void;
  onStartAutopilot: () => void;
  onBulkDelete: () => void;
  statusFilter: "all" | CrmLeadStatusDb;
  onStatusFilterChange: (v: "all" | CrmLeadStatusDb) => void;
  dateFilter: "all" | "last_7_days" | "last_30_days" | "this_year";
  onDateFilterChange: (
    v: "all" | "last_7_days" | "last_30_days" | "this_year",
  ) => void;
  tagFilter: string;
  onTagFilterChange: (v: string) => void;
  availableTags: { tag: string; label: string; count: number }[];
  sourceFilter:
    | "all"
    | "radar"
    | "ap_radar"
    | "full_auto"
    | "ap_sniper"
    | "sniper"
    | "manual";
  onSourceFilterChange: (
    v:
      | "all"
      | "radar"
      | "ap_radar"
      | "full_auto"
      | "ap_sniper"
      | "sniper"
      | "manual",
  ) => void;
  sortBy: "newest" | "oldest" | "value_high" | "value_low";
  onSortByChange: (
    v: "newest" | "oldest" | "value_high" | "value_low",
  ) => void;
};

export function CrmToolbar({
  t,
  selectedCount,
  totalItems,
  allFilteredSelected,
  allPageSelected,
  pageSize,
  isBulkRunning,
  searchQuery,
  onSearchChange,
  filtersOpen,
  onFiltersOpenChange,
  view,
  onViewChange,
  onNewDeal,
  onClearSelection,
  onSelectAllFiltered,
  onBulkScrape,
  onBulkFollowUp,
  onBulkBreakup,
  onBulkStatus,
  onStartAutopilot,
  onBulkDelete,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  tagFilter,
  onTagFilterChange,
  availableTags,
  sourceFilter,
  onSourceFilterChange,
  sortBy,
  onSortByChange,
}: CrmToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  if (selectedCount > 0) {
    return (
      <div className="sk-crm-selbar">
        <div className="sk-crm-selbar__row">
          <span className="sk-crm-selbar__count">
            Vybráno{" "}
            <span className="tabular-nums">
              {selectedCount}
              {allFilteredSelected ? ` / ${totalItems}` : ""}
            </span>
          </span>
          <button
            type="button"
            className="sk-crm-selbar__clear"
            aria-label="Zrušit výběr"
            onClick={onClearSelection}
            disabled={isBulkRunning}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
          <span className="sk-crm-selbar__divider" aria-hidden />
          <button
            type="button"
            className="sk-crm-pill"
            disabled={isBulkRunning}
            onClick={onBulkScrape}
          >
            <Globe className="h-3.5 w-3.5" />
            Kontakty z webu
          </button>
          <button
            type="button"
            className="sk-crm-pill"
            disabled={isBulkRunning}
            onClick={onBulkFollowUp}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Follow-up
          </button>
          <button
            type="button"
            className="sk-crm-pill"
            disabled={isBulkRunning}
            onClick={onBulkBreakup}
          >
            <Hand className="h-3.5 w-3.5" />
            Breakup
          </button>
          <Select
            onValueChange={(v) => onBulkStatus(v as CrmLeadStatusDb)}
            disabled={isBulkRunning}
          >
            <SelectTrigger className="sk-crm-pill sk-crm-pill--select h-[34px] w-[9.5rem] border-none bg-[#131417] sm:w-[11.5rem]">
              <SelectValue placeholder="Změnit status" />
            </SelectTrigger>
            <SelectContent className="z-[220] border bg-[color:var(--n-card)] shadow-md">
              <SelectItem value="NEW">NOVÝ LEAD</SelectItem>
              <SelectItem value="CONTACTED">KONTAKTOVÁNO</SelectItem>
              <SelectItem value="REPLIED">FOLLOW UP</SelectItem>
              <SelectItem value="MEETING_SET">KOMUNIKACE</SelectItem>
              <SelectItem value="CLOSED_WON">DOMLUVENO</SelectItem>
              <SelectItem value="BREAK_UP">BREAKUP</SelectItem>
              <SelectItem value="CLOSED_LOST">NEDOMLUVENO</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            className="sk-crm-pill sk-crm-pill--auto"
            disabled={isBulkRunning}
            onClick={onStartAutopilot}
          >
            <Rocket className="h-3.5 w-3.5" />
            Autopilot
          </button>
          <span className="flex-1" />
          <button
            type="button"
            className="sk-crm-pill sk-crm-pill--danger"
            disabled={isBulkRunning}
            onClick={onBulkDelete}
          >
            Odstranit
          </button>
        </div>
        {!allFilteredSelected && totalItems > selectedCount && (
          <div className="sk-crm-selbar__hint">
            <span>
              {allPageSelected
                ? `Vybraná je jen tato stránka (${pageSize}).`
                : "Nejsou vybrané všechny firmy ve filtru."}
            </span>
            <button type="button" className="sk-crm-linkbtn" onClick={onSelectAllFiltered}>
              Vybrat všech {totalItems} ve filtru
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={toolbarRef} className="sk-crm-toolbar">
      <div className="sk-crm-search">
        <Search className="h-[15px] w-[15px] shrink-0 text-[#6b7078]" strokeWidth={2} />
        <input
          type="text"
          className="sk-plain-field"
          placeholder={t("crm.searchPlaceholder")}
          aria-label={t("crm.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="sk-crm-filter-wrap">
        <button
          type="button"
          data-crm-filters-trigger
          className={cn(
            "sk-crm-btn sk-crm-btn--filter",
            filtersOpen && "sk-crm-btn--filter-open",
          )}
          onClick={() => onFiltersOpenChange(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <FilterLinesIcon />
          {t("crm.filters")}
        </button>

        <CrmFiltersPanel
          open={filtersOpen}
          onClose={() => onFiltersOpenChange(false)}
          applyLabel={t("crm.applyFilters")}
        >
          <FilterField label={t("crm.filterStatus")}>
            <Select
              value={statusFilter}
              onValueChange={(v) => onStatusFilterChange(v as "all" | CrmLeadStatusDb)}
            >
              <SelectTrigger className="sk-crm-filters__select">
                <SelectValue placeholder={t("crm.filterStatus")} />
              </SelectTrigger>
              <SelectContent className="z-[220] border bg-[color:var(--n-card)] shadow-md">
                <SelectItem value="all">{t("crm.filterAllStatuses")}</SelectItem>
                <SelectItem value="NEW">{t("leadStatus.NEW")}</SelectItem>
                <SelectItem value="CONTACTED">{t("leadStatus.CONTACTED")}</SelectItem>
                <SelectItem value="REPLIED">{t("leadStatus.REPLIED")}</SelectItem>
                <SelectItem value="MEETING_SET">{t("leadStatus.MEETING_SET")}</SelectItem>
                <SelectItem value="CLOSED_WON">{t("leadStatus.CLOSED_WON")}</SelectItem>
                <SelectItem value="BREAK_UP">{t("leadStatus.BREAK_UP")}</SelectItem>
                <SelectItem value="CLOSED_LOST">{t("leadStatus.CLOSED_LOST")}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("crm.filterDate")}>
            <Select value={dateFilter} onValueChange={(v) => onDateFilterChange(v as typeof dateFilter)}>
              <SelectTrigger className="sk-crm-filters__select">
                <SelectValue placeholder={t("crm.filterTime")} />
              </SelectTrigger>
              <SelectContent className="z-[220] border bg-[color:var(--n-card)] shadow-md">
                <SelectItem value="all">{t("crm.filterAllDates")}</SelectItem>
                <SelectItem value="last_7_days">{t("crm.filterLast7Days")}</SelectItem>
                <SelectItem value="last_30_days">{t("crm.filterLast30Days")}</SelectItem>
                <SelectItem value="this_year">{t("crm.filterThisYear")}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("crm.filterIndustry")}>
            <Select value={tagFilter} onValueChange={onTagFilterChange}>
              <SelectTrigger className="sk-crm-filters__select">
                <SelectValue placeholder={t("crm.filterIndustry")} />
              </SelectTrigger>
              <SelectContent className="z-[220] border border-border bg-[color:var(--n-card)] shadow-lg">
                <SelectItem value="all">
                  {t("autopilot.filterAllIndustries")}
                </SelectItem>
                {availableTags.map(({ tag, label, count }) => (
                  <SelectItem key={tag} value={tag}>
                    {label} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("crm.filterSource")}>
            <Select
              value={sourceFilter}
              onValueChange={(v) =>
                onSourceFilterChange(
                  v as
                    | "all"
                    | "radar"
                    | "ap_radar"
                    | "full_auto"
                    | "ap_sniper"
                    | "sniper"
                    | "manual",
                )
              }
            >
              <SelectTrigger className="sk-crm-filters__select">
                <SelectValue placeholder={t("crm.filterSource")} />
              </SelectTrigger>
              <SelectContent className="z-[220] border border-border bg-[color:var(--n-card)] shadow-lg">
                <SelectItem value="all">{t("crm.filterAllSources")}</SelectItem>
                <SelectItem value="radar">{t("crm.sourceRadar")}</SelectItem>
                <SelectItem value="ap_radar">Autopilot Radar</SelectItem>
                <SelectItem value="full_auto">Full Auto</SelectItem>
                <SelectItem value="ap_sniper">{t("crm.sourceAutopilotSniper")}</SelectItem>
                <SelectItem value="sniper">Sniper</SelectItem>
                <SelectItem value="manual">{t("crm.sourceManual")}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label={t("crm.filterSort")}>
            <Select value={sortBy} onValueChange={(v) => onSortByChange(v as typeof sortBy)}>
              <SelectTrigger className="sk-crm-filters__select">
                <SelectValue placeholder={t("crm.filterSort")} />
              </SelectTrigger>
              <SelectContent className="z-[220] border bg-[color:var(--n-card)] shadow-md">
                <SelectItem value="newest">{t("crm.sortNewestSent")}</SelectItem>
                <SelectItem value="oldest">{t("crm.sortOldestSent")}</SelectItem>
                <SelectItem value="value_high">
                  {t("crm.sortValueHigh")}
                </SelectItem>
                <SelectItem value="value_low">
                  {t("crm.sortValueLow")}
                </SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </CrmFiltersPanel>
      </div>

      <div className="sk-crm-segment">
        {(["list", "board"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-label={v === "list" ? t("crm.listView") : t("crm.boardView")}
            aria-pressed={view === v}
            className={cn(
              "sk-crm-segment__btn",
              view === v && "sk-crm-segment__btn--active",
            )}
            onClick={() => onViewChange(v)}
          >
            {v === "list" ? (
              <List className="h-[15px] w-[15px]" strokeWidth={2} />
            ) : (
              <LayoutGrid className="h-[15px] w-[15px]" strokeWidth={2} />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="sk-crm-btn sk-crm-btn--white"
        onClick={onNewDeal}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
        {t("crm.newDeal")}
      </button>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sk-crm-filters__group">
      <span className="sk-crm-filters__label">{label}</span>
      {children}
    </div>
  );
}

function FilterLinesIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}
