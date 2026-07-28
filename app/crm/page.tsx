"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  Globe, 
  Calendar, 
  MoreHorizontal,
  SlidersHorizontal,
  Pencil,
  Trash,
  Users,
  Target,
  Send,
  Rocket,
  Bell,
  Loader2,
  ScanSearch,
  RefreshCw,
  Hand,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leadProvenanceParts, shortLeadAuthorName, type LeadSourceValue } from "@/lib/lead-provenance";
import {
  bulkDeleteLeads,
  bulkUpdateLeads,
  bulkScrapeLeadContacts,
  scrapeLeadContacts,
  createManualLead,
  getLeads,
  markLeadWebsiteVisited,
  updateLeadDetails,
  updateSingleLeadStatus,
} from "@/app/actions/crm";
import { sendOutreachEmailBulk, sendOutreachEmailNow } from "@/app/actions/outreach";
import { CrmKanbanBoard } from "@/app/crm/crm-kanban-board";
import { AutopilotDialog, type AutopilotLead } from "@/app/crm/autopilot-dialog";
import { CompanyAvatar } from "@/components/crm/company-avatar";
import { toast } from "sonner";
import { OUTREACH_KIND_LABELS, type OutreachKindValue } from "@/lib/outreach";

type Lead = {
  id: string;
  company: string;
  url: string;
  status: "new" | "contacted" | "follow_up" | "communication" | "agreed" | "rejected" | "breakup";
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
};

const COLUMNS = [
  { id: "new", title: "Nový lead", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600", dot: "bg-slate-400 dark:bg-slate-500" },
  { id: "contacted", title: "Kontaktováno", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700", dot: "bg-blue-500 dark:bg-blue-400" },
  { id: "follow_up", title: "Follow up", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700", dot: "bg-amber-500 dark:bg-amber-400" },
  { id: "communication", title: "Komunikace", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700", dot: "bg-violet-500 dark:bg-violet-400" },
  { id: "agreed", title: "Domluveno", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700", dot: "bg-emerald-500 dark:bg-emerald-400" },
  { id: "rejected", title: "Nedomluveno", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700", dot: "bg-rose-500 dark:bg-rose-400" },
  { id: "breakup", title: "Breakup", color: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700", dot: "bg-orange-500 dark:bg-orange-400" },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
};

function WebsiteVisitedGlobeButton({
  visited,
  visitedBy,
  onOpen,
  size = "md",
}: {
  visited?: boolean;
  visitedBy?: string;
  onOpen: () => void;
  size?: "sm" | "md";
}) {
  const who = shortLeadAuthorName(visitedBy);
  const isSm = size === "sm";
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <Popover open={hintOpen} onOpenChange={setHintOpen}>
      <div
        className="relative inline-flex shrink-0"
        onMouseEnter={() => setHintOpen(true)}
        onMouseLeave={() => setHintOpen(false)}
      >
        <PopoverAnchor asChild>
          <Button
            type="button"
            variant={isSm ? "ghost" : "outline"}
            size="sm"
            onClick={onOpen}
            onFocus={() => setHintOpen(true)}
            onBlur={() => setHintOpen(false)}
            className={cn(
              isSm
                ? "h-8 w-8 rounded-full p-0 hover:bg-muted"
                : "h-8 w-8 shrink-0 rounded-lg p-0 shadow-sm",
              visited
                ? isSm
                  ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-200"
                : isSm
                  ? "text-muted-foreground hover:text-foreground"
                  : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-label={
              visited
                ? who
                  ? `Web prohlédnut — první návštěva webu: ${who}`
                  : "Web prohlédnut"
                : "Otevřít web firmy"
            }
          >
            <Globe className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </PopoverAnchor>
      </div>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="z-[200] w-auto max-w-[15rem] rounded-xl border border-border bg-white px-3 py-2 opacity-100 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
      >
        {visited ? (
          <>
            <p className="text-xs font-semibold leading-snug text-emerald-700 dark:text-emerald-400">
              Web už někdo prošel
            </p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {who
                ? `První návštěva webu: ${who}`
                : "Někdo z týmu už web otevřel."}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold leading-snug text-foreground">
              Otevřít web
            </p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Po první návštěvě zezelená.
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function leadFullWebsiteUrl(domainOrUrl: string): string {
  const raw = (domainOrUrl ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

function buildSniperLeadHref(lead: Pick<Lead, "url" | "email">): string {
  const website = leadFullWebsiteUrl(lead.url);
  const email = (lead.email ?? "").trim();
  const qs: string[] = [];
  if (website) qs.push(`url=${encodeURIComponent(website)}`);
  if (email) qs.push(`email=${encodeURIComponent(email)}`);
  return qs.length > 0 ? `/sniper?${qs.join("&")}` : "/sniper";
}

const SCRAPE_CONTACT_HINT = "Důkladně prohledá web a doplní e-mail nebo telefon";

function ScrapeContactButton({
  isLoading,
  disabled,
  onClick,
  variant = "outline",
  className,
}: {
  isLoading: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <Popover open={hintOpen} onOpenChange={setHintOpen}>
      <div
        className="shrink-0"
        onMouseEnter={() => setHintOpen(true)}
        onMouseLeave={() => setHintOpen(false)}
      >
        <PopoverAnchor asChild>
          <Button
            type="button"
            variant={variant}
            size="sm"
            disabled={disabled || isLoading}
            onClick={onClick}
            onFocus={() => setHintOpen(true)}
            onBlur={() => setHintOpen(false)}
            className={className}
            aria-label={SCRAPE_CONTACT_HINT}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanSearch className="h-3.5 w-3.5" />
            )}
          </Button>
        </PopoverAnchor>
      </div>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-auto max-w-[15rem] rounded-xl border-border/70 bg-white px-3 py-2 shadow-lg dark:border-zinc-700/90 dark:bg-zinc-950"
      >
        <p className="text-xs font-medium leading-snug text-foreground">{SCRAPE_CONTACT_HINT}</p>
      </PopoverContent>
    </Popover>
  );
}

function CrmPageContent() {
  const ITEMS_PER_PAGE = 50;
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "value_high" | "value_low">("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | Lead["leadStatus"]>("all");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "radar" | "ap_radar" | "ap_sniper" | "sniper" | "manual"
  >("all");
  const [dateFilter, setDateFilter] = useState<"all" | "last_7_days" | "last_30_days" | "this_year">("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [leadsToDelete, setLeadsToDelete] = useState<string[] | null>(null);
  const [autopilotLeads, setAutopilotLeads] = useState<AutopilotLead[] | null>(null);
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

  const [view, setView] = useState<"board" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
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
    const key = "venegard-author-backfill-v1";
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void (async () => {
      const { backfillAuthorsFromConnectedSheet } = await import(
        "@/app/actions/google-sheets"
      );
      const result = await backfillAuthorsFromConnectedSheet();
      if ("updated" in result && (result.updated ?? 0) > 0) {
        await loadLeads();
      }
    })();
  }, [isLoading, leads]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedLeads([]);
  }, [searchQuery, sortBy, statusFilter, sourceFilter, dateFilter]);

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

      const matchStatus = statusFilter === "all" || lead.leadStatus === statusFilter;
      const matchSource =
        sourceFilter === "all" ||
        (sourceFilter === "radar" &&
          lead.source === "RADAR" &&
          !lead.contactedVia) ||
        (sourceFilter === "ap_radar" &&
          lead.source === "AUTOPILOT" &&
          !lead.contactedVia) ||
        (sourceFilter === "ap_sniper" && lead.contactedVia === "AUTOPILOT_SNIPER") ||
        (sourceFilter === "sniper" &&
          (lead.source === "SNIPER" || lead.contactedVia === "SNIPER") &&
          lead.contactedVia !== "AUTOPILOT_SNIPER") ||
        (sourceFilter === "manual" && lead.source === "MANUAL" && !lead.contactedVia);

      const created = new Date(lead.createdAt);
      const matchDate =
        dateFilter === "all" ||
        (dateFilter === "last_7_days" && created >= sevenDaysAgo) ||
        (dateFilter === "last_30_days" && created >= thirtyDaysAgo) ||
        (dateFilter === "this_year" && created.getFullYear() === now.getFullYear());

      return matchText && matchStatus && matchSource && matchDate;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "value_high") return b.value - a.value;
      if (sortBy === "value_low") return a.value - b.value;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [leads, searchQuery, sortBy, statusFilter, sourceFilter, dateFilter]);

  const totalItems = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const shownFrom = totalItems === 0 ? 0 : pageStart + 1;
  const shownTo = totalItems === 0 ? 0 : pageStart + paginatedLeads.length;
  const allPageSelected =
    paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedLeads.includes(lead.id));
  const allFilteredSelected =
    filteredLeads.length > 0 && filteredLeads.every((lead) => selectedLeads.includes(lead.id));
  const somePageSelected =
    paginatedLeads.some((lead) => selectedLeads.includes(lead.id)) && !allPageSelected;

  const toggleRowSelection = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllOnPage = () => {
    if (allPageSelected) {
      setSelectedLeads((prev) => prev.filter((id) => !paginatedLeads.some((lead) => lead.id === id)));
      return;
    }
    setSelectedLeads((prev) => Array.from(new Set([...prev, ...paginatedLeads.map((lead) => lead.id)])));
  };

  const selectAllFiltered = () => {
    setSelectedLeads(filteredLeads.map((lead) => lead.id));
  };

  const clearSelection = () => {
    setSelectedLeads([]);
  };

  const statusLabelMap: Record<Lead["status"], string> = {
    new: "Nový lead",
    contacted: "Kontaktováno",
    follow_up: "Follow up",
    communication: "Komunikace",
    agreed: "Domluveno",
    rejected: "Nedomluveno",
    breakup: "Breakup",
  };

  const statusColorMap: Record<Lead["status"], string> = {
    new: COLUMNS[0].color,
    contacted: COLUMNS[1].color,
    follow_up: COLUMNS[2].color,
    communication: COLUMNS[3].color,
    agreed: COLUMNS[4].color,
    rejected: COLUMNS[5].color,
    breakup: COLUMNS[6].color,
  };

  const dueOutreachLeads = useMemo(
    () => leads.filter((l) => l.outreachDue),
    [leads],
  );

  const handleSendOutreach = async (leadId: string, kind: OutreachKindValue) => {
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

  const handleBulkOutreach = async (kind: OutreachKindValue) => {
    if (selectedLeads.length === 0 || isBulkRunning) return;
    setIsBulkRunning(true);
    const result = await sendOutreachEmailBulk({ leadIds: selectedLeads, kind });
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
    toast.message(`Deep scrape ${selectedLeads.length} webů… to může chvíli trvat.`);
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
    const result = await bulkDeleteLeads(leadsToDelete);
    setIsBulkRunning(false);
    setLeadsToDelete(null);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Odstraněno ${result.deletedCount} leadů.`);
    setSelectedLeads([]);
    await loadLeads();
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
      prev.map((row) => (row.id === lead.id ? { ...row, websiteVisited: true } : row)),
    );

    void markLeadWebsiteVisited(lead.id).then((result) => {
      if ("error" in result && result.error) {
        setLeads((prev) =>
          prev.map((row) =>
            row.id === lead.id ? { ...row, websiteVisited: false, websiteVisitedBy: "" } : row,
          ),
        );
        return;
      }
      const who = ("websiteVisitedBy" in result ? result.websiteVisitedBy : "") || "";
      setLeads((prev) =>
        prev.map((row) =>
          row.id === lead.id
            ? { ...row, websiteVisited: true, websiteVisitedBy: who || row.websiteVisitedBy || "" }
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

  const mapLeadStatusToUi = (leadStatus: Lead["leadStatus"]): Lead["status"] => {
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
          ? { ...lead, leadStatus: nextStatus, status: mapLeadStatusToUi(nextStatus) }
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
      setNewDealForm({ company: "", url: "", contactEmail: "", contactPhone: "", value: 0 });
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
      <div className="flex h-full min-h-0 w-full flex-1 flex-col items-stretch overflow-hidden md:items-center">
        
        {/* Mobile header */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2 md:hidden">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">CRM</h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {totalItems} {totalItems === 1 ? "firma" : "firem"} v pipeline
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 rounded-full bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={() => setIsNewDealOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nový
          </Button>
        </div>

        {/* Desktop hero — stejný styl jako Radar / Sniper */}
        <div className="mb-2 hidden shrink-0 space-y-1 text-center md:block">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Users className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            CRM
          </h1>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            Sledujte stav oslovených firem a nenechte žádný potenciální deal vychladnout.
          </p>
        </div>

        <div className="flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-2 overflow-hidden px-0 sm:gap-4 md:px-8">
          {dueOutreachLeads.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
              <div className="flex min-w-0 items-start gap-2">
                <Bell className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold sm:text-sm">
                    {dueOutreachLeads.length} leadů čeká na follow-up / breakup
                  </p>
                  <p className="hidden text-xs opacity-80 sm:block">
                    Po 14 dnech follow-up, dalších 14 breakup. Pošli je přímo z CRM.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-300 bg-white px-2 text-[11px] font-semibold dark:bg-transparent sm:h-9 sm:px-3 sm:text-sm"
                  disabled={isBulkRunning}
                  onClick={() => {
                    const ids = dueOutreachLeads
                      .filter((l) => l.nextOutreachKind === "FOLLOW_UP")
                      .map((l) => l.id);
                    if (ids.length === 0) {
                      toast.message("Žádný splatný follow-up.");
                      return;
                    }
                    setSelectedLeads(ids);
                    void handleBulkOutreach("FOLLOW_UP");
                  }}
                >
                  Follow-upy
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-orange-700 px-2 text-[11px] font-semibold text-white hover:bg-orange-800 sm:h-9 sm:px-3 sm:text-sm"
                  disabled={isBulkRunning}
                  onClick={() => {
                    const ids = dueOutreachLeads
                      .filter((l) => l.nextOutreachKind === "BREAKUP")
                      .map((l) => l.id);
                    if (ids.length === 0) {
                      toast.message("Žádný splatný breakup.");
                      return;
                    }
                    setSelectedLeads(ids);
                    void handleBulkOutreach("BREAKUP");
                  }}
                >
                  Breakupy
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex min-h-0 shrink-0 items-center rounded-2xl bg-muted/50 p-1.5 dark:bg-muted/20 md:rounded-2xl md:border md:border-border/60 md:bg-card md:p-3 md:shadow-sm">
            {selectedLeads.length > 0 ? (
              <div className="flex w-full flex-col gap-2 rounded-md bg-blue-50 p-2 dark:bg-blue-900/20">
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <span className="px-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Vybráno: {selectedLeads.length}
                    {allFilteredSelected ? ` z ${totalItems}` : ""} firem
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleBulkScrapeContacts()}
                      disabled={isBulkRunning}
                      className="border-blue-200 bg-background font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Doplnit kontakty z webu
                    </Button>
                      <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleBulkOutreach("FOLLOW_UP")}
                      disabled={isBulkRunning}
                      className="border-amber-200 bg-background font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Follow-up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleBulkOutreach("BREAKUP")}
                      disabled={isBulkRunning}
                      className="border-orange-200 bg-background font-semibold text-orange-800 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300"
                    >
                      <Hand className="mr-2 h-4 w-4" />
                      Breakup
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStartAutopilot()}
                      disabled={isBulkRunning}
                      className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Spustit Autopilota
                    </Button>
                    <Select onValueChange={(v) => void handleBulkStatusUpdate(v as Lead["leadStatus"])} disabled={isBulkRunning}>
                      <SelectTrigger className="h-8 w-[190px] bg-background">
                        <SelectValue placeholder="Změnit status" />
                      </SelectTrigger>
                      <SelectContent className="z-50 border bg-white shadow-md dark:bg-zinc-950">
                        <SelectItem value="NEW">NOVÝ LEAD</SelectItem>
                        <SelectItem value="CONTACTED">KONTAKTOVÁNO</SelectItem>
                        <SelectItem value="REPLIED">FOLLOW UP</SelectItem>
                        <SelectItem value="MEETING_SET">KOMUNIKACE</SelectItem>
                        <SelectItem value="CLOSED_WON">DOMLUVENO</SelectItem>
                        <SelectItem value="CLOSED_LOST">NEDOMLUVENO</SelectItem>
                        <SelectItem value="BREAK_UP">BREAKUP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkDelete()}
                      disabled={isBulkRunning}
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                    >
                      Odstranit vybrané
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      disabled={isBulkRunning}
                      className="text-blue-700 hover:bg-blue-100/80 dark:text-blue-300 dark:hover:bg-blue-900/40"
                    >
                      Zrušit výběr
                    </Button>
                  </div>
                </div>
                {!allFilteredSelected && totalItems > selectedLeads.length && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-blue-200/70 px-2 pt-2 text-xs text-blue-800 dark:border-blue-800 dark:text-blue-200">
                    <span>
                      {allPageSelected
                        ? `Vybraná je jen tato stránka (${paginatedLeads.length}).`
                        : "Nejsou vybrané všechny firmy ve filtru."}
                    </span>
                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2 hover:no-underline"
                      onClick={selectAllFiltered}
                    >
                      Vybrat všech {totalItems} ve filtru
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex w-full items-center gap-1.5 md:flex-row md:justify-between md:gap-4">
                <div className="relative min-w-0 flex-1 md:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:h-4 md:w-4" />
                  <Input 
                    placeholder="Hledat firmu…" 
                    className="h-9 border-0 bg-transparent pl-9 text-[15px] shadow-none focus-visible:ring-0 md:h-9 md:rounded-xl md:border md:border-border/50 md:bg-background md:pl-9 md:text-sm md:shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-1 md:gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 rounded-full p-0 text-muted-foreground hover:bg-background/80 hover:text-foreground md:h-11 md:w-auto md:rounded-xl md:border md:border-border/60 md:bg-background md:px-4 md:text-sm"
                      >
                        <SlidersHorizontal className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Filtry</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[100] w-80 border border-border bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-950" align="end">
                      <div className="flex flex-col gap-4">
                        <div className="space-y-1.5">
                          <Label>Status</Label>
                          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | Lead["leadStatus"])}>
                            <SelectTrigger className="h-9 w-full bg-background">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="z-50 border bg-white shadow-md dark:bg-zinc-950">
                              <SelectItem value="all">Všechny statusy</SelectItem>
                              <SelectItem value="NEW">NOVÝ LEAD</SelectItem>
                              <SelectItem value="CONTACTED">KONTAKTOVÁNO</SelectItem>
                              <SelectItem value="REPLIED">FOLLOW UP</SelectItem>
                              <SelectItem value="MEETING_SET">KOMUNIKACE</SelectItem>
                              <SelectItem value="CLOSED_WON">DOMLUVENO</SelectItem>
                              <SelectItem value="CLOSED_LOST">NEDOMLUVENO</SelectItem>
                              <SelectItem value="BREAK_UP">BREAKUP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Datum</Label>
                          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as "all" | "last_7_days" | "last_30_days" | "this_year")}>
                            <SelectTrigger className="h-9 w-full bg-background">
                              <SelectValue placeholder="Čas" />
                            </SelectTrigger>
                            <SelectContent className="z-50 border bg-white shadow-md dark:bg-zinc-950">
                              <SelectItem value="all">Všechny datumy</SelectItem>
                              <SelectItem value="last_7_days">Posledních 7 dní</SelectItem>
                              <SelectItem value="last_30_days">Posledních 30 dní</SelectItem>
                              <SelectItem value="this_year">Tento rok</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Zdroj</Label>
                          <Select
                            value={sourceFilter}
                            onValueChange={(v) =>
                              setSourceFilter(
                                v as "all" | "radar" | "ap_radar" | "ap_sniper" | "sniper" | "manual",
                              )
                            }
                          >
                            <SelectTrigger className="h-9 w-full bg-background">
                              <SelectValue placeholder="Zdroj" />
                            </SelectTrigger>
                            <SelectContent className="z-[110] border border-border bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
                              <SelectItem value="all">Všechny zdroje</SelectItem>
                              <SelectItem value="radar">Radar</SelectItem>
                              <SelectItem value="ap_radar">Autopilot Radar</SelectItem>
                              <SelectItem value="ap_sniper">Autopilot Sniper</SelectItem>
                              <SelectItem value="sniper">Sniper</SelectItem>
                              <SelectItem value="manual">Manuálně</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Řazení</Label>
                          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "oldest" | "value_high" | "value_low")}>
                            <SelectTrigger className="h-9 w-full bg-background">
                              <SelectValue placeholder="Řazení" />
                            </SelectTrigger>
                            <SelectContent className="z-50 border bg-white shadow-md dark:bg-zinc-950">
                              <SelectItem value="newest">Nejnovější</SelectItem>
                              <SelectItem value="oldest">Nejstarší</SelectItem>
                              <SelectItem value="value_high">Hodnota: nejvyšší</SelectItem>
                              <SelectItem value="value_low">Hodnota: nejnižší</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="flex items-center rounded-full bg-background/70 p-0.5 md:rounded-xl md:border md:border-border/50 md:bg-background md:p-1">
                    <button
                      type="button"
                      title="Seznam firem"
                      onClick={() => setView("list")}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-all md:h-9 md:w-10 md:rounded-lg",
                        view === "list" ? "bg-card text-blue-600 shadow-sm dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                    <button
                      type="button"
                      title="Kanban board"
                      onClick={() => setView("board")}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-all md:h-9 md:w-10 md:rounded-lg",
                        view === "board" ? "bg-card text-blue-600 shadow-sm dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LayoutGrid className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    className="hidden h-9 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 md:inline-flex"
                    onClick={() => setIsNewDealOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nový deal
                  </Button>
                </div>
              </div>
            )}
          </div>

          {view === "board" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-x-visible overflow-y-hidden">
            <CrmKanbanBoard
              columns={COLUMNS}
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
                onEdit,
                onDelete,
                onQuickStatus,
              }) => {
                const overlay = Boolean(isDragOverlay);
                const companyWeb = leadFullWebsiteUrl(lead.url);

                return (
                <div
                  ref={!overlay && drag ? drag.ref : undefined}
                  style={!overlay ? drag?.style : undefined}
                  {...(!overlay && drag ? drag.listeners : {})}
                  {...(!overlay && drag ? drag.attributes : {})}
                  className={cn(
                    "group flex w-full min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 box-border shadow-sm transition-all touch-none",
                    !overlay &&
                      "cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md",
                    overlay &&
                      "cursor-grabbing bg-muted/80 opacity-70 shadow-xl ring-2 ring-blue-500/25 grayscale-[20%]",
                    drag?.isDragging && "opacity-40 grayscale-[35%]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CompanyAvatar
                        name={lead.company}
                        initials={lead.avatar}
                        faviconUrl={lead.faviconUrl}
                        sizeClassName="h-8 w-8"
                        textClassName="text-[10px]"
                      />
                      <div className="min-w-0">
                        <h4 className="mb-1 truncate text-sm font-bold leading-none text-foreground">
                          {lead.company}
                        </h4>
                        {(() => {
                          const { sourceLabel, authorLabel } = leadProvenanceParts(
                            lead.source,
                            lead.author,
                            lead.contactedVia,
                          );
                          if (!sourceLabel && !authorLabel) return null;
                          return (
                            <p className="mb-0.5 truncate text-[9px] text-muted-foreground">
                              {sourceLabel}
                              {authorLabel ? (
                                <>
                                  {" · "}
                                  <span className="font-semibold text-foreground/80">{authorLabel}</span>
                                </>
                              ) : null}
                            </p>
                          );
                        })()}
                        {companyWeb ? (
                        <a
                          href={companyWeb}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center text-[9px] text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <Globe className="mr-1 h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{lead.url}</span>
                        </a>
                        ) : (
                          <span className="flex items-center text-[9px] text-muted-foreground truncate">
                            <Globe className="mr-1 h-2.5 w-2.5 shrink-0 opacity-50" />
                            –
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground p-1 hover:bg-muted rounded-md"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-white dark:bg-zinc-950 z-50 border shadow-md"
                      >
                        <DropdownMenuItem onClick={() => onEdit()}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Upravit deal
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={buildSniperLeadHref(lead)} className="flex cursor-pointer items-center">
                            <Target className="mr-2 h-4 w-4" />
                            Odeslat do Snipera
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleSendOutreach(lead.id, "FOLLOW_UP")}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Poslat follow-up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleSendOutreach(lead.id, "BREAKUP")}
                        >
                          <Hand className="mr-2 h-4 w-4" />
                          Poslat breakup
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete()}
                          className="text-red-600 focus:text-red-700"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-border/40">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center text-[10px] text-muted-foreground font-medium">
                        <Calendar className="mr-1.5 h-3 w-3" />
                        {lead.date}
                      </div>
                      {lead.outreachDue && lead.nextOutreachKind ? (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          {OUTREACH_KIND_LABELS[lead.nextOutreachKind]} splatný
                        </span>
                      ) : null}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "px-1.5 py-0.5 rounded-md text-[8px] font-bold border uppercase tracking-widest hover:opacity-80 transition-opacity cursor-pointer",
                            col.color,
                          )}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {col.title}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50 border bg-white shadow-md dark:bg-zinc-950">
                        <DropdownMenuItem onClick={() => onQuickStatus("NEW")}>NOVÝ LEAD</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus("CONTACTED")}>
                          KONTAKTOVÁNO
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus("REPLIED")}>FOLLOW UP</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus("MEETING_SET")}>
                          KOMUNIKACE
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus("CLOSED_WON")}>DOMLUVENO</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus("CLOSED_LOST")}>
                          NEDOMLUVENO
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onQuickStatus("BREAK_UP")}>BREAKUP</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                );
              }}
            />
            </div>
          )}

          {view === "list" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-muted/40 shadow-none animate-in fade-in zoom-in-95 duration-300 dark:bg-muted/15 md:border md:border-border/60 md:bg-card md:shadow-sm">

              {/* Mobile native list */}
              <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto md:hidden">
                {paginatedLeads.map((lead) => {
                  const companyWeb = leadFullWebsiteUrl(lead.url);
                  const emailTrim = (lead.email ?? "").trim();
                  const phoneTrim = (lead.phone ?? "").trim();
                  const needsContactScrape = Boolean(companyWeb) && (!emailTrim || !phoneTrim);
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-2.5 border-b border-border/40 px-3 py-2.5 last:border-b-0 active:bg-muted/40"
                    >
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => toggleRowSelection(lead.id)}
                        className="shrink-0"
                      />
                      <CompanyAvatar
                        name={lead.company}
                        initials={lead.avatar}
                        faviconUrl={lead.faviconUrl}
                        shape="circle"
                        sizeClassName="h-9 w-9"
                        textClassName="text-[10px]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[14px] font-semibold leading-tight text-foreground">
                            {lead.company}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                                  statusColorMap[lead.status],
                                )}
                              >
                                {statusLabelMap[lead.status]}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="z-50 border bg-white shadow-md dark:bg-zinc-950">
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "NEW")}>NOVÝ LEAD</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "CONTACTED")}>KONTAKTOVÁNO</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "REPLIED")}>FOLLOW UP</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "MEETING_SET")}>KOMUNIKACE</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "CLOSED_WON")}>DOMLUVENO</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "CLOSED_LOST")}>NEDOMLUVENO</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "BREAK_UP")}>BREAKUP</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {(() => {
                          const { sourceLabel, authorLabel } = leadProvenanceParts(
                            lead.source,
                            lead.author,
                            lead.contactedVia,
                          );
                          if (!sourceLabel && !authorLabel) return null;
                          return (
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {sourceLabel}
                              {authorLabel ? (
                                <>
                                  {" · "}
                                  <span className="font-semibold text-foreground/80">{authorLabel}</span>
                                </>
                              ) : null}
                            </p>
                          );
                        })()}
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {emailTrim || "Bez e-mailu"}
                          <span className="mx-1 text-border">·</span>
                          {phoneTrim || "Bez telefonu"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {needsContactScrape ? (
                          <ScrapeContactButton
                            isLoading={scrapingLeadIds.includes(lead.id)}
                            disabled={isBulkRunning}
                            onClick={() => void handleScrapeLeadContacts(lead)}
                            variant="ghost"
                            className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                          />
                        ) : null}
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-full p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                          title="Sniper"
                        >
                          <Link href={buildSniperLeadHref(lead)}>
                            <Send className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {companyWeb ? (
                          <WebsiteVisitedGlobeButton
                            visited={lead.websiteVisited}
                            visitedBy={lead.websiteVisitedBy}
                            onOpen={() => handleOpenWebsite(lead, companyWeb)}
                            size="sm"
                          />
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(lead)}
                          className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Upravit deal"
                          aria-label="Upravit deal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 text-muted-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50 w-52 border bg-white shadow-md dark:bg-zinc-950">
                            {needsContactScrape ? (
                              <DropdownMenuItem
                                disabled={scrapingLeadIds.includes(lead.id)}
                                onClick={() => void handleScrapeLeadContacts(lead)}
                              >
                                <ScanSearch className="mr-2 h-4 w-4" />
                                Doplnit kontakt z webu
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => void handleSendOutreach(lead.id, "FOLLOW_UP")}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Poslat follow-up
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleSendOutreach(lead.id, "BREAKUP")}>
                              <Hand className="mr-2 h-4 w-4" />
                              Poslat breakup
                            </DropdownMenuItem>
                            {companyWeb ? (
                              <DropdownMenuItem onClick={() => handleOpenWebsite(lead, companyWeb)}>
                                <Globe
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    lead.websiteVisited && "text-emerald-600 dark:text-emerald-400",
                                  )}
                                />
                                {lead.websiteVisited
                                  ? `Web prohlédnut${
                                      shortLeadAuthorName(lead.websiteVisitedBy)
                                        ? ` · ${shortLeadAuthorName(lead.websiteVisitedBy)}`
                                        : ""
                                    }`
                                  : "Otevřít web"}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteSingleLead(lead.id)}
                              className="text-red-600 focus:text-red-700"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Smazat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
                {!isLoading && paginatedLeads.length === 0 && (
                  <div className="flex min-h-[50vh] flex-1 items-center justify-center text-sm text-muted-foreground">
                    Žádné firmy neodpovídají hledání.
                  </div>
                )}
                {isLoading && (
                  <div className="flex min-h-[50vh] flex-1 items-center justify-center text-sm text-muted-foreground">
                    Načítám dealy...
                  </div>
                )}
              </div>

              {/* Desktop table */}
              {isLoading ? (
                <div className="hidden min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground md:flex">
                  Načítám dealy...
                </div>
              ) : (
              <div className="hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden md:block [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-widest text-muted-foreground">
                      <th className="sticky top-0 z-10 w-[44px] bg-white px-3 py-3 text-center font-semibold dark:bg-zinc-950">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={
                              allFilteredSelected
                                ? true
                                : allPageSelected
                                  ? true
                                  : somePageSelected
                                    ? "indeterminate"
                                    : false
                            }
                            onCheckedChange={() => {
                              if (allFilteredSelected || allPageSelected) {
                                clearSelection();
                              } else {
                                toggleAllOnPage();
                              }
                            }}
                            aria-label="Vybrat vše na stránce"
                          />
                        </div>
                      </th>
                      <th className="sticky top-0 z-10 bg-white px-3 py-3 font-semibold dark:bg-zinc-950 w-[28%]">Firma</th>
                      <th className="sticky top-0 z-10 bg-white px-3 py-3 font-semibold dark:bg-zinc-950 w-[11%]">Datum přidání</th>
                      <th className="sticky top-0 z-10 bg-white px-3 py-3 font-semibold dark:bg-zinc-950 w-[22%]">KONTAKT</th>
                      <th className="sticky top-0 z-10 bg-white px-3 py-3 font-semibold dark:bg-zinc-950 w-[9%]">Hodnota</th>
                      <th className="sticky top-0 z-10 min-w-[11rem] bg-white px-3 py-3 pr-8 font-semibold dark:bg-zinc-950 w-[14%]">Status</th>
                      <th className="sticky top-0 z-10 w-[11.5rem] bg-white px-3 py-3 pl-6 text-right font-semibold dark:bg-zinc-950">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => {
                      const companyWeb = leadFullWebsiteUrl(lead.url);
                      const emailTrim = (lead.email ?? "").trim();
                      const phoneTrim = (lead.phone ?? "").trim();
                      return (
                      <tr key={lead.id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={() => toggleRowSelection(lead.id)}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <CompanyAvatar
                              name={lead.company}
                              initials={lead.avatar}
                              faviconUrl={lead.faviconUrl}
                              sizeClassName="h-9 w-9"
                              textClassName="text-[10px]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-foreground" title={lead.company}>
                                {lead.company}
                              </p>
                              {(() => {
                                const { sourceLabel, authorLabel } = leadProvenanceParts(
                                  lead.source,
                                  lead.author,
                                  lead.contactedVia,
                                );
                                if (!sourceLabel && !authorLabel) return null;
                                return (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {sourceLabel}
                                    {authorLabel ? (
                                      <>
                                        {" · "}
                                        <span className="font-semibold text-foreground/80">
                                          {authorLabel}
                                        </span>
                                      </>
                                    ) : null}
                                  </p>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{lead.date}</td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="min-w-0 flex-1 leading-tight">
                              <p
                                className={cn(
                                  "truncate whitespace-nowrap text-sm leading-snug",
                                  emailTrim ? "text-foreground" : "text-muted-foreground",
                                )}
                                title={emailTrim || undefined}
                              >
                                {emailTrim || "Bez emailu"}
                              </p>
                              {phoneTrim ? (
                                <p
                                  className="truncate whitespace-nowrap text-xs leading-snug text-muted-foreground"
                                  title={phoneTrim}
                                >
                                  {phoneTrim}
                                </p>
                              ) : (
                                <p className="truncate whitespace-nowrap text-xs leading-snug text-muted-foreground">
                                  Bez telefonu
                                </p>
                              )}
                            </div>
                            {companyWeb && (!emailTrim || !phoneTrim) ? (
                              <ScrapeContactButton
                                isLoading={scrapingLeadIds.includes(lead.id)}
                                disabled={isBulkRunning}
                                onClick={() => void handleScrapeLeadContacts(lead)}
                                className="h-8 w-8 shrink-0 rounded-lg border-border/60 p-0 text-muted-foreground hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">{formatCurrency(lead.value)}</td>
                        <td className="min-w-[11rem] px-3 py-3 pr-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide hover:opacity-80 transition-opacity cursor-pointer",
                                  statusColorMap[lead.status],
                                )}
                              >
                                {statusLabelMap[lead.status]}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="z-50 border bg-white shadow-md dark:bg-zinc-950">
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "NEW")}>NOVÝ LEAD</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "CONTACTED")}>KONTAKTOVÁNO</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "REPLIED")}>FOLLOW UP</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "MEETING_SET")}>KOMUNIKACE</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "CLOSED_WON")}>DOMLUVENO</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "CLOSED_LOST")}>NEDOMLUVENO</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleQuickStatus(lead.id, "BREAK_UP")}>BREAKUP</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="w-[11.5rem] px-3 py-3 pl-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 shrink-0 rounded-lg border-blue-200 bg-blue-50 p-0 text-blue-700 shadow-sm hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-950 dark:hover:text-blue-200"
                            >
                              <Link
                                href={buildSniperLeadHref(lead)}
                                className="flex size-full items-center justify-center"
                                title="Odeslat do Snipera"
                                aria-label="Odeslat do Snipera"
                              >
                                <Send className="h-4 w-4" />
                              </Link>
                            </Button>
                            {companyWeb ? (
                              <WebsiteVisitedGlobeButton
                                visited={lead.websiteVisited}
                                visitedBy={lead.websiteVisitedBy}
                                onOpen={() => handleOpenWebsite(lead, companyWeb)}
                                size="md"
                              />
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(lead)}
                              className="h-8 w-8 shrink-0 rounded-lg border-border/60 bg-background p-0 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                              title="Upravit deal"
                              aria-label="Upravit deal"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-zinc-950 z-50 border shadow-md">
                                {companyWeb && (!emailTrim || !phoneTrim) ? (
                                  <DropdownMenuItem
                                    disabled={scrapingLeadIds.includes(lead.id)}
                                    onClick={() => void handleScrapeLeadContacts(lead)}
                                  >
                                    <ScanSearch className="mr-2 h-4 w-4" />
                                    Doplnit kontakt z webu
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem
                                  onClick={() => void handleSendOutreach(lead.id, "FOLLOW_UP")}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Poslat follow-up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => void handleSendOutreach(lead.id, "BREAKUP")}
                                >
                                  <Hand className="mr-2 h-4 w-4" />
                                  Poslat breakup
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSingleLead(lead.id)}
                                  className="text-red-600 focus:text-red-700"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Smazat
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                    {!isLoading && paginatedLeads.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <div className="flex min-h-[min(50vh,28rem)] w-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                            Žádné firmy neodpovídají hledání.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}

              <div className="mt-0 flex shrink-0 items-center justify-between gap-2 border-t border-border/40 bg-transparent px-3 py-2 md:gap-3 md:border-border/60 md:bg-muted/30 md:px-6 md:py-2.5">
                <p className="text-[11px] text-muted-foreground md:text-xs">
                  <span className="md:hidden">{shownFrom}–{shownTo} / {totalItems}</span>
                  <span className="hidden md:inline">
                    Zobrazeno {shownFrom} až {shownTo} z {totalItems} firem
                  </span>
                </p>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-[11px] md:h-9 md:px-3 md:text-sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    ←
                  </Button>
                  <span className="text-[11px] text-muted-foreground md:text-xs">
                    {safePage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-[11px] md:h-9 md:px-3 md:text-sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    →
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

        <Dialog
          open={!!editingLead}
          onOpenChange={(open) => {
            if (!open) setEditingLead(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upravit deal</DialogTitle>
              <DialogDescription>
                Upravte detaily firmy a hodnotu dealu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Název firmy</Label>
                <Input
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  placeholder="Název firmy"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Webová adresa (url)</Label>
                <Input
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  placeholder="např. example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                  placeholder="např. info@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  placeholder="např. +420 123 456 789"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hodnota dealu</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.value}
                  onChange={(e) =>
                    setEditForm({ ...editForm, value: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border/40 mt-4">
              <Button type="button" variant="outline" onClick={() => setEditingLead(null)}>
                Zrušit
              </Button>
              <Button
                type="button"
                onClick={handleSaveDialog}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSaving ? "Ukládám..." : "Uložit změny"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nový deal</DialogTitle>
              <DialogDescription>Zadejte údaje o firmě a hodnotě dealu.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Název firmy</Label>
                <Input
                  value={newDealForm.company}
                  onChange={(e) => setNewDealForm({ ...newDealForm, company: e.target.value })}
                  placeholder="Název firmy"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Webová adresa (url)</Label>
                <Input
                  value={newDealForm.url}
                  onChange={(e) => setNewDealForm({ ...newDealForm, url: e.target.value })}
                  placeholder="např. example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  value={newDealForm.contactEmail}
                  onChange={(e) => setNewDealForm({ ...newDealForm, contactEmail: e.target.value })}
                  placeholder="např. info@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input
                  value={newDealForm.contactPhone}
                  onChange={(e) => setNewDealForm({ ...newDealForm, contactPhone: e.target.value })}
                  placeholder="např. +420 123 456 789"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hodnota dealu</Label>
                <Input
                  type="number"
                  min={0}
                  value={newDealForm.value}
                  onChange={(e) =>
                    setNewDealForm({ ...newDealForm, value: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-border/40 mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsNewDealOpen(false)}
                disabled={isCreating}
              >
                Zrušit
              </Button>
              <Button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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

        <AlertDialog open={leadsToDelete !== null} onOpenChange={(open) => !open && setLeadsToDelete(null)}>
          <AlertDialogContent className="bg-white dark:bg-zinc-950 border shadow-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Opravdu chcete odstranit vybrané dealy?</AlertDialogTitle>
              <AlertDialogDescription>
                Tuto akci nelze vrátit zpět. Dojde k trvalému odstranění {leadsToDelete?.length} záznamů z vaší
                databáze.
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