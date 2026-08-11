"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Maximize2, Search, Sparkles } from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { ExpandOverlay } from "@/components/autopilot/expand-overlay";
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
import {
  getFullAutoProcessHistory,
  type FullAutoAutomationStatus,
  type FullAutoProcessHistoryRow,
} from "@/app/actions/autopilot";
import {
  AutopilotControlPanel,
  AutopilotPowerButton,
  AutopilotIconButton,
  AutopilotSettingsIconButton,
  AutopilotTableEmptyState,
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
  const [fullAutoPage, setFullAutoPage] = useState(1);
  const [fullAutoRows, setFullAutoRows] = useState<FullAutoProcessHistoryRow[]>(
    [],
  );
  const [isFullAutoHistoryLoading, setIsFullAutoHistoryLoading] =
    useState(true);
  const [fullAutoHistoryError, setFullAutoHistoryError] = useState<
    string | null
  >(null);
  const [tableExpanded, setTableExpanded] = useState(false);
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
      setFullAutoHistoryError("Nepodařilo se načíst historii Full Auto.");
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
    <div className="flex shrink-0 flex-col gap-2 overflow-visible sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 flex-1 sm:min-w-[160px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hledat firmu, e-mail, web…"
          className={cn(filterControlClass, "w-full pl-8")}
          autoComplete="off"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          Jen s e-mailem
        </span>
        <Switch
          checked={onlyWithEmail}
          onCheckedChange={setOnlyWithEmail}
          className="sk-switch--sm shrink-0"
          aria-label="Jen s e-mailem"
        />
      </div>
      <Select
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as FullAutoStatusFilter)}
      >
        <SelectTrigger
          className={cn(filterControlClass, "w-full sm:w-[150px]")}
        >
          <SelectValue placeholder="Stav" />
        </SelectTrigger>
        <SelectContent className="z-[220]">
          {FULL_AUTO_STATUS_FILTERS.map((status) => (
            <SelectItem key={status} value={status}>
              {status === "all"
                ? "Všechny stavy"
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
          <SelectValue placeholder="Datum" />
        </SelectTrigger>
        <SelectContent className="z-[220]">
          <SelectItem value="newest">Nejnovější</SelectItem>
          <SelectItem value="oldest">Nejstarší</SelectItem>
          <SelectItem value="range">Od–do</SelectItem>
        </SelectContent>
      </Select>
      {dateSort === "range" ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={cn(filterControlClass, "w-full sm:w-[132px]")}
            title="Od data"
          />
          <span className="text-[11px] text-muted-foreground">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={cn(filterControlClass, "w-full sm:w-[132px]")}
            title="Do data"
          />
        </div>
      ) : null}
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

  const renderTable = (mode: "compact" | "expanded") => {
    const expanded = mode === "expanded";
    return (
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
            <thead className="sticky top-0 z-20 bg-white ">
              <tr className="text-left">
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[34%]")}>
                  Firma
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[28%]")}>
                  Kontakt
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[20%]")}>
                  Zpracování
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[18%]")}>
                  Stav automatizace
                </th>
              </tr>
            </thead>
            <tbody>
              {!isFullAutoHistoryLoading &&
                paginatedFullAutoRows.map((row) => (
                <tr key={`${mode}-d-${row.id}`}>
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
              {isFullAutoHistoryLoading ? (
                <AutopilotTableSkeletonRows rows={8} columns={4} />
              ) : (
                paginatedFullAutoRows.length === 0 && (
                  <>
                    {fullAutoHistoryError && (
                      <AutopilotTableEmptyState colSpan={4}>
                        {fullAutoHistoryError}
                      </AutopilotTableEmptyState>
                    )}
                    {!fullAutoHistoryError && fullAutoRows.length === 0 && (
                      <AutopilotTableEmptyState colSpan={4}>
                        Zatím žádné firmy z Full Auto. Po zapnutí a běhu se tady
                        ukážou jen firmy, které Full Auto najde a pošle (ne ze
                        Sběru / Odesílání).
                      </AutopilotTableEmptyState>
                    )}
                    {!fullAutoHistoryError &&
                      fullAutoRows.length > 0 &&
                      filteredRows.length === 0 && (
                        <AutopilotTableEmptyState colSpan={4}>
                          Žádné firmy neodpovídají filtrům.
                        </AutopilotTableEmptyState>
                      )}
                  </>
                )
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
  };

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
          iconWrapClassName="sk-page-badge"
          title="Plná automatizace (Full Auto)"
          powerEnabled={featureEnabled}
          description={
            featureEnabled
              ? "Cron kolem 8:00 najde firmy a pošle maily."
              : "Cron neběží. Zapni, až budeš chtít celou smyčku."
          }
          actions={
            <>
              <AutopilotPowerButton
                enabled={featureEnabled}
                disabled={isTogglingPower}
                accent="blue"
                onClick={() => void toggleFeaturePower()}
              />
              <AutopilotIconButton
                label="Zvětšit tabulku"
                onClick={() => setTableExpanded(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </AutopilotIconButton>
              <AutopilotSettingsIconButton
                label="Nastavení Full Auto"
                onClick={openSettings}
              />
            </>
          }
        />
      </div>

      {tableExpanded ? (
        <div className="sk-autopilot__table mt-0 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
          Historie Full Auto je otevřená ve zvětšeném okně.
        </div>
      ) : (
        <div className="sk-autopilot__table mt-0">{renderTable("compact")}</div>
      )}

      <ExpandOverlay
        open={tableExpanded}
        onClose={() => setTableExpanded(false)}
        title="Historie Full Auto"
        description="Hledání a filtry jsou tady. Po zavření zůstane kompaktní tabulka na stránce."
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="shrink-0 overflow-visible p-px">
            {renderFilters()}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {renderTable("expanded")}
          </div>
        </div>
      </ExpandOverlay>
    </div>
  );
}
