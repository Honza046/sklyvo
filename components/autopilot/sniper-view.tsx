"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Globe,
  Loader2,
  Mail,
  Rocket,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  clearAutopilotEmailQueue,
  getAutopilotEmailQueue,
  queueAutopilotLead,
  updateAutopilotEmailQueueItem,
  type AutopilotEmailQueueRow,
} from "@/app/actions/autopilot";
import { getLeads } from "@/app/actions/crm";
import { computeScheduledTimes, formatSchedulePreview } from "@/lib/email-scheduling";
import { htmlBodyToEditablePlainText } from "@/lib/email-format";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import {
  AutopilotControlPanel,
  AutopilotPowerButton,
  AutopilotSettingsIconButton,
  AutopilotTableEmptyState,
  AutopilotTablePagination,
  AUTOPILOT_TABLE_CARD_CLASS,
  AUTOPILOT_TABLE_HEAD_CELL_CLASS,
  AUTOPILOT_TABLE_SCROLL_CLASS,
  ITEMS_PER_PAGE,
  STATUS_META,
  leadFullWebsiteUrl,
  type AutopilotLead,
  type RunState,
  type RunStatus,
  type WorkspaceLead,
} from "@/components/autopilot/shared";
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";

type ActivePreviewEmail = {
  leadId: string;
  queueId: string;
  companyName: string;
  subject: string;
  htmlBody: string;
};

export function AutopilotSniperView() {
  const [workspaceLeads, setWorkspaceLeads] = useState<WorkspaceLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState<"selection" | "queue">("selection");
  const [campaignLeads, setCampaignLeads] = useState<AutopilotLead[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isForceSending, setIsForceSending] = useState(false);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [states, setStates] = useState<Record<string, RunState>>({});
  const [queueStatusFilter, setQueueStatusFilter] = useState<"all" | "queued" | "error">("all");
  const [queueCurrentPage, setQueueCurrentPage] = useState(1);
  const [activePreviewEmail, setActivePreviewEmail] = useState<ActivePreviewEmail | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isSavingPreview, setIsSavingPreview] = useState(false);

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
  } = useAutopilotSettings("sniper");

  const applyQueueFromRows = useCallback((rows: AutopilotEmailQueueRow[]) => {
    setCampaignLeads(
      rows.map((row) => ({
        id: row.leadId,
        company: row.company,
        url: row.url,
        email: row.email,
      })),
    );
    setStates(
      Object.fromEntries(
        rows.map((row) => {
          if (row.status === "FAILED") {
            return [
              row.leadId,
              {
                status: "error" as RunStatus,
                message: row.errorMessage ?? "Chyba ve frontě",
              },
            ];
          }
          return [
            row.leadId,
            {
              status: "queued" as RunStatus,
              message: `${row.subject} · ${formatSchedulePreview(new Date(row.scheduledAt))}`,
              queueId: row.queueId,
              subject: row.subject,
              htmlBody: row.htmlBody,
            },
          ];
        }),
      ),
    );
  }, []);

  const loadQueue = useCallback(async () => {
    setIsQueueLoading(true);
    try {
      const result = await getAutopilotEmailQueue();
      if ("error" in result && result.error) {
        toast.error(result.error);
        applyQueueFromRows([]);
        return;
      }
      applyQueueFromRows(result.rows ?? []);
    } catch (e) {
      console.error("Autopilot loadQueue error:", e);
      toast.error("Nepodařilo se načíst frontu e-mailů.");
      applyQueueFromRows([]);
    } finally {
      setIsQueueLoading(false);
    }
  }, [applyQueueFromRows]);

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
      setLoadError("Nepodařilo se načíst firmy. Zkuste to prosím znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (activeSubTab === "queue" && !isRunning) {
      void loadQueue();
    }
  }, [activeSubTab, isRunning, loadQueue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [workspaceLeads.length]);

  const leads = useMemo<AutopilotLead[]>(
    () =>
      workspaceLeads
        .filter((lead) => lead.leadStatus === "NEW")
        .map(({ id, company, url, email }) => ({ id, company, url, email })),
    [workspaceLeads],
  );

  const totalItems = leads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = leads.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const shownFrom = totalItems === 0 ? 0 : pageStart + 1;
  const shownTo = totalItems === 0 ? 0 : pageStart + paginatedLeads.length;

  const allPageSelected =
    paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedIds.includes(lead.id));
  const somePageSelected =
    paginatedLeads.some((lead) => selectedIds.includes(lead.id)) && !allPageSelected;
  const allDatabaseSelected = totalItems > 0 && selectedIds.length === totalItems;

  const showSelectAllBanner =
    allPageSelected && totalItems > ITEMS_PER_PAGE && !allDatabaseSelected;

  const toggleAllOnPage = () => {
    if (allPageSelected) {
      const pageIds = new Set(paginatedLeads.map((lead) => lead.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
      return;
    }
    setSelectedIds((prev) =>
      Array.from(new Set([...prev, ...paginatedLeads.map((lead) => lead.id)])),
    );
  };

  const selectAllInDatabase = () => {
    setSelectedIds(leads.map((lead) => lead.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const { processedCount, queuedCount, errorCount } = useMemo(() => {
    let processed = 0;
    let queued = 0;
    let error = 0;
    for (const lead of campaignLeads) {
      const s = states[lead.id]?.status;
      if (s === "queued" || s === "error") processed += 1;
      if (s === "queued") queued += 1;
      if (s === "error") error += 1;
    }
    return { processedCount: processed, queuedCount: queued, errorCount: error };
  }, [campaignLeads, states]);

  const total = campaignLeads.length;
  const progressValue = total > 0 ? (processedCount / total) * 100 : 0;

  const filteredCampaignLeads = useMemo(() => {
    if (queueStatusFilter === "all") return campaignLeads;
    return campaignLeads.filter((lead) => {
      const status = states[lead.id]?.status ?? "pending";
      if (queueStatusFilter === "queued") return status === "queued";
      return status === "error";
    });
  }, [campaignLeads, queueStatusFilter, states]);

  useEffect(() => {
    setQueueCurrentPage(1);
    setActivePreviewEmail(null);
  }, [queueStatusFilter, filteredCampaignLeads.length]);

  useEffect(() => {
    setActivePreviewEmail(null);
  }, [queueCurrentPage]);

  useEffect(() => {
    if (!activePreviewEmail) {
      setEditedSubject("");
      setEditedBody("");
    }
  }, [activePreviewEmail]);

  const openEmailPreview = (preview: ActivePreviewEmail) => {
    const plainBody = preview.htmlBody ? htmlBodyToEditablePlainText(preview.htmlBody) : "";
    setEditedSubject(preview.subject);
    setEditedBody(plainBody);
    setActivePreviewEmail(preview);
  };

  const queueTotalItems = filteredCampaignLeads.length;
  const queueTotalPages = Math.max(1, Math.ceil(queueTotalItems / ITEMS_PER_PAGE));
  const queueSafePage = Math.min(queueCurrentPage, queueTotalPages);
  const queuePageStart = (queueSafePage - 1) * ITEMS_PER_PAGE;
  const paginatedQueueLeads = filteredCampaignLeads.slice(
    queuePageStart,
    queuePageStart + ITEMS_PER_PAGE,
  );
  const queueShownFrom = queueTotalItems === 0 ? 0 : queuePageStart + 1;
  const queueShownTo = queueTotalItems === 0 ? 0 : queuePageStart + paginatedQueueLeads.length;

  const queueFilterTabs = [
    { id: "all" as const, label: "Vše", count: campaignLeads.length },
    { id: "queued" as const, label: "Potvrzeno", count: queuedCount },
    { id: "error" as const, label: "Chyby", count: errorCount },
  ];

  const updateLead = (id: string, next: RunState) => {
    setStates((prev) => ({ ...prev, [id]: next }));
  };

  const handleSavePreview = async () => {
    if (!activePreviewEmail) return;

    const trimmedSubject = editedSubject.trim();
    const trimmedBody = editedBody.trim();
    if (!trimmedSubject) {
      toast.error("Předmět e-mailu nemůže být prázdný.");
      return;
    }
    if (!trimmedBody) {
      toast.error("Tělo e-mailu nemůže být prázdné.");
      return;
    }

    setIsSavingPreview(true);
    try {
      const result = await updateAutopilotEmailQueueItem({
        queueId: activePreviewEmail.queueId,
        subject: trimmedSubject,
        body: trimmedBody,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const existingState = states[activePreviewEmail.leadId];
      const scheduleSuffix = existingState?.message?.includes(" · ")
        ? existingState.message.split(" · ").slice(1).join(" · ")
        : "";

      updateLead(activePreviewEmail.leadId, {
        ...(existingState ?? { status: "queued" as RunStatus }),
        status: "queued",
        queueId: activePreviewEmail.queueId,
        subject: result.subject,
        htmlBody: result.htmlBody,
        message: scheduleSuffix
          ? `${result.subject} · ${scheduleSuffix}`
          : result.subject,
      });

      toast.success("Změny e-mailu byly uloženy.");
      setActivePreviewEmail(null);
    } catch {
      toast.error("Nepodařilo se uložit změny e-mailu.");
    } finally {
      setIsSavingPreview(false);
    }
  };

  const handleStart = async () => {
    if (selectedIds.length === 0 || isRunning) return;

    const isImmediate = automationSettings.sendingStrategy === "immediate";
    let scheduledTimes: Date[];

    if (isImmediate) {
      const now = new Date();
      scheduledTimes = selectedIds.map(() => now);
    } else {
      const windows = [
        { start: automationSettings.window1Start, end: automationSettings.window1End },
        { start: automationSettings.window2Start, end: automationSettings.window2End },
      ].filter((window) => window.start.trim() && window.end.trim());

      if (windows.length === 0) {
        toast.error("Nastavte alespoň jedno platné časové okno v nastavení automatizace.");
        openSettings();
        return;
      }

      const batchSize = Math.max(1, Math.min(automationSettings.maxEmailsPerBatch, 500));

      try {
        scheduledTimes = computeScheduledTimes(selectedIds.length, windows, batchSize);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Neplatná nastavení plánování.";
        toast.error(message);
        return;
      }
    }

    const queue = leads.filter((lead) => selectedIds.includes(lead.id));

    setCampaignLeads(queue);
    setStates(
      Object.fromEntries(selectedIds.map((id) => [id, { status: "pending" as RunStatus }])),
    );
    setActiveSubTab("queue");
    setIsRunning(true);

    for (let index = 0; index < queue.length; index += 1) {
      const lead = queue[index];
      updateLead(lead.id, { status: "processing" });
      try {
        const result = await queueAutopilotLead({
          leadId: lead.id,
          scheduledAt: scheduledTimes[index].toISOString(),
        });
        if ("error" in result) {
          updateLead(lead.id, { status: "error", message: result.error });
        } else {
          updateLead(lead.id, {
            status: "queued",
            message: `${result.subject} · ${formatSchedulePreview(new Date(result.scheduledAt))}`,
            queueId: result.queueId,
            subject: result.subject,
            htmlBody: result.htmlBody,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Neočekávaná chyba.";
        updateLead(lead.id, { status: "error", message });
      }
    }

    setIsRunning(false);
    setSelectedIds([]);

    if (isImmediate) {
      try {
        const response = await fetch("/api/autopilot/force-send", { method: "POST" });
        const result = (await response.json()) as {
          error?: string;
          sent?: number;
          failed?: number;
        };

        if (!response.ok) {
          toast.error(result.error ?? "E-maily jsou ve frontě, ale okamžité odeslání selhalo.");
          return;
        }

        const sent = result.sent ?? 0;
        const failed = result.failed ?? 0;

        if (sent > 0 && failed === 0) {
          toast.success(`${sent} e-mailů bylo vygenerováno a odesláno.`);
        } else if (sent > 0 && failed > 0) {
          toast.warning(`Odesláno ${sent} e-mailů, ${failed} se nepodařilo odeslat.`);
        } else if (failed > 0) {
          toast.error(`Žádný e-mail se nepodařilo odeslat (${failed} chyb).`);
        } else {
          toast.success("E-maily byly vygenerovány a zařazeny do fronty.");
        }
      } catch {
        toast.error("E-maily jsou ve frontě, ale okamžité odeslání selhalo.");
      }
      return;
    }

    toast.success("E-maily byly vygenerovány a zařazeny do fronty.");
  };

  const handleForceSendQueue = async () => {
    if (isForceSending || isRunning || queuedCount === 0) return;

    setIsForceSending(true);
    try {
      const response = await fetch("/api/autopilot/force-send", { method: "POST" });
      const result = (await response.json()) as {
        error?: string;
        sent?: number;
        failed?: number;
      };

      if (!response.ok) {
        toast.error(result.error ?? "Nepodařilo se odeslat e-maily ihned.");
        return;
      }

      const sent = result.sent ?? 0;
      const failed = result.failed ?? 0;

      if (sent === 0 && failed === 0) {
        toast.info("Ve frontě nejsou žádné e-maily k okamžitému odeslání.");
        return;
      }

      if (failed > 0) {
        toast.warning(`Odesláno ${sent} e-mailů, ${failed} se nepodařilo odeslat.`);
      } else {
        toast.success(`Odesláno ${sent} e-mailů ihned.`);
      }

      await loadQueue();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Nepodařilo se odeslat e-maily ihned.";
      toast.error(message);
    } finally {
      setIsForceSending(false);
    }
  };

  const handleClearQueue = async () => {
    if (isRunning || isClearingQueue) return;

    setIsClearingQueue(true);
    try {
      const result = await clearAutopilotEmailQueue();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setCampaignLeads([]);
      setStates({});
      setQueueStatusFilter("all");
      toast.success("Fronta byla vyčištěna.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Nepodařilo se vyčistit frontu.";
      toast.error(message);
    } finally {
      setIsClearingQueue(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <AutopilotSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        section="sniper"
        settings={automationSettings}
        onChange={setAutomationSettings}
        onSave={handleSaveAutomationSettings}
        isLoading={settingsLoading}
        isSaving={isSavingSettings}
        featureEnabled={featureEnabled}
        onFeatureEnabledChange={setFeatureEnabledLocal}
      />

      <AutopilotControlPanel
        icon={<Send className="h-5 w-5" />}
        iconWrapClassName="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        title="Automatické odesílání e-mailů"
        powerEnabled={featureEnabled}
        description={
          featureEnabled
            ? "Automatické odesílání zapnuté — cron posílá splatné maily z fronty."
            : "Automatické odesílání vypnuté — cron nic neposílá. Ruční odeslání funguje dál."
        }
        actions={
          <>
            <AutopilotPowerButton
              enabled={featureEnabled}
              disabled={isTogglingPower}
              accent="blue"
              onClick={() => void toggleFeaturePower()}
            />
            <button
              type="button"
              onClick={() => void handleForceSendQueue()}
              disabled={queuedCount === 0 || isRunning || isForceSending}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-blue-600 px-4",
                "bg-white text-sm font-medium text-blue-600 transition-colors",
                "hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-50",
                "dark:bg-zinc-900 dark:hover:bg-zinc-800",
              )}
            >
              {isForceSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Odeslat e-maily ihned
            </button>
            <Button
              onClick={() => void handleStart()}
              disabled={selectedIds.length === 0 || isRunning}
              className="h-9 shrink-0 bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Spustit Autopilota
            </Button>
            <AutopilotSettingsIconButton
              label="Nastavení odesílání"
              onClick={openSettings}
              className="h-9 w-9 rounded-lg border border-border/50 bg-background/90 text-muted-foreground shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:bg-zinc-900/90 dark:hover:border-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
            />
          </>
        }
      />

      <div className="mt-6 flex shrink-0 items-center gap-5 border-b border-border/60">
        <button
          type="button"
          onClick={() => setActiveSubTab("selection")}
          className={cn(
            "-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors",
            activeSubTab === "selection"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Výběr firem k oslovení
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("queue")}
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors",
            activeSubTab === "queue"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Naplánovaná fronta a logy
          {queuedCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {queuedCount}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === "selection" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showSelectAllBanner && (
            <div className="mt-4 shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              Jsou vybrány všechny firmy na této stránce ({paginatedLeads.length}).{" "}
              <button
                type="button"
                onClick={selectAllInDatabase}
                className="font-semibold underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-200"
              >
                Vybrat úplně všechny neoslovené firmy v databázi ({totalItems})
              </button>
            </div>
          )}

          <div className={cn(AUTOPILOT_TABLE_CARD_CLASS, "relative z-0 mt-4 shrink-0")}>
            <div className={AUTOPILOT_TABLE_SCROLL_CLASS}>
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
                  <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <th
                      className={cn(
                        AUTOPILOT_TABLE_HEAD_CELL_CLASS,
                        "w-[44px] bg-white text-center dark:bg-zinc-950",
                      )}
                    >
                      <div className="flex h-full items-center justify-center">
                        <Checkbox
                          checked={
                            allPageSelected ? true : somePageSelected ? "indeterminate" : false
                          }
                          onCheckedChange={toggleAllOnPage}
                          disabled={paginatedLeads.length === 0}
                        />
                      </div>
                    </th>
                    <th
                      className={cn(
                        AUTOPILOT_TABLE_HEAD_CELL_CLASS,
                        "w-[55%] bg-white dark:bg-zinc-950",
                      )}
                    >
                      Firma
                    </th>
                    <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "bg-white dark:bg-zinc-950")}>
                      Kontakt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead) => {
                    const web = leadFullWebsiteUrl(lead.url);
                    const checked = selectedIds.includes(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/40"
                        onClick={() => toggleOne(lead.id)}
                      >
                        <td
                          className="px-3 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-center">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleOne(lead.id)}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="break-words font-semibold text-foreground">
                            {lead.company}
                          </p>
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
                            {lead.email || "Bez e-mailu"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedLeads.length === 0 && (
                    <>
                      {isLoading && (
                        <AutopilotTableEmptyState colSpan={3}>Načítám firmy…</AutopilotTableEmptyState>
                      )}
                      {!isLoading && loadError && (
                        <AutopilotTableEmptyState colSpan={3} className="text-rose-600 dark:text-rose-400">
                          {loadError}
                        </AutopilotTableEmptyState>
                      )}
                      {!isLoading && !loadError && leads.length === 0 && (
                        <AutopilotTableEmptyState colSpan={3}>
                          Žádné neoslovené firmy. Přidejte leady v sekci Radar nebo CRM.
                        </AutopilotTableEmptyState>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <AutopilotTablePagination
              shownFrom={shownFrom}
              shownTo={shownTo}
              totalItems={totalItems}
              safePage={safePage}
              totalPages={totalPages}
              selectedCount={selectedIds.length}
              onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isQueueLoading && campaignLeads.length === 0 ? (
            <div className="mt-6 shrink-0 rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
              Načítám naplánovanou frontu…
            </div>
          ) : campaignLeads.length === 0 ? (
            <div className="mt-6 shrink-0 rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
              Zatím nemáte naplánovanou frontu. Vyberte firmy a spusťte Autopilota.
            </div>
          ) : (
            <>
              <div className="mt-6 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex shrink-0 items-center gap-2 text-sm font-semibold leading-none text-foreground">
                      {isRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                      {isRunning ? "Generuji a řadím do fronty…" : "Fronta připravena"}
                    </span>
                    <span className="shrink-0 text-xs font-medium leading-none text-emerald-600">
                      ✓ Ve frontě: {queuedCount}
                    </span>
                    <span className="shrink-0 text-xs font-medium leading-none text-rose-600">
                      ✕ Chyby: {errorCount}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs leading-none text-muted-foreground">
                      Zpracováno {processedCount} / {total}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isRunning || isClearingQueue}
                          className="inline-flex h-7 shrink-0 items-center border-red-200 px-2.5 py-0 text-xs leading-none text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          {isClearingQueue ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1 h-3 w-3" />
                          )}
                          Vyčistit frontu
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border bg-white shadow-md dark:bg-zinc-950">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Opravdu chcete vyčistit frontu?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tato akce nenávratně smaže všechny naplánované e-maily čekající na odeslání a
                            vymaže historii logů.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleClearQueue()}
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            Smazat frontu
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <Progress value={progressValue} className="h-1 rounded-none" />
              </div>

              <div className="mt-4 shrink-0 overflow-hidden rounded-xl border border-border/60 border-b border-gray-200 bg-card shadow-sm dark:border-b-border/60">
                <div className="px-4 pt-4 pb-3">
                  <p className="mb-3 text-sm font-semibold text-foreground">
                    Fronta připravena k odeslání
                  </p>

                  <div className="flex flex-wrap items-center gap-4 border-b border-border/60">
                    {queueFilterTabs.map(({ id, label, count }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setQueueStatusFilter(id)}
                        className={cn(
                          "-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-xs font-medium transition-colors sm:text-sm",
                          queueStatusFilter === id
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[190px] min-h-[190px] max-h-[190px] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full table-fixed text-sm">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
                      <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <th className="sticky top-0 z-10 h-10 w-[34%] bg-white px-3 py-2 align-middle dark:bg-zinc-950">
                          Firma
                        </th>
                        <th className="sticky top-0 z-10 h-10 w-[24%] bg-white px-3 py-2 align-middle dark:bg-zinc-950">
                          Kontakt
                        </th>
                        <th className="sticky top-0 z-10 h-10 w-[22%] bg-white px-3 py-2 align-middle dark:bg-zinc-950">
                          Stav
                        </th>
                        <th className="sticky top-0 z-10 h-10 w-[20%] bg-white px-3 py-2 align-middle dark:bg-zinc-950">
                          Náhled
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedQueueLeads.map((lead) => {
                        const state = states[lead.id] ?? { status: "pending" as RunStatus };
                        const meta = STATUS_META[state.status];
                        const canPreview =
                          state.status === "queued" && Boolean(state.subject && state.queueId);

                        return (
                          <tr key={lead.id} className="border-b border-border/40">
                            <td className="px-3 py-2.5">
                              <p className="truncate font-semibold text-foreground">{lead.company}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="truncate text-xs text-muted-foreground">
                                {lead.email || "Bez e-mailu"}
                              </p>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={cn("text-xs font-semibold", meta.className)}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {canPreview ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEmailPreview({
                                      leadId: lead.id,
                                      queueId: state.queueId!,
                                      companyName: lead.company,
                                      subject: state.subject!,
                                      htmlBody: state.htmlBody ?? "",
                                    })
                                  }
                                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  <Eye className="h-4 w-4 shrink-0" />
                                  Zobrazit e-mail
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {paginatedQueueLeads.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-xs text-muted-foreground"
                          >
                            {queueStatusFilter === "all"
                              ? "Fronta je prázdná."
                              : queueStatusFilter === "queued"
                                ? "Zatím žádné potvrzené e-maily ve frontě."
                                : "Zatím žádné chyby."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <AutopilotTablePagination
                  className="rounded-b-xl border-gray-100 bg-white p-4 dark:border-border/60 dark:bg-card sm:flex-row sm:items-center sm:justify-between sm:px-4"
                  shownFrom={queueShownFrom}
                  shownTo={queueShownTo}
                  totalItems={queueTotalItems}
                  safePage={queueSafePage}
                  totalPages={queueTotalPages}
                  onPrevious={() => setQueueCurrentPage((p) => Math.max(1, p - 1))}
                  onNext={() => setQueueCurrentPage((p) => Math.min(queueTotalPages, p + 1))}
                />
              </div>
            </>
          )}
        </div>
      )}

      <Dialog
        open={activePreviewEmail !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setActivePreviewEmail(null);
        }}
      >
        <DialogContent
          overlayClassName="bg-black/40 backdrop-blur-sm"
          className="!top-[5vh] !flex max-h-[90vh] w-full max-w-3xl !translate-x-[-50%] !translate-y-0 flex-col gap-0 overflow-y-auto p-0 sm:rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {activePreviewEmail && (
            <>
              <DialogHeader className="space-y-1 border-b border-border/60 px-6 py-4 pr-12 text-left">
                <DialogTitle className="text-base font-semibold leading-snug">
                  Náhled e-mailu pro {activePreviewEmail.companyName}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-5 px-6 py-5 pb-6">
                <div className="space-y-2">
                  <label
                    htmlFor="autopilot-email-subject"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Předmět:
                  </label>
                  <input
                    id="autopilot-email-subject"
                    type="text"
                    value={editedSubject}
                    onChange={(event) => setEditedSubject(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border/60 bg-background px-4 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="autopilot-email-body"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Tělo e-mailu:
                  </label>
                  <TextareaAutosize
                    id="autopilot-email-body"
                    value={editedBody}
                    onChange={(event) => setEditedBody(event.target.value)}
                    minRows={12}
                    className="box-border w-full resize-none overflow-y-hidden whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/20 px-5 py-4 text-sm leading-relaxed text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-border/60 bg-background px-6 py-4 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActivePreviewEmail(null)}
                  disabled={isSavingPreview}
                >
                  Zavřít
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSavePreview()}
                  disabled={isSavingPreview}
                  className="h-9 rounded-lg bg-blue-600 px-4 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {isSavingPreview ? "Ukládám…" : "Uložit změny"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
