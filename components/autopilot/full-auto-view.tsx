"use client";

import { useEffect, useState } from "react";
import { Globe, Mail, Sparkles } from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getFullAutoProcessHistory,
  type FullAutoProcessHistoryRow,
} from "@/app/actions/autopilot";
import { toast } from "sonner";
import {
  AutopilotControlPanel,
  AutopilotSettingsIconButton,
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
    automationSettings,
    setAutomationSettings,
    openSettings,
    handleSaveAutomationSettings,
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

  const handleActivateFullAuto = () => {
    toast.info("Full Auto bude brzy dostupný. Nastavení si můžete uložit předem.");
  };

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
      />

      <AutopilotControlPanel
        icon={<Sparkles className="h-5 w-5" />}
        iconWrapClassName="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        title="Plná automatizace (Full Auto)"
        description="Radar vyhledává nové firmy a Sniper jim okamžitě posílá personalizované e-maily."
        actions={
          <>
            <Button
              onClick={handleActivateFullAuto}
              className="shrink-0 bg-violet-600 px-6 font-semibold text-white hover:bg-violet-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Aktivovat Full Auto
            </Button>
            <AutopilotSettingsIconButton
              label="Nastavení Full Auto"
              onClick={openSettings}
              className="rounded-lg border border-border/50 bg-background/90 text-muted-foreground shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:bg-zinc-900/90 dark:hover:border-violet-800 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
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
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[24%]")}>
                  Kontakt
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "w-[22%]")}>
                  Čas zpracování
                </th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>
                  Stav automatizace
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedFullAutoRows.map((row) => {
                const web = leadFullWebsiteUrl(row.url);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-3 py-3">
                      <p className="break-words font-semibold text-foreground">{row.company}</p>
                      <span className="flex items-center break-words text-xs text-muted-foreground">
                        <Globe className="mr-1 h-3 w-3 shrink-0" />
                        {row.url || web || "–"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "flex break-words text-sm",
                          row.email ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        {row.email || "Bez e-mailu"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground">
                      {formatProcessedDateTime(row.processedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <FullAutoStatusBadge status={row.automationStatus} />
                    </td>
                  </tr>
                );
              })}
              {paginatedFullAutoRows.length === 0 && (
                <>
                  {isFullAutoHistoryLoading && (
                    <AutopilotTableEmptyState colSpan={4}>
                      Načítám historii automatizace…
                    </AutopilotTableEmptyState>
                  )}
                  {!isFullAutoHistoryLoading && fullAutoHistoryError && (
                    <AutopilotTableEmptyState colSpan={4} className="text-rose-600 dark:text-rose-400">
                      {fullAutoHistoryError}
                    </AutopilotTableEmptyState>
                  )}
                  {!isFullAutoHistoryLoading &&
                    !fullAutoHistoryError &&
                    fullAutoRows.length === 0 && (
                      <AutopilotTableEmptyState colSpan={4}>
                        Zatím žádná aktivita Full Auto. Po spuštění smyčky se zde zobrazí průběh
                        zpracování firem.
                      </AutopilotTableEmptyState>
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
          onNext={() => setFullAutoPage((p) => Math.min(fullAutoTotalPages, p + 1))}
        />
      </div>
    </div>
  );
}
