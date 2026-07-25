"use client";

import { useEffect, useState } from "react";
import { Globe, Mail, Sparkles } from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { cn } from "@/lib/utils";
import {
  getFullAutoProcessHistory,
  type FullAutoProcessHistoryRow,
} from "@/app/actions/autopilot";
import {
  AutopilotControlPanel,
  AutopilotPowerButton,
  AutopilotSettingsIconButton,
  AutopilotListEmptyState,
  AutopilotTableEmptyState,
  AutopilotTablePagination,
  AUTOPILOT_TABLE_CARD_CLASS,
  AUTOPILOT_TABLE_HEAD_CELL_CLASS,
  AUTOPILOT_TABLE_SCROLL_CLASS,
  FullAutoStatusBadge,
  ITEMS_PER_PAGE,
  formatProcessedDateTime,
  leadFullWebsiteUrl,
} from "@/components/autopilot/shared";
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";

export function AutopilotFullAutoView() {
  const [fullAutoPage, setFullAutoPage] = useState(1);
  const [fullAutoRows, setFullAutoRows] = useState<FullAutoProcessHistoryRow[]>([]);
  const [isFullAutoHistoryLoading, setIsFullAutoHistoryLoading] = useState(true);
  const [fullAutoHistoryError, setFullAutoHistoryError] = useState<string | null>(null);

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
  }, [fullAutoRows.length]);

  const fullAutoTotalItems = fullAutoRows.length;
  const fullAutoTotalPages = Math.max(1, Math.ceil(fullAutoTotalItems / ITEMS_PER_PAGE));
  const fullAutoSafePage = Math.min(fullAutoPage, fullAutoTotalPages);
  const fullAutoPageStart = (fullAutoSafePage - 1) * ITEMS_PER_PAGE;
  const paginatedFullAutoRows = fullAutoRows.slice(
    fullAutoPageStart,
    fullAutoPageStart + ITEMS_PER_PAGE,
  );
  const fullAutoShownFrom = fullAutoTotalItems === 0 ? 0 : fullAutoPageStart + 1;
  const fullAutoShownTo =
    fullAutoTotalItems === 0 ? 0 : fullAutoPageStart + paginatedFullAutoRows.length;

  const mobileEmpty = (
    <>
      {isFullAutoHistoryLoading && (
        <AutopilotListEmptyState>Načítám historii…</AutopilotListEmptyState>
      )}
      {!isFullAutoHistoryLoading && fullAutoHistoryError && (
        <AutopilotListEmptyState className="text-rose-600 dark:text-rose-400">
          {fullAutoHistoryError}
        </AutopilotListEmptyState>
      )}
      {!isFullAutoHistoryLoading && !fullAutoHistoryError && fullAutoRows.length === 0 && (
        <AutopilotListEmptyState>Zatím žádná historie Full Auto.</AutopilotListEmptyState>
      )}
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
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

      <AutopilotControlPanel
        icon={<Sparkles className="h-5 w-5" />}
        iconWrapClassName="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        title="Plná automatizace (Full Auto)"
        powerEnabled={featureEnabled}
        description={
          featureEnabled
            ? "Cron kolem 8:00 najde firmy a pošle maily."
            : "Cron neběží — zapni, až budeš chtít celou smyčku."
        }
        actions={
          <>
            <AutopilotPowerButton
              enabled={featureEnabled}
              disabled={isTogglingPower}
              accent="violet"
              onClick={() => void toggleFeaturePower()}
            />
            <AutopilotSettingsIconButton
              label="Nastavení Full Auto"
              onClick={openSettings}
              className="rounded-lg border border-border/50 bg-background/90 text-muted-foreground shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:bg-zinc-900/90 dark:hover:border-violet-800 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
            />
          </>
        }
      />

      <div className={AUTOPILOT_TABLE_CARD_CLASS}>
        {/* Mobile list */}
        <div className="scrollbar-hide max-h-[min(42dvh,280px)] min-h-[160px] overflow-y-auto md:hidden">
          {!isFullAutoHistoryLoading &&
            !fullAutoHistoryError &&
            paginatedFullAutoRows.map((row) => (
              <div
                key={row.id}
                className="flex items-start gap-3 border-b border-border/40 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-foreground">{row.company}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {row.email || "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatProcessedDateTime(row.processedAt)}
                  </p>
                </div>
                <FullAutoStatusBadge status={row.automationStatus} />
              </div>
            ))}
          {(isFullAutoHistoryLoading ||
            fullAutoHistoryError ||
            (!isFullAutoHistoryLoading && !fullAutoHistoryError && fullAutoRows.length === 0)) &&
            mobileEmpty}
        </div>

        {/* Desktop table */}
        <div className={cn(AUTOPILOT_TABLE_SCROLL_CLASS, "hidden md:block")}>
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
              <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[34%]")}>Firma</th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[28%]")}>Kontakt</th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[20%]")}>Zpracování</th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[18%]")}>
                  Stav automatizace
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isFullAutoHistoryLoading ? (
                <AutopilotTableEmptyState colSpan={4}>Načítám historii…</AutopilotTableEmptyState>
              ) : (
                <>
                  {fullAutoHistoryError && (
                    <AutopilotTableEmptyState colSpan={4}>
                      {fullAutoHistoryError}
                    </AutopilotTableEmptyState>
                  )}
                  {!fullAutoHistoryError && fullAutoRows.length === 0 && (
                    <AutopilotTableEmptyState colSpan={4}>
                      Zatím žádná historie Full Auto.
                    </AutopilotTableEmptyState>
                  )}
                  {paginatedFullAutoRows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-6 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{row.company}</p>
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
                          <span className="inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{row.email}</span>
                          </span>
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
          onNext={() => setFullAutoPage((p) => Math.min(fullAutoTotalPages, p + 1))}
        />
      </div>
    </div>
  );
}
