"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Sparkles } from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { FilterSearch } from "@/components/autopilot/filter-search";
import { CopyEmailButton } from "@/components/copy-email-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  getFullAutoProcessHistory,
  type FullAutoAutomationStatus,
  type FullAutoProcessHistoryRow,
} from "@/app/actions/autopilot";
import {
  AutopilotControlPanel,
  AutopilotPowerButton,
  AutopilotSettingsIconButton,
  AutopilotTableEmptyState,
  AutopilotTableLoadingSpinner,
  AutopilotTablePagination,
  AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
  AUTOPILOT_TABLE_CARD_CLASS,
  AUTOPILOT_TABLE_HEAD_CELL_CLASS,
  FULL_AUTO_STATUS_BADGES,
  FullAutoStatusBadge,
  ITEMS_PER_PAGE,
  formatProcessedDateTime,
  leadFullWebsiteUrl,
} from "@/components/autopilot/shared";
import { AutopilotTableSkeletonRows } from "@/components/autopilot/autopilot-table-skeleton";
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";

type FullAutoDateSort = "newest" | "oldest" | "range";
type FullAutoStatusFilter = "all" | FullAutoAutomationStatus;

const FULL_AUTO_STATUS_FILTERS: FullAutoStatusFilter[] = [
  "all",
  "found",
  "generating",
  "queued",
  "sent",
  "failed",
];

function startOfLocalDay(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfLocalDay(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function AutopilotFullAutoView() {
  const { t } = useLanguage();
  const [fullAutoPage, setFullAutoPage] = useState(1);
  const [fullAutoRows, setFullAutoRows] = useState<FullAutoProcessHistoryRow[]>(
    [],
  );
  const [isFullAutoHistoryLoading, setIsFullAutoHistoryLoading] =
    useState(true);
  const [fullAutoHistoryError, setFullAutoHistoryError] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FullAutoStatusFilter>("all");
  const [dateSort, setDateSort] = useState<FullAutoDateSort>("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const {
    settingsOpen,
    setSettingsOpen,
    settingsLoading,
    isSavingSettings,
    isTogglingPower,
    automationSettings,
    setAutomationSettings,
    featureEnabled,
    setFeatureEnabledLocal,
    openSettings,
    handleSaveAutomationSettings,
    toggleFeaturePower,
  } = useAutopilotSettings("full-auto");

  const loadFullAutoHistory = async () => {
    setIsFullAutoHistoryLoading(true);
    setFullAutoHistoryError(null);
    try {
      const result = await getFullAutoProcessHistory();
      if ("error" in result && result.error) {
        setFullAutoRows([]);
        setFullAutoHistoryError(result.error);
        return;
      }
      setFullAutoRows(result.rows ?? []);
    } catch (e) {
      console.error("Autopilot loadFullAutoHistory error:", e);
      setFullAutoRows([]);
      setFullAutoHistoryError(t("autopilot.fullAutoUi.loadError"));
    } finally {
      setIsFullAutoHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadFullAutoHistory();
  }, []);

  useEffect(() => {
    setFullAutoPage(1);
  }, [
    fullAutoRows.length,
    searchQuery,
    onlyWithEmail,
    statusFilter,
    dateSort,
    dateFrom,
    dateTo,
  ]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const from = startOfLocalDay(dateFrom);
    const to = endOfLocalDay(dateTo);

    const filtered = fullAutoRows.filter((row) => {
      const matchText =
        !q ||
        row.company.toLowerCase().includes(q) ||
        row.url.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q);

      const hasEmail = Boolean(row.email?.trim());
      const matchEmail = !onlyWithEmail || hasEmail;

      const matchStatus =
        statusFilter === "all" || row.automationStatus === statusFilter;

      const processed = new Date(row.processedAt);
      const matchRange =
        dateSort !== "range" ||
        ((!from || processed >= from) && (!to || processed <= to));

      return matchText && matchEmail && matchStatus && matchRange;
    });

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.processedAt).getTime();
      const bTime = new Date(b.processedAt).getTime();
      if (dateSort === "oldest") return aTime - bTime;
      return bTime - aTime;
    });
  }, [
    fullAutoRows,
    searchQuery,
    onlyWithEmail,
    statusFilter,
    dateSort,
    dateFrom,
    dateTo,
  ]);

  const filterControlClass =
    "sk-filter-chip h-9 shrink-0 py-0 text-xs shadow-none";

  const renderFilters = () => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <FilterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("autopilot.searchPlaceholder")}
          className="min-w-0 flex-1 sm:min-w-[160px]"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as FullAutoStatusFilter)}
        >
          <SelectTrigger
            className={cn(filterControlClass, "w-full sm:w-[150px]")}
          >
            <SelectValue placeholder={t("autopilot.colStatus")} />
          </SelectTrigger>
          <SelectContent className="z-[220]">
            {FULL_AUTO_STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all"
                  ? t("autopilot.filterAll")
                  : FULL_AUTO_STATUS_BADGES[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={dateSort}
          onValueChange={(v) => setDateSort(v as FullAutoDateSort)}
        >
          <SelectTrigger
            className={cn(filterControlClass, "w-full sm:w-[130px]")}
          >
            <SelectValue placeholder={t("autopilot.filterDate")} />
          </SelectTrigger>
          <SelectContent className="z-[220]">
            <SelectItem value="newest">{t("autopilot.filterNewest")}</SelectItem>
            <SelectItem value="oldest">{t("autopilot.filterOldest")}</SelectItem>
            <SelectItem value="range">
              {t("autopilot.filterDateRange")}
            </SelectItem>
          </SelectContent>
        </Select>
        {dateSort === "range" ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={cn(filterControlClass, "w-full sm:w-[132px]")}
              title={t("autopilot.filterDateFrom")}
            />
            <span className="text-[11px] text-muted-foreground">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={cn(filterControlClass, "w-full sm:w-[132px]")}
              title={t("autopilot.filterDateTo")}
            />
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          {t("autopilot.filterWithEmail")}
        </span>
        <Switch
          checked={onlyWithEmail}
          onCheckedChange={setOnlyWithEmail}
          className="sk-switch--sm shrink-0"
          aria-label="Jen s e-mailem"
        />
      </div>
    </div>
  );

  const fullAutoTotalItems = filteredRows.length;
  const fullAutoTotalPages = Math.max(
    1,
    Math.ceil(fullAutoTotalItems / ITEMS_PER_PAGE),
  );
  const fullAutoSafePage = Math.min(fullAutoPage, fullAutoTotalPages);
  const fullAutoPageStart = (fullAutoSafePage - 1) * ITEMS_PER_PAGE;
  const paginatedFullAutoRows = filteredRows.slice(
    fullAutoPageStart,
    fullAutoPageStart + ITEMS_PER_PAGE,
  );
  const fullAutoShownFrom =
    fullAutoTotalItems === 0 ? 0 : fullAutoPageStart + 1;
  const fullAutoShownTo =
    fullAutoTotalItems === 0
      ? 0
      : fullAutoPageStart + paginatedFullAutoRows.length;

  const renderTable = () => (
      <div
        className={cn(
          AUTOPILOT_TABLE_CARD_CLASS,
          "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden sm:mt-0",
        )}
      >
        <div
          className={cn(
            "sk-data-panel__scroll min-h-0 flex-1 overflow-x-auto overflow-y-auto",
            AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
          )}
        >
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 z-20 bg-[color:var(--n-card)] ">
              <tr className="text-left">
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[34%]")}>
                  {t("autopilot.colCompany")}
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[28%]")}>
                  {t("autopilot.colContact")}
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[20%]")}>
                  {t("autopilot.fullAutoUi.colProcessed")}
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[18%]")}>
                  {t("autopilot.fullAutoUi.colAutomationStatus")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isFullAutoHistoryLoading && fullAutoRows.length === 0 ? (
                <AutopilotTableLoadingSpinner colSpan={4} />
              ) : isFullAutoHistoryLoading && fullAutoRows.length > 0 ? (
                <AutopilotTableSkeletonRows rows={8} columns={4} variant="full-auto" />
              ) : (
                <>
                  {paginatedFullAutoRows.map((row) => (
                <tr key={`full-auto-d-${row.id}`}>
                  <td className="px-6 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {row.company}
                      </p>
                      {row.url ? (
                        <a
                          href={leadFullWebsiteUrl(row.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{row.url}</span>
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    {row.email ? (
                      <div className="flex min-w-0 items-center gap-0.5">
                        <CopyEmailButton
                          email={row.email}
                          size="sm"
                          variant="ghost"
                        />
                        <span
                          className="min-w-0 truncate text-xs text-muted-foreground"
                          title={row.email}
                        >
                          {row.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">
                    {formatProcessedDateTime(row.processedAt)}
                  </td>
                  <td className="px-6 py-3.5">
                    <FullAutoStatusBadge status={row.automationStatus} />
                  </td>
                </tr>
              ))}
                  {!isFullAutoHistoryLoading &&
                    paginatedFullAutoRows.length === 0 && (
                  <>
                    {fullAutoHistoryError && (
                      <AutopilotTableEmptyState colSpan={4}>
                        {fullAutoHistoryError}
                      </AutopilotTableEmptyState>
                    )}
                    {!fullAutoHistoryError && fullAutoRows.length === 0 && (
                      <AutopilotTableEmptyState colSpan={4}>
                        {t("autopilot.fullAutoUi.empty")}
                      </AutopilotTableEmptyState>
                    )}
                    {!fullAutoHistoryError &&
                      fullAutoRows.length > 0 &&
                      filteredRows.length === 0 && (
                        <AutopilotTableEmptyState colSpan={4}>
                          {t("autopilot.fullAutoUi.emptyFiltered")}
                        </AutopilotTableEmptyState>
                      )}
                  </>
                )}
                </>
              )}
            </tbody>
          </table>
        </div>
        <AutopilotTablePagination
          shownFrom={fullAutoShownFrom}
          shownTo={fullAutoShownTo}
          totalItems={fullAutoTotalItems}
          safePage={fullAutoSafePage}
          totalPages={fullAutoTotalPages}
          onPrevious={() => setFullAutoPage((p) => Math.max(1, p - 1))}
          onNext={() =>
            setFullAutoPage((p) => Math.min(fullAutoTotalPages, p + 1))
          }
        />
      </div>
    );

  return (
    <div className="sk-autopilot__stack">
      <AutopilotSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        section="full-auto"
        settings={automationSettings}
        onChange={setAutomationSettings}
        onSave={handleSaveAutomationSettings}
        isLoading={settingsLoading}
        isSaving={isSavingSettings}
        featureEnabled={featureEnabled}
        onFeatureEnabledChange={setFeatureEnabledLocal}
      />

      <div className="sk-autopilot__panel">
        <AutopilotControlPanel
          icon={<Sparkles className="h-5 w-5" />}
          iconAccent="amber"
          title={t("autopilot.fullAutoTitle")}
          powerEnabled={featureEnabled}
          description={
            featureEnabled
              ? t("autopilot.fullAutoUi.cronOn")
              : t("autopilot.fullAutoUi.cronOff")
          }
          filters={renderFilters()}
          actions={
            <>
              <AutopilotPowerButton
                enabled={featureEnabled}
                disabled={isTogglingPower}
                accent="blue"
                onClick={() => void toggleFeaturePower()}
              />
              <AutopilotSettingsIconButton
                label={t("autopilot.fullAutoUi.settingsLabel")}
                onClick={openSettings}
              />
            </>
          }
        />
      </div>

      <div className="sk-autopilot__table mt-0">{renderTable()}</div>
    </div>
  );
}
