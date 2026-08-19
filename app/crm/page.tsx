"use client";

import { useLanguage } from "@/context/LanguageContext";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Globe,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash,
  Users,
  Target,
  Send,
  Rocket,
  RefreshCw,
  Eye,
  Hand,
  Mail,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  leadProvenanceParts,
  shortLeadAuthorName,
  type LeadSourceValue,
} from "@/lib/lead-provenance";
import {
  bulkDeleteLeads,
  bulkUpdateLeads,
  bulkScrapeLeadContacts,
  scrapeLeadContacts,
  createManualLead,
  getLeadSentEmails,
  getLeads,
  markLeadWebsiteVisited,
  updateLeadDetails,
  updateSingleLeadStatus,
  type LeadSentEmailRow,
} from "@/app/actions/crm";
import {
  sendOutreachEmailBulk,
  sendOutreachEmailNow,
} from "@/app/actions/outreach";
import { CrmKanbanBoard } from "@/app/crm/crm-kanban-board";
import {
  AutopilotDialog,
  type AutopilotLead,
} from "@/app/crm/autopilot-dialog";
import { CrmListView, nextLeadStatus } from "@/components/crm/crm-list-view";
import { CompanyAvatar } from "@/components/crm/company-avatar";
import { CrmToolbar } from "@/components/crm/crm-toolbar";
import {
  buildSniperLeadHref,
  leadFullWebsiteUrl,
} from "@/components/crm/crm-row-widgets";
import {
  matejAvatarStyle,
  matejBadgeStyle,
} from "@/lib/crm/matej-status";
import { toast } from "sonner";
import { OUTREACH_KIND_LABELS, type OutreachKindValue } from "@/lib/outreach";
import { htmlBodyToEditablePlainText } from "@/lib/email-format";
import { leadTagLabel, LEAD_TAG_ORDER } from "@/lib/lead-tags";
import { buildLeadFaviconUrl } from "@/lib/lead-favicon";

type Lead = {
  id: string;
  company: string;
  url: string;
  status:
    | "new"
    | "contacted"
    | "follow_up"
    | "communication"
    | "agreed"
    | "rejected"
    | "breakup";
  leadStatus:
    | "NEW"
    | "CONTACTED"
    | "REPLIED"
    | "MEETING_SET"
    | "CLOSED_WON"
    | "CLOSED_LOST"
    | "BREAK_UP";
  date: string;
  createdAt: string;
  value: number;
  avatar: string;
  faviconUrl?: string | null;
  placeId: string | null;
  email: string;
  phone: string;
  author: string;
  source: LeadSourceValue;
  contactedVia?: "" | "SNIPER" | "AUTOPILOT_SNIPER";
  websiteVisited?: boolean;
  websiteVisitedBy?: string;
  lastContactedAt?: string | null;
  nextOutreachAt?: string | null;
  nextOutreachKind?: OutreachKindValue | null;
  outreachDue?: boolean;
  /** Neviditelné tagy pro filtraci. */
  tags?: string[];
};

const COLUMNS = [
  {
    id: "new",
    title: "Nový lead",
    tint: "#02A7FF",
    color:
      "bg-[color:var(--n-field)] text-[color:var(--sk-ink-soft)] border-[color:var(--n-edge)] ",
    dot: "bg-slate-400 ",
  },
  {
    id: "contacted",
    title: "Kontaktováno",
    tint: "#7FCDFB",
    color:
      "bg-[color-mix(in_oklab,#3b82f6_16%,var(--n-field))] text-[color:#93c5fd] border-[color-mix(in_oklab,#3b82f6_32%,transparent)] ",
    dot: "bg-blue-500 ",
  },
  {
    id: "follow_up",
    title: "Follow up",
    tint: "#FBBF24",
    color:
      "bg-[color-mix(in_oklab,#fbbf24_16%,var(--n-field))] text-[color:#fcd34d] border-[color-mix(in_oklab,#fbbf24_32%,transparent)] ",
    dot: "bg-amber-500 ",
  },
  {
    id: "communication",
    title: "Komunikace",
    tint: "#C084FC",
    color:
      "bg-[color-mix(in_oklab,#c084fc_16%,var(--n-field))] text-[color:#d8b4fe] border-[color-mix(in_oklab,#c084fc_32%,transparent)] ",
    dot: "bg-violet-500 ",
  },
  {
    id: "agreed",
    title: "Domluveno",
    tint: "#34D399",
    color:
      "bg-[color-mix(in_oklab,#34d399_16%,var(--n-field))] text-[color:#6ee7b7] border-[color-mix(in_oklab,#34d399_32%,transparent)] ",
    dot: "bg-emerald-500 ",
  },
  {
    id: "breakup",
    title: "Breakup",
    tint: "#FF7802",
    color:
      "bg-[color-mix(in_oklab,#ff7802_16%,var(--n-field))] text-[color:#fdba74] border-[color-mix(in_oklab,#ff7802_32%,transparent)] ",
    dot: "bg-orange-500 ",
  },
  {
    id: "rejected",
    title: "Nedomluveno",
    tint: "#FB7185",
    color:
      "bg-[color-mix(in_oklab,#fb7185_16%,var(--n-field))] text-[color:#fda4af] border-[color-mix(in_oklab,#fb7185_32%,transparent)] ",
    dot: "bg-rose-500 ",
  },
];

const COLUMN_BY_ID = Object.fromEntries(
  COLUMNS.map((col) => [col.id, col]),
) as Record<(typeof COLUMNS)[number]["id"], (typeof COLUMNS)[number]>;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Čas pro řazení / filtr data: poslední odeslání, jinak přidání do CRM. */
function leadActivityTime(
  lead: Pick<Lead, "lastContactedAt" | "createdAt">,
): number {
  if (lead.lastContactedAt) {
    const t = new Date(lead.lastContactedAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  const created = new Date(lead.createdAt).getTime();
  return Number.isFinite(created) ? created : 0;
}

function formatCsDate(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("cs-CZ");
}

function boardSourceLabel(
  source: LeadSourceValue,
  contactedVia: Lead["contactedVia"],
  t: (key: string) => string,
): string {
  const parts = leadProvenanceParts(source, "", contactedVia);
  if (parts.sourceLabel === "Manuálně") return t("crm.sourceManual");
  if (parts.sourceLabel === "Autopilot Sniper") return t("crm.sourceAutopilotSniper");
  if (parts.sourceLabel === "Radar") return t("crm.sourceRadar");
  return parts.sourceLabel;
}

function boardContactSnippet(
  email: string,
  url: string,
): string {
  const trimmed = email.trim();
  if (trimmed.includes("@")) {
    return trimmed.split("@")[1] ?? trimmed;
  }
  if (url.trim()) return url.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] ?? url;
  return trimmed || "–";
}

/** Primární datum na kartě / v tabulce. */
function leadPrimaryDateLabel(
  lead: Pick<Lead, "lastContactedAt" | "createdAt" | "date">,
  labels: { sent: string; added: string },
): {
  label: string;
  /** Krátký řádek s datem (pro tabulku bez překryvu). */
  dateLine: string;
  kindLine: string;
  title: string;
  isSent: boolean;
} {
  if (lead.lastContactedAt) {
    const sent = formatCsDate(lead.lastContactedAt);
    return {
      label: `${labels.sent} ${sent}`,
      kindLine: labels.sent,
      dateLine: sent,
      title: `${labels.sent} ${sent}${lead.date ? ` · ${labels.added} ${lead.date}` : ""}`,
      isSent: true,
    };
  }
  return {
    label: `${labels.added} ${lead.date}`,
    kindLine: labels.added,
    dateLine: lead.date,
    title: `${labels.added} ${lead.date}`,
    isSent: false,
  };
}

function CrmPageContent() {
  const { t, language } = useLanguage();
  const ITEMS_PER_PAGE = 50;
  const translatedColumns = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        title:
          col.id === "breakup"
            ? t("leadStatus.BREAK_UP")
            : t(`crm.columns.${col.id}`),
      })),
    [t],
  );
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "value_high" | "value_low"
  >("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | Lead["leadStatus"]>(
    "all",
  );
  const [sourceFilter, setSourceFilter] = useState<
    | "all"
    | "radar"
    | "ap_radar"
    | "full_auto"
    | "ap_sniper"
    | "sniper"
    | "manual"
  >("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "last_7_days" | "last_30_days" | "this_year"
  >("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [leadsToDelete, setLeadsToDelete] = useState<string[] | null>(null);
  const [autopilotLeads, setAutopilotLeads] = useState<AutopilotLead[] | null>(
    null,
  );
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [scrapingLeadIds, setScrapingLeadIds] = useState<string[]>([]);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState({
    company: "",
    url: "",
    contactEmail: "",
    contactPhone: "",
    value: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    company: "",
    url: "",
    contactEmail: "",
    contactPhone: "",
    value: 0,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [sentEmailPreview, setSentEmailPreview] = useState<{
    companyName: string;
    emails: LeadSentEmailRow[];
    activeId: string;
  } | null>(null);
  const [isLoadingSentEmails, setIsLoadingSentEmails] = useState(false);

  const [view, setView] = useState<"board" | "list">("list");
  /** Keep board mounted after first open so list↔board switch doesn’t remount & flash */
  const [boardMounted, setBoardMounted] = useState(false);
  useEffect(() => {
    if (view === "board") setBoardMounted(true);
  }, [view]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const result = await getLeads();
      if ("error" in result && result.error) {
        toast.error(result.error);
        setLeads([]);
        return;
      }

      const mappedLeads = (result.leads ?? []).map((lead) => {
        let uiStatus: Lead["status"] = "new";
        if (lead.leadStatus === "CONTACTED") uiStatus = "contacted";
        if (lead.leadStatus === "REPLIED") uiStatus = "follow_up";
        if (lead.leadStatus === "MEETING_SET") uiStatus = "communication";
        if (lead.leadStatus === "CLOSED_WON") uiStatus = "agreed";
        if (lead.leadStatus === "CLOSED_LOST") uiStatus = "rejected";
        if (lead.leadStatus === "BREAK_UP") uiStatus = "breakup";

        return {
          ...lead,
          status: uiStatus,
        } as Lead;
      });

      setLeads(mappedLeads);
    } catch (err) {
      console.error("loadLeads failed", err);
      toast.error("Nepodařilo se načíst CRM.");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  // Jednou doplní chybějící autory z připojeného Google Sheetu
  useEffect(() => {
    if (isLoading || leads.length === 0) return;
    const missing = leads.some((l) => !shortLeadAuthorName(l.author));
    if (!missing) return;
    const key = "sklyvo-author-backfill-v1";
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void (async () => {
      const { backfillAuthorsFromConnectedSheet } =
        await import("@/app/actions/google-sheets");
      const result = await backfillAuthorsFromConnectedSheet();
      if ("updated" in result && (result.updated ?? 0) > 0) {
        await loadLeads();
      }
    })();
  }, [isLoading, leads]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedLeads([]);
  }, [searchQuery, sortBy, statusFilter, sourceFilter, dateFilter, tagFilter]);

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of leads) {
      for (const tag of lead.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return LEAD_TAG_ORDER.filter((tag) => counts.has(tag)).map((tag) => ({
      tag,
      count: counts.get(tag) ?? 0,
      label: leadTagLabel(tag),
    }));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const filtered = leads.filter((lead) => {
      const matchText =
        !q ||
        lead.company.toLowerCase().includes(q) ||
        lead.url.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" || lead.leadStatus === statusFilter;
      const matchSource =
        sourceFilter === "all" ||
        (sourceFilter === "radar" &&
          lead.source === "RADAR" &&
          !lead.contactedVia) ||
        (sourceFilter === "ap_radar" &&
          lead.source === "AUTOPILOT" &&
          !lead.contactedVia) ||
        (sourceFilter === "full_auto" && lead.source === "FULL_AUTO") ||
        (sourceFilter === "ap_sniper" &&
          lead.contactedVia === "AUTOPILOT_SNIPER") ||
        (sourceFilter === "sniper" &&
          (lead.source === "SNIPER" || lead.contactedVia === "SNIPER") &&
          lead.contactedVia !== "AUTOPILOT_SNIPER") ||
        (sourceFilter === "manual" &&
          lead.source === "MANUAL" &&
          !lead.contactedVia);

      const activity = leadActivityTime(lead);
      const activityDate = new Date(activity);
      const matchDate =
        dateFilter === "all" ||
        (dateFilter === "last_7_days" && activityDate >= sevenDaysAgo) ||
        (dateFilter === "last_30_days" && activityDate >= thirtyDaysAgo) ||
        (dateFilter === "this_year" &&
          activityDate.getFullYear() === now.getFullYear());

      const matchTag =
        tagFilter === "all" || (lead.tags ?? []).includes(tagFilter);

      return matchText && matchStatus && matchSource && matchDate && matchTag;
    });

    const byId = (a: Lead, b: Lead) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        const diff = leadActivityTime(a) - leadActivityTime(b);
        return diff !== 0 ? diff : byId(a, b);
      }
      if (sortBy === "value_high") {
        const diff = b.value - a.value;
        return diff !== 0 ? diff : byId(a, b);
      }
      if (sortBy === "value_low") {
        const diff = a.value - b.value;
        return diff !== 0 ? diff : byId(a, b);
      }
      // Výchozí „newest“: naposledy odeslané / aktivní nahoře
      const diff = leadActivityTime(b) - leadActivityTime(a);
      return diff !== 0 ? diff : byId(a, b);
    });

    return sorted;
  }, [
    leads,
    searchQuery,
    sortBy,
    statusFilter,
    sourceFilter,
    dateFilter,
    tagFilter,
  ]);

  const totalItems = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(
    pageStart,
    pageStart + ITEMS_PER_PAGE,
  );
  const shownFrom = totalItems === 0 ? 0 : pageStart + 1;
  const shownTo = totalItems === 0 ? 0 : pageStart + paginatedLeads.length;
  const allPageSelected =
    paginatedLeads.length > 0 &&
    paginatedLeads.every((lead) => selectedLeads.includes(lead.id));
  const allFilteredSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((lead) => selectedLeads.includes(lead.id));
  const somePageSelected =
    paginatedLeads.some((lead) => selectedLeads.includes(lead.id)) &&
    !allPageSelected;

  const toggleRowSelection = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllOnPage = () => {
    if (allPageSelected) {
      setSelectedLeads((prev) =>
        prev.filter((id) => !paginatedLeads.some((lead) => lead.id === id)),
      );
      return;
    }
    setSelectedLeads((prev) =>
      Array.from(new Set([...prev, ...paginatedLeads.map((lead) => lead.id)])),
    );
  };

  const selectAllFiltered = () => {
    setSelectedLeads(filteredLeads.map((lead) => lead.id));
  };

  const clearSelection = () => {
    setSelectedLeads([]);
  };

  const statusLabelMap: Record<Lead["status"], string> = {
    new: t("leadStatus.NEW"),
    contacted: t("leadStatus.CONTACTED"),
    follow_up: t("leadStatus.REPLIED"),
    communication: t("leadStatus.MEETING_SET"),
    agreed: t("leadStatus.CLOSED_WON"),
    rejected: t("leadStatus.CLOSED_LOST"),
    breakup: t("leadStatus.BREAK_UP"),
  };

  const statusColorMap: Record<Lead["status"], string> = {
    new: COLUMN_BY_ID.new.color,
    contacted: COLUMN_BY_ID.contacted.color,
    follow_up: COLUMN_BY_ID.follow_up.color,
    communication: COLUMN_BY_ID.communication.color,
    agreed: COLUMN_BY_ID.agreed.color,
    breakup: COLUMN_BY_ID.breakup.color,
    rejected: COLUMN_BY_ID.rejected.color,
  };

  const handleSendOutreach = async (
    leadId: string,
    kind: OutreachKindValue,
  ) => {
    const result = await sendOutreachEmailNow({ leadId, kind });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `${OUTREACH_KIND_LABELS[kind]} odeslán${result.nextDueLabel ? ` · další: ${result.nextDueLabel}` : ""}`,
    );
    await loadLeads();
  };

  const handleViewSentEmails = async (lead: Lead) => {
    setIsLoadingSentEmails(true);
    try {
      const result = await getLeadSentEmails(lead.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.emails.length === 0) {
        toast.message("Pro tuto firmu zatím nemáme uložený odeslaný e-mail.");
        return;
      }
      setSentEmailPreview({
        companyName: lead.company,
        emails: result.emails,
        activeId: result.emails[0]!.id,
      });
    } finally {
      setIsLoadingSentEmails(false);
    }
  };

  const handleBulkOutreach = async (kind: OutreachKindValue) => {
    if (selectedLeads.length === 0 || isBulkRunning) return;
    setIsBulkRunning(true);
    const result = await sendOutreachEmailBulk({
      leadIds: selectedLeads,
      kind,
    });
    setIsBulkRunning(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `${OUTREACH_KIND_LABELS[kind]}: ${result.sent} odesláno` +
        (result.failed ? `, ${result.failed} chyba` : ""),
    );
    if (result.errors?.[0]) toast.message(result.errors[0]);
    await loadLeads();
  };

  const handleBulkStatusUpdate = async (nextStatus: Lead["leadStatus"]) => {
    if (selectedLeads.length === 0 || isBulkRunning) return;
    setIsBulkRunning(true);
    const result = await bulkUpdateLeads(selectedLeads, { status: nextStatus });
    setIsBulkRunning(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`Aktualizováno ${result.updatedCount} leadů.`);
    setSelectedLeads([]);
    await loadLeads();
  };

  const handleBulkScrapeContacts = async () => {
    if (selectedLeads.length === 0 || isBulkRunning) return;
    setIsBulkRunning(true);
    toast.message(
      `Deep scrape ${selectedLeads.length} webů… to může chvíli trvat.`,
    );
    const result = await bulkScrapeLeadContacts(selectedLeads);
    setIsBulkRunning(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `Hotovo: +${result.emailsFound} e-mailů, +${result.phonesFound} telefonů (${result.updated} firem).` +
        (result.skippedNoWeb ? ` Bez webu: ${result.skippedNoWeb}.` : "") +
        (result.failed ? ` Chyby: ${result.failed}.` : ""),
    );
    await loadLeads();
  };

  const handleScrapeLeadContacts = async (lead: Lead) => {
    if (scrapingLeadIds.includes(lead.id) || isBulkRunning) return;
    const web = leadFullWebsiteUrl(lead.url);
    if (!web) {
      toast.error("Firma nemá webovou adresu.");
      return;
    }

    setScrapingLeadIds((prev) => [...prev, lead.id]);
    toast.message(`Prohledávám web ${lead.company}…`);
    const result = await scrapeLeadContacts(lead.id);
    setScrapingLeadIds((prev) => prev.filter((id) => id !== lead.id));

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    if (result.alreadyComplete) {
      toast.message("Kontakt je už kompletní.");
      return;
    }

    if (result.emailFound || result.phoneFound) {
      const parts: string[] = [];
      if (result.emailFound && result.email) parts.push(result.email);
      if (result.phoneFound && result.phone) parts.push(result.phone);
      toast.success(`Doplněno: ${parts.join(" · ")}`);
      await loadLeads();
      return;
    }

    toast.message("Na webu se e-mail ani telefon nepodařilo najít.");
  };

  const handleBulkDelete = () => {
    if (selectedLeads.length === 0) return;
    setLeadsToDelete(selectedLeads);
  };

  const handleStartAutopilot = () => {
    if (selectedLeads.length === 0) return;
    const selectedSet = new Set(selectedLeads);
    const targets: AutopilotLead[] = leads
      .filter((lead) => selectedSet.has(lead.id))
      .map((lead) => ({
        id: lead.id,
        company: lead.company,
        email: (lead.email ?? "").trim(),
        url: lead.url,
      }));
    if (targets.length === 0) return;
    setAutopilotLeads(targets);
  };

  const executeDelete = async () => {
    if (!leadsToDelete || leadsToDelete.length === 0 || isBulkRunning) return;
    setIsBulkRunning(true);
    const idsToRemove = [...leadsToDelete];
    const result = await bulkDeleteLeads(idsToRemove);
    setIsBulkRunning(false);
    setLeadsToDelete(null);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Odstraněno ${result.deletedCount} leadů.`);
    const removed = new Set(idsToRemove);
    setSelectedLeads((prev) => prev.filter((id) => !removed.has(id)));
    setLeads((prev) => prev.filter((lead) => !removed.has(lead.id)));
  };

  const handleOpenEdit = useCallback((lead: Lead) => {
    setEditingLead(lead);
    setEditForm({
      company: lead.company,
      url: lead.url,
      contactEmail: lead.email ?? "",
      contactPhone: lead.phone ?? "",
      value: lead.value ?? 0,
    });
  }, []);

  const handleOpenWebsite = useCallback((lead: Lead, websiteUrl: string) => {
    window.open(websiteUrl, "_blank", "noopener,noreferrer");
    if (lead.websiteVisited) return;

    setLeads((prev) =>
      prev.map((row) =>
        row.id === lead.id ? { ...row, websiteVisited: true } : row,
      ),
    );

    void markLeadWebsiteVisited(lead.id).then((result) => {
      if ("error" in result && result.error) {
        setLeads((prev) =>
          prev.map((row) =>
            row.id === lead.id
              ? { ...row, websiteVisited: false, websiteVisitedBy: "" }
              : row,
          ),
        );
        return;
      }
      const who =
        ("websiteVisitedBy" in result ? result.websiteVisitedBy : "") || "";
      setLeads((prev) =>
        prev.map((row) =>
          row.id === lead.id
            ? {
                ...row,
                websiteVisited: true,
                websiteVisitedBy: who || row.websiteVisitedBy || "",
              }
            : row,
        ),
      );
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const leadParam = searchParams.get("lead");
    if (!leadParam?.trim()) return;
    const decodedId = leadParam.trim();
    const match = leads.find((l) => l.id === decodedId);
    if (!match) {
      toast.error("Firma v CRM nebyla nalezena.");
      router.replace("/crm", { scroll: false });
      return;
    }
    handleOpenEdit(match);
    router.replace("/crm", { scroll: false });
  }, [isLoading, leads, searchParams, router, handleOpenEdit]);

  const mapLeadStatusToUi = (
    leadStatus: Lead["leadStatus"],
  ): Lead["status"] => {
    if (leadStatus === "CONTACTED") return "contacted";
    if (leadStatus === "REPLIED") return "follow_up";
    if (leadStatus === "MEETING_SET") return "communication";
    if (leadStatus === "CLOSED_WON") return "agreed";
    if (leadStatus === "CLOSED_LOST") return "rejected";
    if (leadStatus === "BREAK_UP") return "breakup";
    return "new";
  };

  const handleQuickStatus = async (
    leadId: string,
    nextStatus: Lead["leadStatus"],
    options?: { silentToast?: boolean },
  ) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              leadStatus: nextStatus,
              status: mapLeadStatusToUi(nextStatus),
            }
          : lead,
      ),
    );
    const result = await updateSingleLeadStatus(leadId, nextStatus);
    if ("error" in result && result.error) {
      toast.error(result.error);
      await loadLeads();
      return;
    }
    if (result.updatedCount === 0) {
      toast.error("Status se nepodařilo uložit.");
      await loadLeads();
      return;
    }
    if (!options?.silentToast) {
      toast.success("Status leadu aktualizován.");
    }
  };

  const handleDeleteSingleLead = (leadId: string) => {
    setLeadsToDelete([leadId]);
  };

  const handleCreateDeal = async () => {
    setIsCreating(true);
    try {
      const result = await createManualLead({
        companyName: newDealForm.company.trim(),
        domain: newDealForm.url.trim() || undefined,
        contactEmail: newDealForm.contactEmail.trim() || undefined,
        contactPhone: newDealForm.contactPhone.trim() || undefined,
        value: newDealForm.value,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      await loadLeads();
      setIsNewDealOpen(false);
      setNewDealForm({
        company: "",
        url: "",
        contactEmail: "",
        contactPhone: "",
        value: 0,
      });
      toast.success("Deal úspěšně vytvořen");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveDialog = async () => {
    if (!editingLead) return;
    setIsSaving(true);
    try {
      const result = await updateLeadDetails(editingLead.id, {
        company: editForm.company,
        url: editForm.url,
        email: editForm.contactEmail,
        phone: editForm.contactPhone,
        value: editForm.value,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      await loadLeads();
      setEditingLead(null);
      toast.success("Deal byl úspěšně upraven");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sk-page-shell flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="sk-crm-head shrink-0">
        <div className="sk-page-head sk-page-head--tool">
          <h1 className="sk-page-head__title">CRM</h1>
          <p className="sk-page-head__sub">{t("crm.subtitle")}</p>
        </div>

        <CrmToolbar
          t={t}
          selectedCount={selectedLeads.length}
          totalItems={totalItems}
          allFilteredSelected={allFilteredSelected}
          allPageSelected={allPageSelected}
          pageSize={paginatedLeads.length}
          isBulkRunning={isBulkRunning}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          view={view}
          onViewChange={setView}
          onNewDeal={() => setIsNewDealOpen(true)}
          onClearSelection={clearSelection}
          onSelectAllFiltered={selectAllFiltered}
          onBulkScrape={() => void handleBulkScrapeContacts()}
          onBulkFollowUp={() => void handleBulkOutreach("FOLLOW_UP")}
          onBulkBreakup={() => void handleBulkOutreach("BREAKUP")}
          onBulkStatus={(v) => void handleBulkStatusUpdate(v)}
          onStartAutopilot={() => handleStartAutopilot()}
          onBulkDelete={() => handleBulkDelete()}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          availableTags={availableTags}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      </div>

      <div className="sk-crm-body flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden px-0 sm:gap-4">
        {boardMounted && (
          <div
            className={cn(
              "flex min-h-0 w-full flex-1 flex-col overflow-x-visible overflow-y-hidden",
              view !== "board" && "hidden",
            )}
            aria-hidden={view !== "board"}
          >
            <CrmKanbanBoard
              columns={translatedColumns}
              leads={filteredLeads}
              isLoading={isLoading}
              formatCurrency={formatCurrency}
              onLeadMoved={(leadId, columnId) => {
                const nextByColumn: Record<string, Lead["leadStatus"]> = {
                  new: "NEW",
                  contacted: "CONTACTED",
                  follow_up: "REPLIED",
                  communication: "MEETING_SET",
                  agreed: "CLOSED_WON",
                  rejected: "CLOSED_LOST",
                  breakup: "BREAK_UP",
                };
                const next = nextByColumn[columnId];
                if (!next) return;
                void handleQuickStatus(leadId, next, { silentToast: true });
              }}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteSingleLead}
              onQuickStatus={(leadId, status) =>
                void handleQuickStatus(leadId, status as Lead["leadStatus"])
              }
              renderLeadCard={({
                lead,
                column: col,
                drag,
                isDragOverlay,
              }) => {
                const overlay = Boolean(isDragOverlay);
                const sourceLabel = boardSourceLabel(
                  lead.source,
                  lead.contactedVia,
                  t,
                );
                const contactSnippet = boardContactSnippet(lead.email, lead.url);
                const cardDate = lead.lastContactedAt
                  ? formatCsDate(lead.lastContactedAt)
                  : lead.date;

                return (
                  <div
                    ref={!overlay && drag ? drag.ref : undefined}
                    style={!overlay ? drag?.style : undefined}
                    {...(!overlay && drag ? drag.listeners : {})}
                    {...(!overlay && drag ? drag.attributes : {})}
                    className={cn(
                      "sk-crm-board-card touch-none",
                      !overlay && "cursor-grab active:cursor-grabbing",
                      overlay && "cursor-grabbing opacity-70 grayscale-[20%]",
                      drag?.isDragging && "opacity-40 grayscale-[35%]",
                    )}
                  >
                    <div className="sk-crm-board-card__top">
                      <CompanyAvatar
                        name={lead.company}
                        initials={lead.avatar}
                        faviconUrl={
                          lead.faviconUrl ?? buildLeadFaviconUrl(lead.url)
                        }
                        sizeClassName="h-[30px] w-[30px]"
                        textClassName="text-[11px]"
                        fallbackStyle={matejAvatarStyle(lead.company)}
                      />
                      <div className="sk-crm-board-card__main">
                        <h4 className="sk-crm-board-card__company">
                          {lead.company}
                        </h4>
                        <p className="sk-crm-board-card__source">{sourceLabel}</p>
                        <div className="sk-crm-board-card__domain">
                          <Globe className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{contactSnippet}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sk-crm-board-card__foot">
                      <span className="sk-crm-board-card__date">{cardDate}</span>
                      <span style={matejBadgeStyle(col.tint)}>{col.title}</span>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}

        <CrmListView
          visible={view === "list"}
          isLoading={isLoading}
          leads={paginatedLeads}
          selectedIds={selectedLeads}
          allFilteredSelected={allFilteredSelected}
          allPageSelected={allPageSelected}
          somePageSelected={somePageSelected}
          totalItems={totalItems}
          safePage={safePage}
          totalPages={totalPages}
          scrapingLeadIds={scrapingLeadIds}
          isBulkRunning={isBulkRunning}
          isLoadingSentEmails={isLoadingSentEmails}
          t={t}
          statusLabelMap={statusLabelMap}
          onToggleAll={() => {
            if (allFilteredSelected || allPageSelected) {
              clearSelection();
            } else {
              toggleAllOnPage();
            }
          }}
          onToggleRow={toggleRowSelection}
          onQuickStatus={(id, status) => void handleQuickStatus(id, status)}
          onCycleStatus={(id, current) =>
            void handleQuickStatus(id, nextLeadStatus(current))
          }
          onOpenWebsite={(lead, url) => handleOpenWebsite(lead as Lead, url)}
          onOpenEdit={(lead) => handleOpenEdit(lead as Lead)}
          onScrapeContacts={(lead) => void handleScrapeLeadContacts(lead as Lead)}
          onViewSentEmails={(lead) => void handleViewSentEmails(lead as Lead)}
          onSendOutreach={(id, kind) => void handleSendOutreach(id, kind)}
          onDelete={handleDeleteSingleLead}
          onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        />

      </div>

      <Dialog
        open={!!editingLead}
        onOpenChange={(open) => {
          if (!open) setEditingLead(null);
        }}
      >
        <DialogContent className="sk-dialog-flat sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upravit deal</DialogTitle>
            <DialogDescription className="text-[#8a8f98]">
              Upravte detaily firmy a hodnotu dealu.
            </DialogDescription>
          </DialogHeader>

          <div className="sk-fields">
            <div className="space-y-1.5">
              <Label>Název firmy</Label>
              <Input
                value={editForm.company}
                onChange={(e) =>
                  setEditForm({ ...editForm, company: e.target.value })
                }
                placeholder="Název firmy"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Webová adresa (url)</Label>
              <Input
                value={editForm.url}
                onChange={(e) =>
                  setEditForm({ ...editForm, url: e.target.value })
                }
                placeholder="např. example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                value={editForm.contactEmail}
                onChange={(e) =>
                  setEditForm({ ...editForm, contactEmail: e.target.value })
                }
                placeholder="např. info@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input
                value={editForm.contactPhone}
                onChange={(e) =>
                  setEditForm({ ...editForm, contactPhone: e.target.value })
                }
                placeholder="např. +420 123 456 789"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Odhadovaná hodnota (Kč)</Label>
              <Input
                type="number"
                min={0}
                value={editForm.value}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    value: Number(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
              <p className="text-[11px] text-[#6b7078]">
                Odhadovaná cena zakázky. Ve fázích nahoře se sčítá automaticky.
              </p>
            </div>
          </div>

          <div className="sk-dialog-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingLead(null)}
            >
              Zrušit
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveDialog}
              disabled={isSaving}
            >
              {isSaving ? "Ukládám..." : "Uložit změny"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sentEmailPreview !== null}
        onOpenChange={(open) => {
          if (!open) setSentEmailPreview(null);
        }}
      >
        <DialogContent className="sk-dialog-flat flex max-h-[88vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
          {sentEmailPreview &&
            (() => {
              const active =
                sentEmailPreview.emails.find(
                  (e) => e.id === sentEmailPreview.activeId,
                ) ?? sentEmailPreview.emails[0]!;
              const bodyText = htmlBodyToEditablePlainText(active.htmlBody);
              return (
                <>
                  <DialogHeader className="space-y-1 border-b border-white/10 px-6 py-4 pr-12 text-left">
                    <DialogTitle className="text-base font-semibold leading-snug">
                      Odeslaný e-mail · {sentEmailPreview.companyName}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {OUTREACH_KIND_LABELS[active.kind]}
                      {active.sentAt
                        ? ` · ${new Date(active.sentAt).toLocaleString("cs-CZ")}`
                        : ""}
                    </DialogDescription>
                  </DialogHeader>

                  {sentEmailPreview.emails.length > 1 ? (
                    <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-2">
                      {sentEmailPreview.emails.map((email, index) => {
                        const selected = email.id === active.id;
                        return (
                          <button
                            key={email.id}
                            type="button"
                            onClick={() =>
                              setSentEmailPreview((prev) =>
                                prev ? { ...prev, activeId: email.id } : prev,
                              )
                            }
                            className={cn(
                              "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                              selected
                                ? "bg-white text-[#08090a]"
                                : "bg-[#131417] text-[#8a8f98] hover:text-[#f2f3f5]",
                            )}
                          >
                            {OUTREACH_KIND_LABELS[email.kind]}
                            {sentEmailPreview.emails.length > 1
                              ? ` #${index + 1}`
                              : ""}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Předmět
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {active.subject}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Tělo e-mailu
                      </p>
                      <div className="whitespace-pre-wrap rounded-xl border border-white/13 bg-[#131417] px-4 py-3 text-sm leading-relaxed text-[#f2f3f5]">
                        {bodyText || "—"}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="sk-dialog-flat sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("crm.newDeal")}</DialogTitle>
            <DialogDescription className="text-[#8a8f98]">
              Zadejte údaje o firmě a hodnotě dealu.
            </DialogDescription>
          </DialogHeader>

          <div className="sk-fields">
            <div className="space-y-1.5">
              <Label>Název firmy</Label>
              <Input
                value={newDealForm.company}
                onChange={(e) =>
                  setNewDealForm({ ...newDealForm, company: e.target.value })
                }
                placeholder="Název firmy"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Webová adresa (url)</Label>
              <Input
                value={newDealForm.url}
                onChange={(e) =>
                  setNewDealForm({ ...newDealForm, url: e.target.value })
                }
                placeholder="např. example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                value={newDealForm.contactEmail}
                onChange={(e) =>
                  setNewDealForm({
                    ...newDealForm,
                    contactEmail: e.target.value,
                  })
                }
                placeholder="např. info@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input
                value={newDealForm.contactPhone}
                onChange={(e) =>
                  setNewDealForm({
                    ...newDealForm,
                    contactPhone: e.target.value,
                  })
                }
                placeholder="např. +420 123 456 789"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Odhadovaná hodnota (Kč)</Label>
              <Input
                type="number"
                min={0}
                value={newDealForm.value}
                onChange={(e) =>
                  setNewDealForm({
                    ...newDealForm,
                    value: Number(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
              <p className="text-[11px] text-[#6b7078]">
                Odhadovaná cena zakázky. Ve fázích nahoře se sčítá automaticky.
              </p>
            </div>
          </div>

          <div className="sk-dialog-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={isCreating}
              onClick={() => setIsNewDealOpen(false)}
            >
              Zrušit
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isCreating}
              onClick={() => void handleCreateDeal()}
            >
              {isCreating ? "Vytvářím..." : "Vytvořit deal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AutopilotDialog
        open={autopilotLeads !== null}
        onOpenChange={(open) => {
          if (!open) setAutopilotLeads(null);
        }}
        leads={autopilotLeads ?? []}
        onFinished={() => {
          setSelectedLeads([]);
          void loadLeads();
        }}
      />

      <AlertDialog
        open={leadsToDelete !== null}
        onOpenChange={(open) => !open && setLeadsToDelete(null)}
      >
        <AlertDialogContent className="bg-card border shadow-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Opravdu chcete odstranit vybrané dealy?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tuto akci nelze vrátit zpět. Dojde k trvalému odstranění{" "}
              {leadsToDelete?.length} záznamů z vaší databáze.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void executeDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isBulkRunning ? "Mažu..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CrmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-sm text-muted-foreground">
          Načítám CRM…
        </div>
      }
    >
      <CrmPageContent />
    </Suspense>
  );
}
