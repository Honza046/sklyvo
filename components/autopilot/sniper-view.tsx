"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Eye,
  Globe,
  Info,
  Loader2,
  Mail,
  Maximize2,
  Phone,
  Search,
  Send,
  Trash2,
  Wand2,
} from "lucide-react";
import { AutopilotSettingsDialog } from "@/components/autopilot-settings-dialog";
import { ExpandOverlay } from "@/components/autopilot/expand-overlay";
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
  getAutopilotEmailQueue,
  queueAutopilotLead,
  updateAutopilotEmailQueueItem,
  updateAutopilotQueueRecipient,
  type AutopilotEmailQueueRow,
} from "@/app/actions/autopilot";
import { getLeads } from "@/app/actions/crm";
import { computeScheduledTimes, formatSchedulePreview } from "@/lib/email-scheduling";
import { getActiveScheduleWindows } from "@/lib/autopilot-settings";
import { htmlBodyToEditablePlainText } from "@/lib/email-format";
import { leadTagLabel, LEAD_TAG_ORDER } from "@/lib/lead-tags";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import {
  AutopilotControlPanel,
  AutopilotPowerButton,
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

/** Kompaktní: absolute viewport (spolehlivý scroll v omezené kartě). Expanded: flex-1 overflow (výška z overlay). */
const SNIPER_SELECTION_COMPACT_VIEWPORT_CLASS =
  "absolute inset-0 overflow-x-auto overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";
const SNIPER_SELECTION_EXPANDED_VIEWPORT_CLASS =
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
  const [activeSubTab, setActiveSubTab] = useState<"selection" | "queue">("selection");
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
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [states, setStates] = useState<Record<string, RunState>>({});
  const [queueStatusFilter, setQueueStatusFilter] = useState<"all" | "queued" | "error">("all");
  const [queueSearch, setQueueSearch] = useState("");
  const [queueCurrentPage, setQueueCurrentPage] = useState(1);
  const [activePreviewEmail, setActivePreviewEmail] = useState<ActivePreviewEmail | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [savingEmailLeadId, setSavingEmailLeadId] = useState<string | null>(null);

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
  }, [workspaceLeads.length, selectionDateFilter, selectionTagFilter, selectionSearch, onlyWithEmail]);

  const availableSelectionTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of workspaceLeads) {
      if (lead.leadStatus !== "NEW") continue;
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

  const leads = useMemo<AutopilotLead[]>(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const q = selectionSearch.trim().toLowerCase();

    return workspaceLeads
      .filter((lead) => lead.leadStatus === "NEW")
      .filter((lead) => !onlyWithEmail || Boolean(lead.email?.trim()))
      .filter((lead) => {
        if (selectionTagFilter === "all") return true;
        return (lead.tags ?? []).includes(selectionTagFilter);
      })
      .filter((lead) => {
        const created = new Date(lead.createdAt);
        if (selectionDateFilter === "all") return true;
        if (selectionDateFilter === "last_7_days") return created >= sevenDaysAgo;
        if (selectionDateFilter === "last_30_days") return created >= thirtyDaysAgo;
        if (selectionDateFilter === "this_year") {
          return created.getFullYear() === now.getFullYear();
        }
        return true;
      })
      .filter((lead) => {
        if (!q) return true;
        return (
          lead.company.toLowerCase().includes(q) ||
          lead.url.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          (lead.tags ?? []).some((tag) => leadTagLabel(tag).toLowerCase().includes(q) || tag.includes(q))
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
  }, [
    workspaceLeads,
    onlyWithEmail,
    selectionDateFilter,
    selectionTagFilter,
    selectionSearch,
  ]);

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

  const handleSaveRecipientEmail = async (leadId: string, nextEmail: string, previousEmail: string) => {
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
          prev.map((lead) => (lead.id === leadId ? { ...lead, email: previousEmail } : lead)),
        );
        return;
      }

      setCampaignLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, email: result.email } : lead)),
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
        prev.map((lead) => (lead.id === leadId ? { ...lead, email: previousEmail } : lead)),
      );
    } finally {
      setSavingEmailLeadId(null);
    }
  };

  const renderQueueRecipientCell = (
    lead: AutopilotLead,
    state: RunState,
    variant: "mobile" | "desktop",
  ) => {
    const canEdit =
      (state.status === "queued" || state.status === "error") && Boolean(state.queueId);
    const isSaving = savingEmailLeadId === lead.id;

    if (!canEdit) {
      return (
        <p
          className={cn(
            "truncate text-muted-foreground",
            variant === "mobile" ? "mt-0.5 text-[11px]" : "text-xs",
          )}
        >
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
          void handleSaveRecipientEmail(lead.id, event.target.value, lead.email);
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
          "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-foreground outline-none transition-colors",
          "hover:border-border/70 hover:bg-muted/40 focus:border-blue-500/50 focus:bg-background focus:ring-2 focus:ring-blue-600/20",
          "disabled:opacity-60",
          variant === "mobile" ? "mt-0.5 text-[11px]" : "text-xs",
        )}
      />
    );
  };

  const renderQueueStatusCell = (
    state: RunState,
    variant: "mobile" | "desktop",
  ) => {
    const meta = STATUS_META[state.status];
    const errorDetail =
      state.status === "error"
        ? state.message?.trim() || "Neznámá chyba. Zkuste znovu vygenerovat nebo upravit e-mail."
        : null;

    if (!errorDetail) {
      return (
        <span
          className={cn(
            "font-semibold",
            meta.className,
            variant === "mobile" ? "mt-0.5 text-[11px]" : "text-xs",
          )}
        >
          {meta.label}
        </span>
      );
    }

    return (
      <QueueErrorStatus
        label={meta.label}
        detail={errorDetail}
        className={cn(
          meta.className,
          variant === "mobile" ? "mt-0.5 text-[11px]" : "text-xs",
        )}
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

    const isImmediate = automationSettings.sendingStrategy === "immediate";
    let scheduledTimes: Date[];

    if (isImmediate) {
      const now = new Date();
      scheduledTimes = queue.map(() => now);
    } else {
      const windows = getActiveScheduleWindows(automationSettings).filter(
        (window) => window.start.trim() && window.end.trim(),
      );

      if (windows.length === 0) {
        toast.error("Nastavte alespoň jedno platné časové okno v nastavení automatizace.");
        openSettings();
        return;
      }

      if (!automationSettings.sendDays?.length) {
        toast.error("Vyberte alespoň jeden den odesílání v nastavení.");
        openSettings();
        return;
      }

      const batchSize = Math.max(1, Math.min(automationSettings.maxEmailsPerBatch, 500));

      try {
        scheduledTimes = computeScheduledTimes(
          queue.length,
          windows,
          batchSize,
          new Date(),
          automationSettings.sendDays,
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Neplatná nastavení plánování.";
        toast.error(message);
        return;
      }
    }

    setCampaignLeads(queue);
    setStates(
      Object.fromEntries(queue.map((lead) => [lead.id, { status: "pending" as RunStatus }])),
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
        {/* Mobile list */}
        <div
          className={cn(
            AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
            "min-h-0 flex-1 md:hidden",
            expanded ? "flex flex-col overflow-hidden" : "relative",
          )}
        >
          <div
            className={cn(
              expanded
                ? SNIPER_SELECTION_EXPANDED_VIEWPORT_CLASS
                : SNIPER_SELECTION_COMPACT_VIEWPORT_CLASS,
            )}
          >
          {paginatedLeads.map((lead) => {
            const checked = selectedIds.includes(lead.id);
            return (
              <div
                key={`${mode}-m-${lead.id}`}
                role="button"
                tabIndex={0}
                onClick={() => toggleOne(lead.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleOne(lead.id);
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-3 border-b border-border/40 px-3 py-2.5 text-left active:bg-muted/50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleOne(lead.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-foreground">{lead.company}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {lead.email || "Bez e-mailu"}
                    {lead.phone ? ` · ${lead.phone}` : ""}
                  </p>
                </div>
              </div>
            );
          })}
          {paginatedLeads.length === 0 && (
            <>
              {isLoading && <AutopilotListEmptyState>Načítám firmy…</AutopilotListEmptyState>}
              {!isLoading && loadError && (
                <AutopilotListEmptyState className="text-rose-600 dark:text-rose-400">
                  {loadError}
                </AutopilotListEmptyState>
              )}
              {!isLoading && !loadError && leads.length === 0 && (
                <AutopilotListEmptyState>
                  Žádné neoslovené firmy. Přidejte leady v Radaru nebo CRM.
                </AutopilotListEmptyState>
              )}
            </>
          )}
          </div>
        </div>

        {/* Desktop table */}
        <div
          className={cn(
            AUTOPILOT_HIDDEN_SCROLLBAR_CLASS,
            "hidden min-h-0 flex-1",
            expanded
              ? "md:flex md:flex-col md:overflow-hidden"
              : "relative md:block",
          )}
        >
          <div
            className={cn(
              expanded
                ? SNIPER_SELECTION_EXPANDED_VIEWPORT_CLASS
                : SNIPER_SELECTION_COMPACT_VIEWPORT_CLASS,
            )}
          >
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
                    "w-[28%] bg-white dark:bg-zinc-950",
                  )}
                >
                  Firma
                </th>
                <th
                  className={cn(
                    AUTOPILOT_TABLE_HEAD_CELL_CLASS,
                    "w-[52px] bg-white text-center dark:bg-zinc-950",
                  )}
                >
                  Web
                </th>
                <th
                  className={cn(
                    AUTOPILOT_TABLE_HEAD_CELL_CLASS,
                    "w-[26%] bg-white dark:bg-zinc-950",
                  )}
                >
                  E-mail
                </th>
                <th
                  className={cn(
                    AUTOPILOT_TABLE_HEAD_CELL_CLASS,
                    "w-[16%] bg-white dark:bg-zinc-950",
                  )}
                >
                  Telefon
                </th>
                <th className={cn(AUTOPILOT_TABLE_HEAD_CELL_CLASS, "bg-white dark:bg-zinc-950")}>
                  Nalezeno
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => {
                const web = leadFullWebsiteUrl(lead.url);
                const checked = selectedIds.includes(lead.id);
                return (
                  <tr
                    key={`${mode}-d-${lead.id}`}
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
                    </td>
                    <td
                      className="px-2 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {web ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 w-8 rounded-lg border-border/60 bg-background p-0 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                        >
                          <a
                            href={web}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Otevřít web ${lead.company}`}
                            title={lead.url || web}
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground/40">
                          <Globe className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "flex min-w-0 items-center break-words text-sm",
                          lead.email ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{lead.email || "Bez e-mailu"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {lead.phone ? (
                        <span className="flex min-w-0 items-center text-sm text-foreground">
                          <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{lead.phone}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {formatFoundDate(lead.createdAt ?? "")}
                    </td>
                  </tr>
                );
              })}
              {paginatedLeads.length === 0 && (
                <>
                  {isLoading && (
                    <AutopilotTableEmptyState colSpan={6}>Načítám firmy…</AutopilotTableEmptyState>
                  )}
                  {!isLoading && loadError && (
                    <AutopilotTableEmptyState colSpan={6} className="text-rose-600 dark:text-rose-400">
                      {loadError}
                    </AutopilotTableEmptyState>
                  )}
                  {!isLoading && !loadError && leads.length === 0 && (
                    <AutopilotTableEmptyState colSpan={6}>
                      Žádné neoslovené firmy. Přidejte leady v sekci Radar nebo CRM.
                    </AutopilotTableEmptyState>
                  )}
                </>
              )}
            </tbody>
          </table>
          </div>
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
            "shrink-0 rounded-xl border border-border/60 bg-card shadow-sm",
            expanded
              ? "flex min-h-0 flex-1 items-center justify-center"
              : "mt-3 sm:mt-6 sm:rounded-2xl",
          )}
        >
          <AutopilotListEmptyState>Načítám naplánovanou frontu…</AutopilotListEmptyState>
        </div>
      );
    }

    if (campaignLeads.length === 0) {
      return (
        <div
          className={cn(
            "shrink-0 rounded-xl border border-border/60 bg-card shadow-sm",
            expanded
              ? "flex min-h-0 flex-1 items-center justify-center"
              : "mt-3 sm:mt-6 sm:rounded-2xl",
          )}
        >
          <AutopilotListEmptyState>
            Zatím nemáte naplánovanou frontu. Označ firmy a klikni na „Vygenerovat a naplánovat“.
          </AutopilotListEmptyState>
        </div>
      );
    }

    return (
      <>
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm",
            !expanded && "mt-3 sm:mt-6",
          )}
        >
          <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex shrink-0 items-center gap-2 text-xs font-semibold leading-none text-foreground sm:text-sm">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
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
                  variant="outline"
                  onClick={() => setQueueExpanded(true)}
                  className="inline-flex h-7 w-fit items-center px-2.5 py-0 text-xs leading-none"
                >
                  <Maximize2 className="mr-1 h-3 w-3" />
                  Zvětšit
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRunning || isClearingQueue}
                    className="inline-flex h-7 w-fit shrink-0 items-center border-red-200 px-2.5 py-0 text-xs leading-none text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {isClearingQueue ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-3 w-3" />
                    )}
                    Vyčistit
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

        <div
          className={cn(
            "rounded-xl border border-border/60 bg-card shadow-sm",
            expanded
              ? "mt-3 flex min-h-0 flex-1 flex-col overflow-hidden"
              : "mt-3 shrink-0 overflow-hidden sm:mt-4",
          )}
        >
          <div className="shrink-0 px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
            <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-foreground sm:text-sm">Fronta k odeslání</p>
              <div className="relative min-w-0 sm:w-56">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                  placeholder="Hledat firmu, e-mail, autora…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-border/60 sm:flex-wrap sm:items-center sm:gap-4">
              {queueFilterTabs.map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setQueueStatusFilter(id)}
                  className={cn(
                    "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2 pb-2 text-xs font-medium transition-colors sm:px-0 sm:text-sm",
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
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              E-maily ve sloupci Kontakt můžete upravit kliknutím — platí, dokud se zpráva
              neodešle. U chyby po opravě e-mailu se položka znovu zařadí do fronty.
            </p>
          </div>

          <div
            className={cn(
              "scrollbar-hide overflow-y-auto md:hidden",
              expanded ? "min-h-0 flex-1" : "max-h-[min(35dvh,190px)] min-h-[140px]",
            )}
          >
            {paginatedQueueLeads.map((lead) => {
              const state = states[lead.id] ?? { status: "pending" as RunStatus };
              const canPreview =
                state.status === "queued" && Boolean(state.subject && state.queueId);

              return (
                <div
                  key={`${mode}-m-${lead.id}`}
                  className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {lead.company}
                    </p>
                    {renderQueueRecipientCell(lead, state, "mobile")}
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {[
                        lead.author || null,
                        lead.scheduledAt
                          ? `odeslat ${formatSchedulePreview(new Date(lead.scheduledAt))}`
                          : null,
                        lead.createdAt
                          ? `vytvořeno ${formatQueueDateTime(lead.createdAt)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    {renderQueueStatusCell(state, "mobile")}
                  </div>
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
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Náhled
                    </button>
                  ) : null}
                </div>
              );
            })}
            {paginatedQueueLeads.length === 0 && (
              <AutopilotListEmptyState className="min-h-[140px] py-6 text-xs">
                {queueSearch.trim()
                  ? "Žádné výsledky pro hledaný výraz."
                  : queueStatusFilter === "all"
                    ? "Fronta je prázdná."
                    : queueStatusFilter === "queued"
                      ? "Zatím žádné potvrzené e-maily ve frontě."
                      : "Zatím žádné chyby."}
              </AutopilotListEmptyState>
            )}
          </div>

          <div
            className={cn(
              "hidden md:block",
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
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
                <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950",
                      expanded ? "w-[18%]" : "min-w-[180px]",
                    )}
                  >
                    Firma
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950",
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
                      "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950",
                      expanded ? "w-[10%]" : "min-w-[72px]",
                    )}
                  >
                    Autor
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950",
                      expanded ? "w-[12%]" : "min-w-[120px]",
                    )}
                  >
                    Odeslat
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950",
                      expanded ? "w-[12%]" : "min-w-[120px]",
                    )}
                  >
                    Vytvořeno
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950",
                      expanded ? "w-[16%]" : "min-w-[140px]",
                    )}
                  >
                    Stav
                  </th>
                  <th
                    className={cn(
                      "sticky top-0 z-10 h-10 bg-white px-3 py-2 align-middle dark:bg-zinc-950",
                      expanded ? "w-[10%]" : "min-w-[110px]",
                    )}
                  >
                    Náhled
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueueLeads.map((lead) => {
                  const state = states[lead.id] ?? { status: "pending" as RunStatus };
                  const canPreview =
                    state.status === "queued" && Boolean(state.subject && state.queueId);

                  return (
                    <tr key={`${mode}-d-${lead.id}`} className="border-b border-border/40">
                      <td className="px-3 py-2.5">
                        <p className="max-w-[280px] truncate font-semibold text-foreground">
                          {lead.company}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        {renderQueueRecipientCell(lead, state, "desktop")}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="whitespace-nowrap text-xs text-foreground">
                          {lead.author || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="whitespace-nowrap text-xs text-muted-foreground">
                          {lead.scheduledAt
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
                        {renderQueueStatusCell(state, "desktop")}
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
                            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4 shrink-0" />
                            Náhled
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
            className="shrink-0 rounded-b-xl border-gray-100 bg-white p-4 dark:border-border/60 dark:bg-card sm:flex-row sm:items-center sm:justify-between sm:px-4"
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
    );
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden">
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
              className="h-9 w-9 rounded-lg border border-border/50 bg-background/90 text-muted-foreground shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:bg-zinc-900/90 dark:hover:border-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
            />
          </>
        }
      />

      <div className="mt-3 flex shrink-0 gap-1 overflow-x-auto border-b border-border/60 pb-0 sm:mt-6 sm:gap-5">
        <button
          type="button"
          onClick={() => {
            setQueueExpanded(false);
            setActiveSubTab("selection");
          }}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-2 pb-2 text-xs font-medium transition-colors sm:px-0 sm:pb-2.5 sm:text-sm",
            activeSubTab === "selection"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Výběr firem
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("queue")}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2 pb-2 text-xs font-medium transition-colors sm:gap-2 sm:px-0 sm:pb-2.5 sm:text-sm",
            activeSubTab === "queue"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Fronta
          {queuedCount > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {queuedCount}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === "selection" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-sm sm:mt-4 sm:gap-3 sm:px-4">
            <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
              {selectedIds.length > 0
                ? `Vybráno ${selectedIds.length} ${selectedIds.length === 1 ? "firma" : "firem"}`
                : "Označ firmy k oslovení"}
            </p>
            <label
              htmlFor="sniper-only-email"
              className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-medium text-muted-foreground"
            >
              <span className="hidden sm:inline">Jen s e-mailem</span>
              <span className="sm:hidden">E-mail</span>
              <Switch
                id="sniper-only-email"
                checked={onlyWithEmail}
                onCheckedChange={setOnlyWithEmail}
                className="shrink-0 scale-90 data-[state=checked]:bg-blue-600"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectionExpanded(true)}
              className="h-8 w-8 shrink-0 rounded-lg p-0"
              title="Zvětšit výběr firem"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              disabled={selectedIds.length === 0 || isRunning}
              onClick={() => void handleStart()}
              className="h-8 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
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
                    ? `Naplánovat (${selectedIds.length})`
                    : "Naplánovat"}
                </>
              )}
            </Button>
          </div>

          {showSelectAllBanner && (
            <div className="mt-3 shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
              Jsou vybrány všechny firmy na této stránce ({paginatedLeads.length}).{" "}
              <button
                type="button"
                onClick={selectAllInDatabase}
                className="font-semibold underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-200"
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
                  className="h-9 rounded-lg border-border bg-card py-0 pl-8 text-xs shadow-none"
                />
              </div>
              <Select value={selectionTagFilter} onValueChange={setSelectionTagFilter}>
                <SelectTrigger className="h-9 w-full shrink-0 rounded-lg border-border bg-card py-0 text-xs shadow-none sm:w-[180px]">
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
                  setSelectionDateFilter(v as "all" | "last_7_days" | "last_30_days" | "this_year")
                }
              >
                <SelectTrigger className="h-9 w-full shrink-0 rounded-lg border-border bg-card py-0 text-xs shadow-none sm:w-[170px]">
                  <SelectValue placeholder="Datum" />
                </SelectTrigger>
                <SelectContent className="z-[220]">
                  <SelectItem value="all">Všechna data</SelectItem>
                  <SelectItem value="last_7_days">Posledních 7 dní</SelectItem>
                  <SelectItem value="last_30_days">Posledních 30 dní</SelectItem>
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
            className="pointer-events-none fixed z-[100] w-72 rounded-lg border border-rose-200 bg-white p-3 text-left shadow-lg dark:border-rose-900/60 dark:bg-zinc-950"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
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
