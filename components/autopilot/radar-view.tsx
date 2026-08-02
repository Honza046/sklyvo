"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Mail, Maximize2, Phone, Radio, Search } from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { ExpandOverlay } from "@/components/autopilot/expand-overlay";
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
  AutopilotListEmptyState,
  AutopilotTableEmptyState,
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
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";
import { useLanguage } from "@/context/LanguageContext";

/** Počet firem na stránku; ve viewportu je hned vidět pár řádků, zbytek scroll. */
const RADAR_ITEMS_PER_PAGE = 50;
/** Kompaktní — vyplní zbývající výšku, paginace vždy vidět. */
const RADAR_COMPACT_VIEWPORT_CLASS =
  "min-h-0 flex-1 overflow-x-auto overflow-y-auto";
/** Zvětšené okno — vyplní dostupnou výšku, patička zůstane dole. */
const RADAR_EXPANDED_VIEWPORT_CLASS = "min-h-0 flex-1 overflow-x-auto overflow-y-auto";

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
  const [tableExpanded, setTableExpanded] = useState(false);
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
  }, [workspaceLeads.length, searchQuery, tagFilter, presetFilter, dateSort, dateFrom, dateTo]);

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
      label: leadTagLabel(tag),
    }));
  }, [workspaceLeads]);

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

      const matchTag = tagFilter === "all" || (lead.tags ?? []).includes(tagFilter);

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
  }, [workspaceLeads, searchQuery, tagFilter, presetFilter, dateSort, dateFrom, dateTo]);

  const filterControlClass =
    "h-9 shrink-0 rounded-lg border-border bg-card py-0 text-xs shadow-none";

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
      <Select value={presetFilter} onValueChange={(v) => setPresetFilter(v as RadarPresetFilter)}>
        <SelectTrigger className={cn(filterControlClass, "w-full sm:w-[130px]")}>
          <SelectValue placeholder="Kontakt" />
        </SelectTrigger>
        <SelectContent className="z-[220]">
          <SelectItem value="all">Všechny</SelectItem>
          <SelectItem value="with_email">S e-mailem</SelectItem>
          <SelectItem value="without_email">Bez e-mailu</SelectItem>
        </SelectContent>
      </Select>
      <Select value={tagFilter} onValueChange={setTagFilter}>
        <SelectTrigger className={cn(filterControlClass, "w-full sm:w-[150px]")}>
          <SelectValue placeholder="Obor" />
        </SelectTrigger>
        <SelectContent className="z-[220]">
          <SelectItem value="all">Všechny obory</SelectItem>
          {availableTags.map(({ tag, label, count }) => (
            <SelectItem key={tag} value={tag}>
              {label} ({count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateSort} onValueChange={(v) => setDateSort(v as RadarDateSort)}>
        <SelectTrigger className={cn(filterControlClass, "w-full sm:w-[130px]")}>
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

  const radarTotalItems = filteredLeads.length;
  const radarTotalPages = Math.max(1, Math.ceil(radarTotalItems / RADAR_ITEMS_PER_PAGE));
  const radarSafePage = Math.min(radarPage, radarTotalPages);
  const radarPageStart = (radarSafePage - 1) * RADAR_ITEMS_PER_PAGE;
  const paginatedRadarLeads = filteredLeads.slice(
    radarPageStart,
    radarPageStart + RADAR_ITEMS_PER_PAGE,
  );
  const radarShownFrom = radarTotalItems === 0 ? 0 : radarPageStart + 1;
  const radarShownTo =
    radarTotalItems === 0 ? 0 : radarPageStart + paginatedRadarLeads.length;

  const emptyStates = (
    <>
      {isLoading && <AutopilotListEmptyState>Načítám historii sběru…</AutopilotListEmptyState>}
      {!isLoading && loadError && (
        <AutopilotListEmptyState className="text-rose-600 dark:text-rose-400">
          {loadError}
        </AutopilotListEmptyState>
      )}
      {!isLoading && !loadError && workspaceLeads.length === 0 && (
        <AutopilotListEmptyState>
          Zatím žádné nalezené firmy. Spusťte automatický sběr nebo přidejte leady v Radaru.
        </AutopilotListEmptyState>
      )}
      {!isLoading && !loadError && workspaceLeads.length > 0 && filteredLeads.length === 0 && (
        <AutopilotListEmptyState>Žádné firmy neodpovídají filtrům.</AutopilotListEmptyState>
      )}
    </>
  );

  const renderTable = (mode: "compact" | "expanded") => {
    const expanded = mode === "expanded";
    const viewportClass = expanded
      ? RADAR_EXPANDED_VIEWPORT_CLASS
      : RADAR_COMPACT_VIEWPORT_CLASS;
    return (
      <div
        className={cn(
          AUTOPILOT_TABLE_CARD_CLASS,
          "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden sm:mt-0",
        )}
      >
        <div
          className={cn(
            AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
            "md:hidden",
            viewportClass,
          )}
        >
          {paginatedRadarLeads.map((lead) => (
            <div
              key={`${mode}-m-${lead.id}`}
              className="flex items-start gap-3 border-b border-border/40 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-foreground">{lead.company}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {lead.email || t("common.noEmail")}
                  {lead.phone ? ` · ${lead.phone}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatFoundDate(lead.createdAt, dateLocale)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 pt-0.5 text-[11px] font-semibold",
                  leadStatusClassName(lead.leadStatus),
                )}
              >
                {leadStatusLabel(lead.leadStatus)}
              </span>
            </div>
          ))}
          {paginatedRadarLeads.length === 0 && emptyStates}
        </div>

        <div
          className={cn(
            "hidden md:block",
            AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
            viewportClass,
          )}
        >
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
              <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[34%]")}>Firma</th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[28%]")}>Kontakt</th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[20%]")}>Datum nalezení</th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRadarLeads.map((lead) => {
                const web = leadFullWebsiteUrl(lead.url);
                return (
                  <tr
                    key={`${mode}-d-${lead.id}`}
                    className="border-b border-border/40 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-3 py-3">
                      <p className="break-words font-semibold text-foreground">{lead.company}</p>
                      <span className="flex items-center break-words text-xs text-muted-foreground">
                        <Globe className="mr-1 h-3 w-3 shrink-0" />
                        {lead.url || web || "–"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "flex break-words text-sm",
                          lead.email ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        {lead.email || t("common.noEmail")}
                      </span>
                      <span
                        className={cn(
                          "mt-1 flex break-words text-xs",
                          lead.phone ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        {lead.phone || t("common.noPhone")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground">
                      {formatFoundDate(lead.createdAt, dateLocale)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          leadStatusClassName(lead.leadStatus),
                        )}
                      >
                        {leadStatusLabel(lead.leadStatus)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {paginatedRadarLeads.length === 0 && (
                <>
                  {isLoading && (
                    <AutopilotTableEmptyState colSpan={4}>
                      Načítám historii sběru…
                    </AutopilotTableEmptyState>
                  )}
                  {!isLoading && loadError && (
                    <AutopilotTableEmptyState colSpan={4} className="text-rose-600 dark:text-rose-400">
                      {loadError}
                    </AutopilotTableEmptyState>
                  )}
                  {!isLoading && !loadError && workspaceLeads.length === 0 && (
                    <AutopilotTableEmptyState colSpan={4}>
                      Zatím žádné nalezené firmy. Spusťte automatický sběr nebo přidejte leady v
                      Radaru.
                    </AutopilotTableEmptyState>
                  )}
                  {!isLoading &&
                    !loadError &&
                    workspaceLeads.length > 0 &&
                    filteredLeads.length === 0 && (
                      <AutopilotTableEmptyState colSpan={4}>
                        Žádné firmy neodpovídají filtrům.
                      </AutopilotTableEmptyState>
                    )}
                </>
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
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden">
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

      <AutopilotControlPanel
        icon={<Radio className="h-5 w-5" />}
        iconWrapClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        title={t("autopilot.radarTitle")}
        powerEnabled={featureEnabled}
        description={
          featureEnabled
            ? "Cron hledá firmy podle nastavení (~3:00 Praha)."
            : "Cron vypnutý. Ruční hledání je v sekci Radar."
        }
        actions={
          <>
            <AutopilotPowerButton
              enabled={featureEnabled}
              disabled={isTogglingPower}
              accent="emerald"
              onClick={() => void toggleFeaturePower()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setTableExpanded(true)}
              className="h-9 w-9 shrink-0 rounded-lg p-0"
              title="Zvětšit tabulku"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <AutopilotSettingsIconButton
              label={t("autopilot.radarSettings")}
              onClick={openSettings}
              className="rounded-lg border border-border/50 bg-background/90 text-muted-foreground shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-zinc-900/90 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
            />
          </>
        }
      />

      {tableExpanded ? (
        <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center text-sm text-muted-foreground sm:mt-4">
          Historie sběru je otevřená ve zvětšeném okně.
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden sm:mt-4">
          {renderTable("compact")}
        </div>
      )}

      <ExpandOverlay
        open={tableExpanded}
        onClose={() => setTableExpanded(false)}
        title="Historie sběru firem"
        description="Hledání a filtry jsou tady. Po zavření zůstane kompaktní tabulka na stránce."
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="shrink-0 overflow-visible p-px">{renderFilters()}</div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {renderTable("expanded")}
          </div>
        </div>
      </ExpandOverlay>
    </div>
  );
}
