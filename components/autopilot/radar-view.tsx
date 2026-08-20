"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Globe, Mail, Phone } from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { FilterSearch } from "@/components/autopilot/filter-search";
import { CopyEmailButton } from "@/components/copy-email-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getLeads } from "@/app/actions/crm";
import { leadTagLabel, LEAD_TAG_ORDER } from "@/lib/lead-tags";
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
  formatFoundDate,
  leadFullWebsiteUrl,
  leadStatusClassName,
  useAutopilotLabels,
  type WorkspaceLead,
} from "@/components/autopilot/shared";
import { AutopilotTableSkeletonRows } from "@/components/autopilot/autopilot-table-skeleton";
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";
import { useLanguage } from "@/context/LanguageContext";

/** Počet firem na stránku; ve viewportu je hned vidět pár řádků, zbytek scroll. */
const RADAR_ITEMS_PER_PAGE = 50;
const RADAR_TABLE_VIEWPORT_CLASS =
  "min-h-0 flex-1 overflow-x-auto overflow-y-auto";

type RadarDateSort = "newest" | "oldest" | "range";
type RadarPresetFilter = "all" | "with_email" | "without_email";

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

export function AutopilotRadarView() {
  const { t } = useLanguage();
  const { leadStatusLabel, dateLocale } = useAutopilotLabels();
  const [workspaceLeads, setWorkspaceLeads] = useState<WorkspaceLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [radarPage, setRadarPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [presetFilter, setPresetFilter] = useState<RadarPresetFilter>("all");
  const [dateSort, setDateSort] = useState<RadarDateSort>("newest");
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
  } = useAutopilotSettings("radar");

  const loadLeads = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getLeads();
      if ("error" in result && result.error) {
        setWorkspaceLeads([]);
        setLoadError(result.error);
        return;
      }
      const fresh = (result.leads ?? []).map((lead) => ({
        id: lead.id,
        company: lead.company,
        url: lead.url,
        email: (lead.email ?? "").trim(),
        phone: (lead.phone ?? "").trim(),
        createdAt: lead.createdAt,
        leadStatus: lead.leadStatus,
        tags: Array.isArray(lead.tags) ? lead.tags : [],
      }));
      setWorkspaceLeads(fresh);
    } catch (e) {
      console.error("Autopilot loadLeads error:", e);
      setWorkspaceLeads([]);
      setLoadError(t("autopilot.loadLeadsError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  useEffect(() => {
    setRadarPage(1);
  }, [
    workspaceLeads.length,
    searchQuery,
    tagFilter,
    presetFilter,
    dateSort,
    dateFrom,
    dateTo,
  ]);

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of workspaceLeads) {
      for (const tag of lead.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return LEAD_TAG_ORDER.filter((tag) => counts.has(tag)).map((tag) => ({
      tag,
      count: counts.get(tag) ?? 0,
      label: leadTagLabel(tag, t),
    }));
  }, [workspaceLeads, t]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const from = startOfLocalDay(dateFrom);
    const to = endOfLocalDay(dateTo);

    const filtered = workspaceLeads.filter((lead) => {
      const matchText =
        !q ||
        lead.company.toLowerCase().includes(q) ||
        lead.url.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q);

      const matchTag =
        tagFilter === "all" || (lead.tags ?? []).includes(tagFilter);

      const hasEmail = Boolean(lead.email?.trim());
      const matchPreset =
        presetFilter === "all" ||
        (presetFilter === "with_email" && hasEmail) ||
        (presetFilter === "without_email" && !hasEmail);

      const created = new Date(lead.createdAt);
      const matchRange =
        dateSort !== "range" ||
        ((!from || created >= from) && (!to || created <= to));

      return matchText && matchTag && matchPreset && matchRange;
    });

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (dateSort === "oldest") return aTime - bTime;
      return bTime - aTime;
    });
  }, [
    workspaceLeads,
    searchQuery,
    tagFilter,
    presetFilter,
    dateSort,
    dateFrom,
    dateTo,
  ]);

  const filterControlClass =
    "sk-filter-chip h-9 shrink-0 py-0 text-xs shadow-none";

  const renderFilters = () => (
    <div className="flex shrink-0 flex-col gap-2 overflow-visible sm:flex-row sm:flex-wrap sm:items-center">
      <FilterSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t("autopilot.searchPlaceholder")}
        className="min-w-0 flex-1 sm:min-w-[160px]"
      />
      <Select
        value={presetFilter}
        onValueChange={(v) => setPresetFilter(v as RadarPresetFilter)}
      >
        <SelectTrigger
          className={cn(filterControlClass, "w-full sm:w-[130px]")}
        >
          <SelectValue placeholder={t("autopilot.filterContact")} />
        </SelectTrigger>
        <SelectContent className="z-[220]">
          <SelectItem value="all">{t("autopilot.filterAll")}</SelectItem>
          <SelectItem value="with_email">
            {t("autopilot.filterWithEmail")}
          </SelectItem>
          <SelectItem value="without_email">
            {t("autopilot.filterWithoutEmail")}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select value={tagFilter} onValueChange={setTagFilter}>
        <SelectTrigger
          className={cn(filterControlClass, "w-full sm:w-[150px]")}
        >
          <SelectValue placeholder={t("autopilot.filterIndustry")} />
        </SelectTrigger>
        <SelectContent className="z-[220]">
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
      <Select
        value={dateSort}
        onValueChange={(v) => setDateSort(v as RadarDateSort)}
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
  );

  const radarTotalItems = filteredLeads.length;
  const radarTotalPages = Math.max(
    1,
    Math.ceil(radarTotalItems / RADAR_ITEMS_PER_PAGE),
  );
  const radarSafePage = Math.min(radarPage, radarTotalPages);
  const radarPageStart = (radarSafePage - 1) * RADAR_ITEMS_PER_PAGE;
  const paginatedRadarLeads = filteredLeads.slice(
    radarPageStart,
    radarPageStart + RADAR_ITEMS_PER_PAGE,
  );
  const radarShownFrom = radarTotalItems === 0 ? 0 : radarPageStart + 1;
  const radarShownTo =
    radarTotalItems === 0 ? 0 : radarPageStart + paginatedRadarLeads.length;

  const renderTable = () => (
      <div
        className={cn(
          AUTOPILOT_TABLE_CARD_CLASS,
          "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden sm:mt-0",
        )}
      >
        <div
          className={cn(
            "sk-data-panel__scroll",
            AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
            RADAR_TABLE_VIEWPORT_CLASS,
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
                  {t("autopilot.colFoundAt")}
                </th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>
                  {t("autopilot.colStatus")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                paginatedRadarLeads.map((lead) => {
                const web = leadFullWebsiteUrl(lead.url);
                return (
                  <tr key={`radar-d-${lead.id}`}>
                    <td className="px-3 py-2.5">
                      <p className="break-words text-[13px] font-semibold text-foreground">
                        {lead.company}
                      </p>
                      <span className="mt-0.5 flex items-center break-words text-[11px] text-muted-foreground">
                        <Globe className="mr-1 h-3 w-3 shrink-0" />
                        {lead.url || web || "–"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-0.5">
                        {lead.email ? (
                          <CopyEmailButton
                            email={lead.email}
                            size="sm"
                            variant="ghost"
                          />
                        ) : (
                          <Mail className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 truncate text-[13px]",
                            lead.email
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                          title={lead.email || undefined}
                        >
                          {lead.email || t("common.noEmail")}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 flex break-words text-[11px]",
                          lead.phone
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        {lead.phone || t("common.noPhone")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-foreground">
                      {formatFoundDate(lead.createdAt, dateLocale)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "text-[11px] font-semibold",
                          leadStatusClassName(lead.leadStatus),
                        )}
                      >
                        {leadStatusLabel(lead.leadStatus)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {isLoading && workspaceLeads.length === 0 ? (
                <AutopilotTableLoadingSpinner colSpan={4} />
              ) : isLoading ? (
                <AutopilotTableSkeletonRows rows={8} columns={4} variant="lead" />
              ) : (
                paginatedRadarLeads.length === 0 && (
                  <>
                    {loadError && (
                      <AutopilotTableEmptyState
                        colSpan={4}
                        className="text-rose-600 "
                      >
                        {loadError}
                      </AutopilotTableEmptyState>
                    )}
                    {!loadError && workspaceLeads.length === 0 && (
                      <AutopilotTableEmptyState colSpan={4}>
                        {t("autopilot.emptyNoLeads")}
                      </AutopilotTableEmptyState>
                    )}
                    {!loadError &&
                      workspaceLeads.length > 0 &&
                      filteredLeads.length === 0 && (
                        <AutopilotTableEmptyState colSpan={4}>
                          {t("autopilot.emptyNoMatch")}
                        </AutopilotTableEmptyState>
                      )}
                  </>
                )
              )}
            </tbody>
          </table>
        </div>

        <AutopilotTablePagination
          shownFrom={radarShownFrom}
          shownTo={radarShownTo}
          totalItems={radarTotalItems}
          safePage={radarSafePage}
          totalPages={radarTotalPages}
          onPrevious={() => setRadarPage((p) => Math.max(1, p - 1))}
          onNext={() => setRadarPage((p) => Math.min(radarTotalPages, p + 1))}
        />
      </div>
    );

  return (
    <div className="sk-autopilot__stack">
      <AutopilotSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        section="radar"
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
          icon={<Building2 className="h-5 w-5" />}
          iconAccent="cyan"
          title={t("autopilot.radarTitle")}
          powerEnabled={featureEnabled}
          description={
            featureEnabled
              ? t("autopilot.radarCronOn")
              : t("autopilot.radarCronOff")
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
                label={t("autopilot.radarSettings")}
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
