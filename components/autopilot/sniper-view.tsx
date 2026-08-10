"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Eye,
  Globe,
  Info,
  Loader2,
  Maximize2,
  Phone,
  Search,
  Send,
  Trash2,
  Wand2,
} from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { ExpandOverlay } from "@/components/autopilot/expand-overlay";
import { CopyEmailButton } from "@/components/copy-email-button";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  clearAutopilotEmailQueue,
  forceSendAutopilotQueueItem,
  getAutopilotEmailQueue,
  queueAutopilotLead,
  updateAutopilotEmailQueueItem,
  updateAutopilotQueueRecipient,
  type AutopilotEmailQueueRow,
} from "@/app/actions/autopilot";
import { getLeads } from "@/app/actions/crm";
import {
  computeScheduledTimes,
  formatSchedulePreview,
} from "@/lib/email-scheduling";
import { getActiveScheduleWindows } from "@/lib/autopilot-settings";
import { htmlBodyToEditablePlainText } from "@/lib/email-format";
import { leadTagLabel, LEAD_TAG_ORDER } from "@/lib/lead-tags";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import {
  AutopilotControlPanel,
  AutopilotPowerButton,
  AutopilotIconButton,
  AutopilotSettingsIconButton,
  AutopilotListEmptyState,
  AutopilotTableEmptyState,
  AutopilotTablePagination,
  AUTOPILOT_TABLE_CARD_CLASS,
  AUTOPILOT_TABLE_HEAD_CELL_CLASS,
  AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
  ITEMS_PER_PAGE,
  SNIPER_SETTINGS_STORAGE_KEY,
  STATUS_META,
  formatFoundDate,
  formatQueueDateTime,
  leadFullWebsiteUrl,
  type AutopilotLead,
  type RunState,
  type RunStatus,
  type WorkspaceLead,
} from "@/components/autopilot/shared";
import { useAutopilotSettings } from "@/components/autopilot/use-autopilot-settings";

/** Stejný scroll model jako Sběr firem — flex overflow, ne absolute (rozbíjel zarovnání thead/td). */
const SNIPER_SELECTION_VIEWPORT_CLASS =
  "min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

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
  const [activeSubTab, setActiveSubTab] = useState<"selection" | "queue">(
    "selection",
  );
  const [queueExpanded, setQueueExpanded] = useState(false);
  const [selectionExpanded, setSelectionExpanded] = useState(false);
  const [selectionDateFilter, setSelectionDateFilter] = useState<
    "all" | "last_7_days" | "last_30_days" | "this_year"
  >("all");
  const [selectionTagFilter, setSelectionTagFilter] = useState<string>("all");
  const [selectionSearch, setSelectionSearch] = useState("");
  const [campaignLeads, setCampaignLeads] = useState<AutopilotLead[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isForceSending, setIsForceSending] = useState(false);
  const [forceSendingQueueId, setForceSendingQueueId] = useState<string | null>(
    null,
  );
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [states, setStates] = useState<Record<string, RunState>>({});
  const [queueStatusFilter, setQueueStatusFilter] = useState<
    "all" | "queued" | "error"
  >("all");
  const [queueSearch, setQueueSearch] = useState("");
  const [queueCurrentPage, setQueueCurrentPage] = useState(1);
  const [activePreviewEmail, setActivePreviewEmail] =
    useState<ActivePreviewEmail | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [savingEmailLeadId, setSavingEmailLeadId] = useState<string | null>(
    null,
  );

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
        author: row.author,
        scheduledAt: row.scheduledAt,
        createdAt: row.createdAt,
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
                queueId: row.queueId,
                subject: row.subject,
                htmlBody: row.htmlBody,
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
        tags: Array.isArray(lead.tags) ? lead.tags : [],
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

  const onlyWithEmail = Boolean(automationSettings.onlyWithEmail);

  const setOnlyWithEmail = (checked: boolean) => {
    setAutomationSettings((prev) => ({ ...prev, onlyWithEmail: checked }));
    try {
      const raw = window.localStorage.getItem(SNIPER_SETTINGS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      window.localStorage.setItem(
        SNIPER_SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...parsed, onlyWithEmail: checked }),
      );
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    workspaceLeads.length,
    selectionDateFilter,
    selectionTagFilter,
    selectionSearch,
    onlyWithEmail,
  ]);

  /** Stejný základ jako tabulka (NEW + e-mail + datum), bez tagu a hledání — počty ve filtru = co uvidíš. */
  const selectionBaseLeads = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return workspaceLeads.filter((lead) => {
      if (lead.leadStatus !== "NEW") return false;
      if (onlyWithEmail && !lead.email?.trim()) return false;
      const created = new Date(lead.createdAt);
      if (selectionDateFilter === "last_7_days") return created >= sevenDaysAgo;
      if (selectionDateFilter === "last_30_days")
        return created >= thirtyDaysAgo;
      if (selectionDateFilter === "this_year") {
        return created.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [workspaceLeads, onlyWithEmail, selectionDateFilter]);

  const availableSelectionTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of selectionBaseLeads) {
      for (const tag of lead.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return LEAD_TAG_ORDER.filter((tag) => counts.has(tag)).map((tag) => ({
      tag,
      count: counts.get(tag) ?? 0,
      label: leadTagLabel(tag),
    }));
  }, [selectionBaseLeads]);

  const leads = useMemo<AutopilotLead[]>(() => {
    const q = selectionSearch.trim().toLowerCase();

    return selectionBaseLeads
      .filter((lead) => {
        if (selectionTagFilter === "all") return true;
        return (lead.tags ?? []).includes(selectionTagFilter);
      })
      .filter((lead) => {
        if (!q) return true;
        return (
          lead.company.toLowerCase().includes(q) ||
          lead.url.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          (lead.tags ?? []).some(
            (tag) =>
              leadTagLabel(tag).toLowerCase().includes(q) || tag.includes(q),
          )
        );
      })
      .map(({ id, company, url, email, phone, createdAt }) => ({
        id,
        company,
        url,
        email,
        phone,
        createdAt,
      }));
  }, [selectionBaseLeads, selectionTagFilter, selectionSearch]);

  useEffect(() => {
    const allowed = new Set(leads.map((lead) => lead.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [leads]);

  const totalItems = leads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = leads.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const shownFrom = totalItems === 0 ? 0 : pageStart + 1;
  const shownTo = totalItems === 0 ? 0 : pageStart + paginatedLeads.length;

  const allPageSelected =
    paginatedLeads.length > 0 &&
    paginatedLeads.every((lead) => selectedIds.includes(lead.id));
  const somePageSelected =
    paginatedLeads.some((lead) => selectedIds.includes(lead.id)) &&
    !allPageSelected;
  const allDatabaseSelected =
    totalItems > 0 && selectedIds.length === totalItems;

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
    return {
      processedCount: processed,
      queuedCount: queued,
      errorCount: error,
    };
  }, [campaignLeads, states]);

  const total = campaignLeads.length;
  const progressValue = total > 0 ? (processedCount / total) * 100 : 0;

  const filteredCampaignLeads = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    return campaignLeads.filter((lead) => {
      const status = states[lead.id]?.status ?? "pending";
      if (queueStatusFilter === "queued" && status !== "queued") return false;
      if (queueStatusFilter === "error" && status !== "error") return false;
      if (!query) return true;
      return (
        lead.company.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        (lead.author ?? "").toLowerCase().includes(query) ||
        (states[lead.id]?.subject ?? "").toLowerCase().includes(query)
      );
    });
  }, [campaignLeads, queueSearch, queueStatusFilter, states]);

  useEffect(() => {
    setQueueCurrentPage(1);
    setActivePreviewEmail(null);
  }, [queueStatusFilter, queueSearch, filteredCampaignLeads.length]);

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
    const plainBody = preview.htmlBody
      ? htmlBodyToEditablePlainText(preview.htmlBody)
      : "";
    setEditedSubject(preview.subject);
    setEditedBody(plainBody);
    setActivePreviewEmail(preview);
  };

  const queueTotalItems = filteredCampaignLeads.length;
  const queueTotalPages = Math.max(
    1,
    Math.ceil(queueTotalItems / ITEMS_PER_PAGE),
  );
  const queueSafePage = Math.min(queueCurrentPage, queueTotalPages);
  const queuePageStart = (queueSafePage - 1) * ITEMS_PER_PAGE;
  const paginatedQueueLeads = filteredCampaignLeads.slice(
    queuePageStart,
    queuePageStart + ITEMS_PER_PAGE,
  );
  const queueShownFrom = queueTotalItems === 0 ? 0 : queuePageStart + 1;
  const queueShownTo =
    queueTotalItems === 0 ? 0 : queuePageStart + paginatedQueueLeads.length;

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

  const handleSaveRecipientEmail = async (
    leadId: string,
    nextEmail: string,
    previousEmail: string,
  ) => {
    const trimmed = nextEmail.trim();
    if (trimmed.toLowerCase() === previousEmail.trim().toLowerCase()) {
      return;
    }

    setSavingEmailLeadId(leadId);
    try {
      const result = await updateAutopilotQueueRecipient({
        leadId,
        email: trimmed,
      });
      if ("error" in result) {
        toast.error(result.error);
        setCampaignLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, email: previousEmail } : lead,
          ),
        );
        return;
      }

      setCampaignLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, email: result.email } : lead,
        ),
      );

      if (result.requeued) {
        toast.success("E-mail uložen. Položka je znovu ve frontě k odeslání.");
        await loadQueue();
      } else {
        toast.success("Adresa příjemce byla uložena.");
      }
    } catch {
      toast.error("Nepodařilo se uložit e-mail.");
      setCampaignLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, email: previousEmail } : lead,
        ),
      );
    } finally {
      setSavingEmailLeadId(null);
    }
  };

  const renderQueueRecipientCell = (lead: AutopilotLead, state: RunState) => {
    const canEdit =
      (state.status === "queued" || state.status === "error") &&
      Boolean(state.queueId);
    const isSaving = savingEmailLeadId === lead.id;

    if (!canEdit) {
      return (
        <p className="truncate text-xs text-muted-foreground">
          {lead.email || "Bez e-mailu"}
        </p>
      );
    }

    return (
      <input
        type="email"
        key={`${lead.id}:${lead.email}`}
        defaultValue={lead.email}
        disabled={isSaving}
        aria-label={`E-mail příjemce pro ${lead.company}`}
        title="Změňte e-mail a potvrďte Enterem nebo odkliknutím"
        onBlur={(event) => {
          void handleSaveRecipientEmail(
            lead.id,
            event.target.value,
            lead.email,
          );
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.currentTarget.value = lead.email;
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "sk-plain-field w-full max-w-[260px] truncate border-0 bg-transparent p-0 text-foreground shadow-none outline-none ring-0 transition-colors",
          "hover:text-foreground/80",
          "focus:text-foreground",
          "disabled:opacity-60 text-xs",
        )}
      />
    );
  };

  const renderQueueStatusCell = (state: RunState) => {
    const meta = STATUS_META[state.status];
    const errorDetail =
      state.status === "error"
        ? state.message?.trim() ||
          "Neznámá chyba. Zkuste znovu vygenerovat nebo upravit e-mail."
        : null;

    if (!errorDetail) {
      return (
        <span className={cn("text-xs font-semibold", meta.className)}>
          {meta.label}
        </span>
      );
    }

    return (
      <QueueErrorStatus
        label={meta.label}
        detail={errorDetail}
        className={cn(meta.className, "text-xs")}
      />
    );
  };

  const handleStart = async () => {
    if (selectedIds.length === 0 || isRunning) return;

    const queue = leads.filter(
      (lead) =>
        selectedIds.includes(lead.id) &&
        (!onlyWithEmail || Boolean(lead.email?.trim())),
    );
    if (queue.length === 0) {
      toast.error(
        onlyWithEmail
          ? "Žádná vybraná firma nemá e-mail. Vypni filtr nebo doplň kontakty."
          : "Nevybrali jste žádnou firmu.",
      );
      return;
    }

    const strategy = automationSettings.sendingStrategy;
    const isImmediate = strategy === "immediate";
    const isQueueOnly = strategy === "queue";
    // Okamžité odeslání jen při Zapnout + režim „hned“. Jinak jen fronta.
    const shouldForceSendNow = isImmediate && featureEnabled;
    let scheduledTimes: Date[];

    if (isImmediate || isQueueOnly) {
      const now = new Date();
      scheduledTimes = queue.map(() => now);
    } else {
      const windows = getActiveScheduleWindows(automationSettings).filter(
        (window) => window.start.trim() && window.end.trim(),
      );

      if (windows.length === 0) {
        toast.error(
          "Nastavte alespoň jedno platné časové okno v nastavení automatizace.",
        );
        openSettings();
        return;
      }

      if (!automationSettings.sendDays?.length) {
        toast.error("Vyberte alespoň jeden den odesílání v nastavení.");
        openSettings();
        return;
      }

      const batchSize = Math.max(
        1,
        Math.min(automationSettings.maxEmailsPerBatch, 500),
      );

      try {
        scheduledTimes = computeScheduledTimes(
          queue.length,
          windows,
          batchSize,
          new Date(),
          automationSettings.sendDays,
        );
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Neplatná nastavení plánování.";
        toast.error(message);
        return;
      }
    }

    setCampaignLeads(queue);
    setStates(
      Object.fromEntries(
        queue.map((lead) => [lead.id, { status: "pending" as RunStatus }]),
      ),
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
          setCampaignLeads((prev) =>
            prev.map((item) =>
              item.id === lead.id
                ? {
                    ...item,
                    author: result.author,
                    scheduledAt: result.scheduledAt,
                    createdAt: result.createdAt,
                  }
                : item,
            ),
          );
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Neočekávaná chyba.";
        updateLead(lead.id, { status: "error", message });
      }
    }

    setIsRunning(false);
    setSelectedIds([]);

    if (shouldForceSendNow) {
      try {
        const response = await fetch("/api/autopilot/force-send", {
          method: "POST",
        });
        const result = (await response.json()) as {
          error?: string;
          sent?: number;
          failed?: number;
        };

        if (!response.ok) {
          toast.error(
            result.error ??
              "E-maily jsou ve frontě, ale okamžité odeslání selhalo.",
          );
          return;
        }

        const sent = result.sent ?? 0;
        const failed = result.failed ?? 0;

        if (sent > 0 && failed === 0) {
          toast.success(`${sent} e-mailů bylo vygenerováno a odesláno.`);
        } else if (sent > 0 && failed > 0) {
          toast.warning(
            `Odesláno ${sent} e-mailů, ${failed} se nepodařilo odeslat.`,
          );
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

    if (isImmediate && !featureEnabled) {
      toast.success(
        "E-maily jsou ve frontě. Automatika je vypnutá, takže se neodeslaly. Zapni odesílání nebo pošli ručně z fronty.",
      );
      return;
    }

    if (isQueueOnly) {
      toast.success("E-maily byly napsány a jsou ve frontě (bez odeslání).");
      return;
    }

    toast.success("E-maily byly vygenerovány a zařazeny do fronty.");
  };

  const handleForceSendQueue = async () => {
    if (isForceSending || isRunning || queuedCount === 0) return;

    setIsForceSending(true);
    try {
      const response = await fetch("/api/autopilot/force-send", {
        method: "POST",
      });
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
        toast.warning(
          `Odesláno ${sent} e-mailů, ${failed} se nepodařilo odeslat.`,
        );
      } else {
        toast.success(`Odesláno ${sent} e-mailů ihned.`);
      }

      await loadQueue();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Nepodařilo se odeslat e-maily ihned.";
      toast.error(message);
    } finally {
      setIsForceSending(false);
    }
  };

  const handleForceSendOne = async (queueId: string, leadId: string) => {
    if (!queueId || isRunning || forceSendingQueueId || isForceSending) return;

    setForceSendingQueueId(queueId);
    try {
      const result = await forceSendAutopilotQueueItem(queueId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if ((result.sent ?? 0) > 0) {
        toast.success("E-mail byl odeslán.");
        setCampaignLeads((prev) => prev.filter((lead) => lead.id !== leadId));
        setStates((prev) => {
          const next = { ...prev };
          delete next[leadId];
          return next;
        });
        await loadQueue();
        return;
      }

      if ((result.failed ?? 0) > 0) {
        toast.error(result.errors?.[0] ?? "E-mail se nepodařilo odeslat.");
        await loadQueue();
        return;
      }

      toast.info("Položka už nebyla ve frontě k odeslání.");
      await loadQueue();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Nepodařilo se odeslat e-mail.";
      toast.error(message);
    } finally {
      setForceSendingQueueId(null);
    }
  };

  const handleClearQueue = async (scope: "all" | "failed" = "all") => {
    if (isRunning || isClearingQueue) return;

    setIsClearingQueue(true);
    try {
      const result = await clearAutopilotEmailQueue(scope);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      if (scope === "failed") {
        const errorLeadIds = new Set(
          campaignLeads
            .filter(
              (lead) => (states[lead.id]?.status ?? "pending") === "error",
            )
            .map((lead) => lead.id),
        );
        setCampaignLeads((prev) =>
          prev.filter((lead) => !errorLeadIds.has(lead.id)),
        );
        setStates((prev) => {
          const next = { ...prev };
          for (const id of errorLeadIds) delete next[id];
          return next;
        });
        toast.success(
          result.deletedCount > 0
            ? `Smazáno ${result.deletedCount} chyb z fronty.`
            : "Žádné chyby ke smazání.",
        );
      } else {
        setCampaignLeads([]);
        setStates({});
        setQueueStatusFilter("all");
        toast.success(
          result.deletedCount > 0
            ? `Fronta vyčištěna (${result.deletedCount}).`
            : "Fronta už byla prázdná.",
        );
      }

      await loadQueue();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Nepodařilo se vyčistit frontu.";
      toast.error(message);
    } finally {
      setIsClearingQueue(false);
    }
  };

  const renderSelectionTable = (mode: "compact" | "expanded") => {
    const expanded = mode === "expanded";
    return (
      <div
        className={cn(
          AUTOPILOT_TABLE_CARD_CLASS,
          "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden",
          expanded ? "mt-0 h-full min-h-0 sm:mt-0" : "mt-3 sm:mt-4",
        )}
      >
        <div
          className={cn(
            AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
            "sk-data-panel__scroll",
            SNIPER_SELECTION_VIEWPORT_CLASS,
          )}
        >
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-11" />
              <col className="w-[28%]" />
              <col className="w-12" />
              <col className="w-[30%]" />
              <col className="w-[22%]" />
              <col className="w-[7rem]" />
            </colgroup>
            <thead className="sticky top-0 z-20 bg-white ">
              <tr className="text-left">
                <th
                  className={cn(
                    AUTOPILOT_TABLE_HEAD_CELL_CLASS,
                    "w-11 px-2 text-center",
                  )}
                >
                  <div className="flex h-full items-center justify-center">
                    <Checkbox
                      checked={
                        allPageSelected
                          ? true
                          : somePageSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAllOnPage}
                      disabled={paginatedLeads.length === 0}
                    />
                  </div>
                </th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>Firma</th>
                <th
                  className={cn(
                    AUTOPILOT_TABLE_HEAD_CELL_CLASS,
                    "px-2 text-center",
                  )}
                >
                  Web
                </th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>E-mail</th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>Telefon</th>
                <th className={AUTOPILOT_TABLE_HEAD_CELL_CLASS}>Nalezeno</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => {
                const web = leadFullWebsiteUrl(lead.url);
                const checked = selectedIds.includes(lead.id);
                return (
                  <tr
                    key={`${mode}-d-${lead.id}`}
                    className="cursor-pointer"
                    onClick={() => toggleOne(lead.id)}
                  >
                    <td
                      className="px-2 py-2.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleOne(lead.id)}
                        />
                      </div>
                    </td>
                    <td className="min-w-0 px-3 py-2.5">
                      <p
                        className="truncate font-semibold text-foreground"
                        title={lead.company}
                      >
                        {lead.company}
                      </p>
                    </td>
                    <td
                      className="px-2 py-2.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {web ? (
                        <a
                          href={web}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Otevřít web ${lead.company}`}
                          title={lead.url || web}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground/40">
                          <Globe className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td
                      className="min-w-0 overflow-hidden px-3 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.email ? (
                        <div className="flex min-w-0 items-center gap-0.5">
                          <CopyEmailButton
                            email={lead.email}
                            size="sm"
                            variant="ghost"
                          />
                          <span
                            className="min-w-0 truncate text-sm text-foreground"
                            title={lead.email}
                          >
                            {lead.email}
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center text-sm text-muted-foreground">
                          Bez e-mailu
                        </span>
                      )}
                    </td>
                    <td className="min-w-0 overflow-hidden px-3 py-2.5">
                      {lead.phone ? (
                        <span className="flex min-w-0 items-center text-sm text-foreground">
                          <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span
                            className="truncate tabular-nums"
                            title={lead.phone}
                          >
                            {lead.phone}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground tabular-nums">
                      {formatFoundDate(lead.createdAt ?? "")}
                    </td>
                  </tr>
                );
              })}
              {paginatedLeads.length === 0 && (
                <>
                  {isLoading && (
                    <AutopilotTableEmptyState colSpan={6}>
                      Načítám firmy…
                    </AutopilotTableEmptyState>
                  )}
                  {!isLoading && loadError && (
                    <AutopilotTableEmptyState
                      colSpan={6}
                      className="text-rose-600 "
                    >
                      {loadError}
                    </AutopilotTableEmptyState>
                  )}
                  {!isLoading && !loadError && leads.length === 0 && (
                    <AutopilotTableEmptyState colSpan={6}>
                      Žádné neoslovené firmy. Přidejte leady v sekci Radar nebo
                      CRM.
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
    );
  };

  const renderQueuePanel = (mode: "compact" | "expanded") => {
    const expanded = mode === "expanded";

    if (isQueueLoading && campaignLeads.length === 0) {
      return (
        <div
          className={cn(
            AUTOPILOT_TABLE_CARD_CLASS,
            "shrink-0",
            expanded
              ? "flex min-h-0 flex-1 items-center justify-center"
              : "mt-3 sm:mt-6",
          )}
        >
          <AutopilotListEmptyState>
            Načítám naplánovanou frontu…
          </AutopilotListEmptyState>
        </div>
      );
    }

    if (campaignLeads.length === 0) {
      return (
        <div
          className={cn(
            AUTOPILOT_TABLE_CARD_CLASS,
            "shrink-0",
            expanded
              ? "flex min-h-0 flex-1 items-center justify-center"
              : "mt-3 sm:mt-6",
          )}
        >
          <AutopilotListEmptyState>
            Zatím nemáte naplánovanou frontu. Označ firmy a klikni na
            „Vygenerovat a naplánovat“.
          </AutopilotListEmptyState>
        </div>
      );
    }

    return (
      <>
        <div
          className={cn(
            "sk-toolbar sk-surface shrink-0 overflow-hidden",
            !expanded && "mt-3 sm:mt-4",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex shrink-0 items-center gap-2 text-xs font-semibold leading-none text-foreground sm:text-sm">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {isRunning ? "Generuji…" : "Fronta připravena"}
              </span>
              <span className="shrink-0 text-[11px] font-medium leading-none text-emerald-600 sm:text-xs">
                ✓ {queuedCount}
              </span>
              <span className="shrink-0 text-[11px] font-medium leading-none text-rose-600 sm:text-xs">
                ✕ {errorCount}
              </span>
              <span className="text-[11px] leading-none text-muted-foreground sm:text-xs">
                {processedCount}/{total}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!expanded && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setQueueExpanded(true)}
                  className="sk-press-btn h-8 gap-1.5 rounded-[12px] px-3 text-xs"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Zvětšit
                </Button>
              )}
              {queuedCount > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    isRunning || isForceSending || forceSendingQueueId !== null
                  }
                  onClick={() => void handleForceSendQueue()}
                  className="sk-press-btn sk-selection__success h-8 gap-1.5 rounded-[12px] px-3 text-xs"
                >
                  {isForceSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Odeslat vše
                </Button>
              )}
              {errorCount > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isRunning || isClearingQueue}
                      className="sk-press-btn sk-selection__danger h-8 gap-1.5 rounded-[12px] px-3 text-xs"
                    >
                      {isClearingQueue ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Smazat chyby
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border bg-card shadow-md ">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Smazat všechny chyby ve frontě?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Odstraní se {errorCount}{" "}
                        {errorCount === 1
                          ? "položka se stavem Chyba"
                          : "položek se stavem Chyba"}
                        . Potvrzené e-maily ve frontě zůstanou.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleClearQueue("failed")}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Smazat chyby
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      isRunning || isClearingQueue || campaignLeads.length === 0
                    }
                    className="sk-press-btn sk-selection__danger h-8 gap-1.5 rounded-[12px] px-3 text-xs"
                  >
                    {isClearingQueue ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Vyčistit
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border bg-card shadow-md ">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Opravdu chcete vyčistit frontu?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Smažou se všechny položky ve frontě včetně chyb (
                      {campaignLeads.length}). Tuto akci nelze vrátit.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleClearQueue("all")}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Smazat frontu
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {(isRunning || isForceSending) && (
            <Progress
              value={progressValue}
              className="h-1 w-full basis-full rounded-none"
            />
          )}
        </div>

        <div
          className={cn(
            AUTOPILOT_TABLE_CARD_CLASS,
            expanded
              ? "mt-3 flex min-h-0 flex-1 flex-col overflow-hidden"
              : "mt-3 shrink-0 overflow-hidden sm:mt-4",
          )}
        >
          <div className="shrink-0 px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
            <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-foreground sm:text-sm">
                Fronta k odeslání
              </p>
              <div className="relative min-w-0 w-full sm:w-72 sm:max-w-none">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Hledat firmu, e-mail, autora…"
                  className="h-8 w-full pl-8 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto sm:flex-wrap sm:items-center sm:gap-4">
              {queueFilterTabs.map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setQueueStatusFilter(id)}
                  className={cn(
                    "flex shrink-0 items-baseline gap-1.5 px-2 py-1 text-xs font-semibold transition-colors sm:px-0 sm:text-sm",
                    queueStatusFilter === id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{label}</span>
                  <span className="tabular-nums opacity-80">{count}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-blue-800">
              E-maily ve sloupci Kontakt můžete upravit kliknutím. Platí, dokud
              se zpráva neodešle. U chyby po opravě e-mailu se položka znovu
              zařadí do fronty.
            </p>
          </div>

          <div
            className={cn(
              "sk-data-panel__scroll",
              expanded
                ? "min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                : cn(
                    AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
                    "h-[190px] min-h-[190px] max-h-[190px] overflow-x-auto overflow-y-auto",
                  ),
            )}
          >
            <table
              className={cn(
                "w-full text-sm",
                expanded ? "table-auto" : "min-w-[980px] table-fixed",
              )}
            >
              <thead className="sticky top-0 z-20 bg-white ">
                <tr className="text-left">
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-9 bg-transparent px-3 py-2 align-middle",
                      expanded ? "w-[18%]" : "min-w-[180px]",
                    )}
                  >
                    Firma
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-9 bg-transparent px-3 py-2 align-middle",
                      expanded ? "w-[22%]" : "min-w-[180px]",
                    )}
                    title="E-mail můžete upravit, dokud se zpráva neodešle"
                  >
                    Kontakt
                    <span className="ml-1 font-normal normal-case tracking-normal text-[10px] text-muted-foreground">
                      (upravit)
                    </span>
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-9 bg-transparent px-3 py-2 align-middle",
                      expanded ? "w-[10%]" : "min-w-[72px]",
                    )}
                  >
                    Autor
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-9 bg-transparent px-3 py-2 align-middle",
                      expanded ? "w-[12%]" : "min-w-[120px]",
                    )}
                    title={
                      featureEnabled
                        ? "Plánovaný čas odeslání (automatický cron)"
                        : "Automatické odesílání je vypnuté. Použij Odeslat u řádku"
                    }
                  >
                    Odeslat
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-9 bg-transparent px-3 py-2 align-middle",
                      expanded ? "w-[12%]" : "min-w-[120px]",
                    )}
                  >
                    Vytvořeno
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-9 bg-transparent px-3 py-2 align-middle",
                      expanded ? "w-[16%]" : "min-w-[140px]",
                    )}
                  >
                    Stav
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-9 bg-transparent px-3 py-2 align-middle",
                      expanded ? "w-[14%]" : "min-w-[150px]",
                    )}
                  >
                    Akce
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueueLeads.map((lead) => {
                  const state = states[lead.id] ?? {
                    status: "pending" as RunStatus,
                  };
                  const canPreview =
                    state.status === "queued" &&
                    Boolean(state.subject && state.queueId);
                  const isSendingThis =
                    Boolean(state.queueId) &&
                    forceSendingQueueId === state.queueId;

                  return (
                    <tr key={`${mode}-d-${lead.id}`}>
                      <td className="px-3 py-2.5">
                        <p className="max-w-[280px] truncate font-semibold text-foreground">
                          {lead.company}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        {renderQueueRecipientCell(lead, state)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="whitespace-nowrap text-xs text-foreground">
                          {lead.author || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="whitespace-nowrap text-xs text-muted-foreground">
                          {featureEnabled && lead.scheduledAt
                            ? formatSchedulePreview(new Date(lead.scheduledAt))
                            : "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatQueueDateTime(lead.createdAt)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        {renderQueueStatusCell(state)}
                      </td>
                      <td className="px-3 py-2.5">
                        {canPreview ? (
                          <div className="flex flex-row flex-nowrap items-center gap-1">
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
                              title="Náhled"
                              aria-label="Náhled"
                              className="sk-row-text-btn inline-flex h-7 w-7 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-4 w-4 shrink-0" />
                            </button>
                            <button
                              type="button"
                              title="Odeslat"
                              aria-label="Odeslat"
                              disabled={
                                isRunning || isForceSending || isSendingThis
                              }
                              onClick={() =>
                                void handleForceSendOne(state.queueId!, lead.id)
                              }
                              className="sk-row-text-btn inline-flex h-7 w-7 cursor-pointer items-center justify-center text-emerald-600 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSendingThis ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4 shrink-0" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paginatedQueueLeads.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-xs text-muted-foreground"
                    >
                      {queueSearch.trim()
                        ? "Žádné výsledky pro hledaný výraz."
                        : queueStatusFilter === "all"
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
            className="shrink-0"
            shownFrom={queueShownFrom}
            shownTo={queueShownTo}
            totalItems={queueTotalItems}
            safePage={queueSafePage}
            totalPages={queueTotalPages}
            onPrevious={() => setQueueCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() =>
              setQueueCurrentPage((p) => Math.min(queueTotalPages, p + 1))
            }
          />
        </div>
      </>
    );
  };

  return (
    <div className="sk-autopilot__stack">
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

      <div className="sk-autopilot__panel">
        <AutopilotControlPanel
          icon={<Send className="h-5 w-5" />}
          iconWrapClassName="sk-page-badge"
          title="Automatické odesílání e-mailů"
          powerEnabled={featureEnabled}
          description={
            featureEnabled
              ? "Cron jen odesílá splatné maily z fronty (nezahajuje nové kampaně)."
              : "Cron vypnutý. Maily z fronty se neodešlou, dokud nezapneš."
          }
          actions={
            <>
              <AutopilotPowerButton
                enabled={featureEnabled}
                disabled={isTogglingPower}
                accent="blue"
                onClick={() => void toggleFeaturePower()}
              />
              <AutopilotSettingsIconButton
                label="Nastavení odesílání"
                onClick={openSettings}
              />
            </>
          }
        />
      </div>

      <div className="sk-autopilot__table mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mt-0 flex shrink-0 gap-1 overflow-x-auto sm:gap-5">
          <button
            type="button"
            onClick={() => {
              setQueueExpanded(false);
              setActiveSubTab("selection");
            }}
            className={cn(
              "shrink-0 px-2 pb-1 text-xs font-medium transition-colors sm:px-0 sm:text-sm",
              activeSubTab === "selection"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Výběr firem
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("queue")}
            className={cn(
              "flex shrink-0 items-center gap-1.5 px-2 pb-1 text-xs font-medium transition-colors sm:gap-2 sm:px-0 sm:text-sm",
              activeSubTab === "queue"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Fronta
            {queuedCount > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {queuedCount}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === "selection" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="sk-toolbar sk-surface mt-3 sm:mt-4">
              <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                {selectedIds.length > 0
                  ? `Vybráno ${selectedIds.length} ${selectedIds.length === 1 ? "firma" : "firem"}`
                  : "Označ firmy k oslovení"}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
                  Jen s e-mailem
                </span>
                <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
                  E-mail
                </span>
                <Switch
                  checked={onlyWithEmail}
                  onCheckedChange={setOnlyWithEmail}
                  className="sk-switch--sm shrink-0"
                  aria-label="Jen s e-mailem"
                />
              </div>
              <AutopilotIconButton
                label="Zvětšit výběr firem"
                onClick={() => setSelectionExpanded(true)}
                className="h-8 w-8"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </AutopilotIconButton>
              <Button
                type="button"
                variant="default"
                disabled={selectedIds.length === 0 || isRunning}
                onClick={() => void handleStart()}
                className="h-8 shrink-0 rounded-lg px-3 text-xs font-semibold"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Generuji…
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                    {selectedIds.length > 0
                      ? automationSettings.sendingStrategy === "queue"
                        ? `Do fronty (${selectedIds.length})`
                        : automationSettings.sendingStrategy === "immediate"
                          ? `Vygenerovat (${selectedIds.length})`
                          : `Naplánovat (${selectedIds.length})`
                      : automationSettings.sendingStrategy === "queue"
                        ? "Do fronty"
                        : automationSettings.sendingStrategy === "immediate"
                          ? "Vygenerovat"
                          : "Naplánovat"}
                  </>
                )}
              </Button>
            </div>

            {showSelectAllBanner && (
              <div className="mt-3 shrink-0 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-foreground sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
                Jsou vybrány všechny firmy na této stránce (
                {paginatedLeads.length}).{" "}
                <button
                  type="button"
                  onClick={selectAllInDatabase}
                  className="font-semibold text-foreground underline underline-offset-2 hover:text-foreground/80"
                >
                  Vybrat všechny neoslovené ({totalItems})
                </button>
              </div>
            )}

            {selectionExpanded ? (
              <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center text-sm text-muted-foreground sm:mt-6">
                Výběr firem je otevřený ve zvětšeném okně.
              </div>
            ) : (
              renderSelectionTable("compact")
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {queueExpanded ? (
              <div className="mt-3 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center text-sm text-muted-foreground sm:mt-6">
                Fronta je otevřená ve zvětšeném okně.
              </div>
            ) : (
              renderQueuePanel("compact")
            )}
          </div>
        )}
      </div>

      <ExpandOverlay
        open={selectionExpanded}
        onClose={() => setSelectionExpanded(false)}
        title="Výběr firem k oslovení"
        description={
          selectedIds.length > 0
            ? `Vybráno ${selectedIds.length} ${selectedIds.length === 1 ? "firma" : "firem"}`
            : "Označ firmy k oslovení"
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="shrink-0 overflow-visible p-0.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-0 flex-1 sm:min-w-[180px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={selectionSearch}
                  onChange={(e) => setSelectionSearch(e.target.value)}
                  placeholder="Hledat firmu…"
                  className="sk-filter-chip h-9 w-full py-0 pl-8 text-xs shadow-none"
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
                value={selectionTagFilter}
                onValueChange={setSelectionTagFilter}
              >
                <SelectTrigger className="sk-filter-chip h-9 w-full shrink-0 py-0 text-xs shadow-none sm:w-[180px]">
                  <SelectValue placeholder="Obor / tag" />
                </SelectTrigger>
                <SelectContent className="z-[220]">
                  <SelectItem value="all">Všechny obory</SelectItem>
                  {availableSelectionTags.map(({ tag, label, count }) => (
                    <SelectItem key={tag} value={tag}>
                      {label} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectionDateFilter}
                onValueChange={(v) =>
                  setSelectionDateFilter(
                    v as "all" | "last_7_days" | "last_30_days" | "this_year",
                  )
                }
              >
                <SelectTrigger className="sk-filter-chip h-9 w-full shrink-0 py-0 text-xs shadow-none sm:w-[170px]">
                  <SelectValue placeholder="Datum" />
                </SelectTrigger>
                <SelectContent className="z-[220]">
                  <SelectItem value="all">Všechna data</SelectItem>
                  <SelectItem value="last_7_days">Posledních 7 dní</SelectItem>
                  <SelectItem value="last_30_days">
                    Posledních 30 dní
                  </SelectItem>
                  <SelectItem value="this_year">Tento rok</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {renderSelectionTable("expanded")}
          </div>
        </div>
      </ExpandOverlay>

      <ExpandOverlay
        open={queueExpanded}
        onClose={() => setQueueExpanded(false)}
        title="Fronta k odeslání"
        description="Rozšířený náhled fronty. Po zavření zůstane kompaktní fronta v záložce."
      >
        {renderQueuePanel("expanded")}
      </ExpandOverlay>

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
                  variant="default"
                  onClick={() => void handleSavePreview()}
                  disabled={isSavingPreview}
                  className="h-9 rounded-lg px-4 font-medium"
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

function QueueErrorStatus({
  label,
  detail,
  className,
}: {
  label: string;
  detail: string;
  className?: string;
}) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  return (
    <>
      <span
        className={cn(
          "inline-flex max-w-full cursor-default items-center gap-1 font-bold",
          className,
        )}
        onMouseEnter={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const width = 288;
          const left = Math.min(
            Math.max(8, rect.left),
            window.innerWidth - width - 8,
          );
          const top = rect.bottom + 8;
          setTip({ top, left });
        }}
        onMouseLeave={() => setTip(null)}
      >
        <span>{label}</span>
        <Info className="h-3 w-3 shrink-0 opacity-80" />
      </span>
      {tip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: tip.top, left: tip.left }}
            className="pointer-events-none fixed z-[100] w-72 rounded-lg border border-rose-200 bg-white p-3 text-left shadow-lg "
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 ">
              Důvod chyby
            </p>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm font-normal leading-relaxed text-foreground">
              {detail}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
