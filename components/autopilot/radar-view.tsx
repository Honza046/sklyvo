"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, Mail, Phone, Radio } from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLeads } from "@/app/actions/crm";
import { runAutomatedRadar } from "@/app/actions/radar";
import { toast } from "sonner";
import {
  AutopilotControlPanel,
  AutopilotSettingsIconButton,
  AutopilotTableEmptyState,
  AutopilotTablePagination,
  AUTOPILOT_TABLE_CARD_CLASS,
  AUTOPILOT_TABLE_HEAD_CELL_CLASS,
  AUTOPILOT_TABLE_SCROLL_CLASS,
  ITEMS_PER_PAGE,
  formatFoundDate,
  leadFullWebsiteUrl,
  leadStatusClassName,
  useAutopilotLabels,
  type WorkspaceLead,
} from "@/components/autopilot/shared";
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";
import { useLanguage } from "@/context/LanguageContext";

export function AutopilotRadarView() {
  const { t } = useLanguage();
  const { leadStatusLabel, dateLocale } = useAutopilotLabels();
  const [workspaceLeads, setWorkspaceLeads] = useState<WorkspaceLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [radarPage, setRadarPage] = useState(1);
  const [isCollecting, setIsCollecting] = useState(false);
  const [radarSummary, setRadarSummary] = useState<string | null>(null);

  const {
    settingsOpen,
    setSettingsOpen,
    settingsLoading,
    isSavingSettings,
    automationSettings,
    setAutomationSettings,
    openSettings,
    handleSaveAutomationSettings,
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
  }, [workspaceLeads.length]);

  const radarTotalItems = workspaceLeads.length;
  const radarTotalPages = Math.max(1, Math.ceil(radarTotalItems / ITEMS_PER_PAGE));
  const radarSafePage = Math.min(radarPage, radarTotalPages);
  const radarPageStart = (radarSafePage - 1) * ITEMS_PER_PAGE;
  const paginatedRadarLeads = workspaceLeads.slice(radarPageStart, radarPageStart + ITEMS_PER_PAGE);
  const radarShownFrom = radarTotalItems === 0 ? 0 : radarPageStart + 1;
  const radarShownTo =
    radarTotalItems === 0 ? 0 : radarPageStart + paginatedRadarLeads.length;

  const handleAutomaticRadarCollect = async () => {
    if (isCollecting) return;

    setIsCollecting(true);
    setRadarSummary(null);

    try {
      const result = await runAutomatedRadar();

      if ("error" in result) {
        toast.error(result.error);
        setRadarSummary(result.error);
        return;
      }

      const summary = `Přidáno ${result.createdCount} nových firem, přeskočeno ${result.skippedCount} duplicit.${
        result.outreachQueued && result.outreachQueued > 0
          ? ` ${result.outreachQueued} firem zařazeno do fronty Sniperu.`
          : ""
      }`;
      setRadarSummary(summary);
      toast.success(summary);

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} dotazů skončilo s chybou.`);
      }

      await loadLeads();
    } catch (e) {
      const message = e instanceof Error ? e.message : t("autopilot.startCollectError");
      toast.error(message);
      setRadarSummary(message);
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      <AutopilotSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        section="radar"
        settings={automationSettings}
        onChange={setAutomationSettings}
        onSave={handleSaveAutomationSettings}
        isLoading={settingsLoading}
        isSaving={isSavingSettings}
      />

      <AutopilotControlPanel
        icon={<Radio className="h-5 w-5" />}
        iconWrapClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        title={t("autopilot.radarTitle")}
        description={t("autopilot.radarDescription")}
        extra={
          radarSummary ? (
            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {radarSummary}
            </p>
          ) : null
        }
        actions={
          <>
            <Button
              onClick={() => void handleAutomaticRadarCollect()}
              disabled={isCollecting}
              className="shrink-0 bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700"
            >
              {isCollecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("autopilot.collecting")}
                </>
              ) : (
                <>
                  <Radio className="mr-2 h-4 w-4" />
                  {t("autopilot.startCollect")}
                </>
              )}
            </Button>
            <AutopilotSettingsIconButton
              label={t("autopilot.radarSettings")}
              onClick={openSettings}
              className="rounded-lg border border-border/50 bg-background/90 text-muted-foreground shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-zinc-900/90 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
            />
          </>
        }
      />

      <div className={AUTOPILOT_TABLE_CARD_CLASS}>
        <div className={AUTOPILOT_TABLE_SCROLL_CLASS}>
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
              <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[34%]")}>
                  Firma
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[28%]")}>
                  Kontakt
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[20%]")}>
                  Datum nalezení
                </th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRadarLeads.map((lead) => {
                const web = leadFullWebsiteUrl(lead.url);
                return (
                  <tr
                    key={lead.id}
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
    </div>
  );
}
