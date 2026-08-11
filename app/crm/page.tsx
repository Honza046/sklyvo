"use client";

import { useLanguage } from "@/context/LanguageContext";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CopyEmailButton } from "@/components/copy-email-button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Eye,
  Hand,
  Mail,
  ChevronLeft,
  ChevronRight,
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
import { CompanyAvatar } from "@/components/crm/company-avatar";
import {
  CrmDueBannerSkeleton,
  CrmTableSkeleton,
} from "@/components/crm/crm-table-skeleton";
import { SlidingViewToggle } from "@/components/sklyvo/sliding-view-toggle";
import { toast } from "sonner";
import { OUTREACH_KIND_LABELS, type OutreachKindValue } from "@/lib/outreach";
import { htmlBodyToEditablePlainText } from "@/lib/email-format";
import { leadTagLabel, LEAD_TAG_ORDER } from "@/lib/lead-tags";

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
    color: "bg-slate-100 text-slate-700 border-slate-300 ",
    dot: "bg-slate-400 ",
  },
  {
    id: "contacted",
    title: "Kontaktováno",
    color: "bg-blue-50 text-blue-700 border-blue-200 ",
    dot: "bg-blue-500 ",
  },
  {
    id: "follow_up",
    title: "Follow up",
    color: "bg-amber-50 text-amber-700 border-amber-200 ",
    dot: "bg-amber-500 ",
  },
  {
    id: "communication",
    title: "Komunikace",
    color: "bg-violet-50 text-violet-700 border-violet-200 ",
    dot: "bg-violet-500 ",
  },
  {
    id: "agreed",
    title: "Domluveno",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 ",
    dot: "bg-emerald-500 ",
  },
  {
    id: "breakup",
    title: "Breakup",
    color: "bg-orange-50 text-orange-800 border-orange-200 ",
    dot: "bg-orange-500 ",
  },
  {
    id: "rejected",
    title: "Nedomluveno",
    color: "bg-rose-50 text-rose-700 border-rose-200 ",
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
              "sk-row-icon-btn",
              isSm
                ? "h-8 w-8 rounded-full p-0 hover:bg-muted hover:translate-y-0"
                : "h-8 w-8 shrink-0 rounded-lg p-0 shadow-sm hover:translate-y-0",
              visited
                ? isSm
                  ? "text-emerald-600 hover:text-emerald-700 "
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 "
                : isSm
                  ? "text-muted-foreground hover:text-foreground"
                  : "border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-label={
              visited
                ? who
                  ? `Web prohlédnut, první návštěva webu: ${who}`
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
        className="z-[200] w-auto max-w-[15rem] rounded-xl border border-border bg-white px-3 py-2 opacity-100 shadow-lg "
      >
        {visited ? (
          <>
            <p className="text-xs font-semibold leading-snug text-emerald-700 ">
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

const SCRAPE_CONTACT_HINT =
  "Důkladně prohledá web a doplní e-mail nebo telefon";

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
        className="w-auto max-w-[15rem] rounded-xl border-border/70 bg-white px-3 py-2 shadow-lg "
      >
        <p className="text-xs font-medium leading-snug text-foreground">
          {SCRAPE_CONTACT_HINT}
        </p>
      </PopoverContent>
    </Popover>
  );
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

  const dueOutreachLeads = useMemo(
    () => leads.filter((l) => l.outreachDue),
    [leads],
  );
  const dueOutreachSignature = useMemo(
    () =>
      dueOutreachLeads
        .map((l) => l.id)
        .sort()
        .join(","),
    [dueOutreachLeads],
  );
  const [dismissedDueSignature, setDismissedDueSignature] = useState<
    string | null
  >(null);
  const [dueDismissHydrated, setDueDismissHydrated] = useState(false);

  useEffect(() => {
    try {
      setDismissedDueSignature(
        window.localStorage.getItem("sklyvo-crm-due-dismissed"),
      );
    } catch {
      /* ignore */
    }
    setDueDismissHydrated(true);
  }, []);

  const showDueBanner =
    dueDismissHydrated &&
    dueOutreachLeads.length > 0 &&
    dismissedDueSignature !== dueOutreachSignature;

  const dismissDueBanner = () => {
    setDismissedDueSignature(dueOutreachSignature);
    try {
      window.localStorage.setItem(
        "sklyvo-crm-due-dismissed",
        dueOutreachSignature,
      );
    } catch {
      /* ignore */
    }
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center overflow-hidden">
      <div className="mb-2 shrink-0 space-y-1 text-center">
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="sk-page-badge" aria-hidden>
            <Users strokeWidth={2} />
          </div>
        </div>
        <h1 className="sk-type-h1">CRM</h1>
        <p className="sk-type-body mx-auto max-w-lg">
          {t("crm.subtitle")}
        </p>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden px-0 sm:gap-4">
        {isLoading ? (
          <CrmDueBannerSkeleton />
        ) : showDueBanner ? (
          <div className="sk-crm-due flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="sk-crm-due__icon" aria-hidden>
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[color:var(--sk-ink)] sm:text-sm">
                  {t("crm.dueTitle", { count: dueOutreachLeads.length })}
                </p>
                <p className="hidden text-xs text-[color:var(--sk-muted)] sm:block">
                  {t("crm.dueDesc")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button
                size="sm"
                variant="outline"
                className="sk-press-btn h-8 px-2 text-[11px] font-semibold sm:h-9 sm:px-3 sm:text-sm"
                disabled={isBulkRunning}
                onClick={() => {
                  const ids = dueOutreachLeads
                    .filter((l) => l.nextOutreachKind === "FOLLOW_UP")
                    .map((l) => l.id);
                  if (ids.length === 0) {
                    toast.message(t("crm.noDueFollowUp"));
                    return;
                  }
                  setSelectedLeads(ids);
                  void handleBulkOutreach("FOLLOW_UP");
                }}
              >
                {t("crm.followUps")}
              </Button>
              <Button
                size="sm"
                className="sk-press-btn h-8 bg-[color:var(--sk-ink)] px-2 text-[11px] font-semibold text-white hover:bg-[color:var(--sk-ink-press)] sm:h-9 sm:px-3 sm:text-sm"
                disabled={isBulkRunning}
                onClick={() => {
                  const ids = dueOutreachLeads
                    .filter((l) => l.nextOutreachKind === "BREAKUP")
                    .map((l) => l.id);
                  if (ids.length === 0) {
                    toast.message(t("crm.noDueBreakup"));
                    return;
                  }
                  setSelectedLeads(ids);
                  void handleBulkOutreach("BREAKUP");
                }}
              >
                {t("crm.breakups")}
              </Button>
              <button
                type="button"
                className="sk-crm-due__dismiss"
                aria-label={t("crm.dismissDue")}
                onClick={dismissDueBanner}
              >
                <X strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "sk-surface sk-toolbar",
            selectedLeads.length > 0 && "sk-toolbar--selection",
          )}
        >
          {selectedLeads.length > 0 ? (
            <div className="sk-selection flex w-full min-w-0 flex-col gap-2">
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:gap-3">
                <div className="sk-selection__count shrink-0">
                  Vybráno:{" "}
                  <strong>
                    {selectedLeads.length}
                    {allFilteredSelected ? ` / ${totalItems}` : ""}
                  </strong>
                </div>

                <div className="sk-selection__actions flex min-w-0 flex-1 flex-wrap items-center gap-1.5 md:gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="sk-press-btn h-9"
                    onClick={() => void handleBulkScrapeContacts()}
                    disabled={isBulkRunning}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Kontakty z webu</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="sk-press-btn h-9"
                    onClick={() => void handleBulkOutreach("FOLLOW_UP")}
                    disabled={isBulkRunning}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Follow-up
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="sk-press-btn h-9"
                    onClick={() => void handleBulkOutreach("BREAKUP")}
                    disabled={isBulkRunning}
                  >
                    <Hand className="h-3.5 w-3.5" />
                    Breakup
                  </Button>

                  <Select
                    onValueChange={(v) =>
                      void handleBulkStatusUpdate(v as Lead["leadStatus"])
                    }
                    disabled={isBulkRunning}
                  >
                    <SelectTrigger className="sk-selection__select h-9 w-[9.5rem] sm:w-[11.5rem]">
                      <SelectValue placeholder="Změnit status" />
                    </SelectTrigger>
                    <SelectContent className="z-50 border bg-white shadow-md ">
                      <SelectItem value="NEW">NOVÝ LEAD</SelectItem>
                      <SelectItem value="CONTACTED">KONTAKTOVÁNO</SelectItem>
                      <SelectItem value="REPLIED">FOLLOW UP</SelectItem>
                      <SelectItem value="MEETING_SET">KOMUNIKACE</SelectItem>
                      <SelectItem value="CLOSED_WON">DOMLUVENO</SelectItem>
                      <SelectItem value="BREAK_UP">BREAKUP</SelectItem>
                      <SelectItem value="CLOSED_LOST">NEDOMLUVENO</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="sm"
                    className="h-9"
                    onClick={() => handleStartAutopilot()}
                    disabled={isBulkRunning}
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Autopilot
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="sk-press-btn sk-selection__danger h-9"
                    onClick={() => handleBulkDelete()}
                    disabled={isBulkRunning}
                  >
                    Odstranit
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="sk-selection__clear h-9"
                    onClick={clearSelection}
                    disabled={isBulkRunning}
                  >
                    Zrušit výběr
                  </Button>
                </div>
              </div>

              {!allFilteredSelected && totalItems > selectedLeads.length && (
                <p className="sk-selection__hint">
                  {allPageSelected
                    ? `Vybraná je jen tato stránka (${paginatedLeads.length}).`
                    : "Nejsou vybrané všechny firmy ve filtru."}{" "}
                  <button type="button" onClick={selectAllFiltered}>
                    Vybrat všech {totalItems} ve filtru
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="flex w-full items-center gap-1.5 md:flex-row md:justify-between md:gap-4">
              <div className="relative min-w-0 flex-1 md:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:h-4 md:w-4" />
                <Input
                  placeholder={t("crm.searchPlaceholder")}
                  className="h-9 pl-9 text-[15px] md:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="sk-press-btn h-9 w-9 shrink-0 p-0 md:w-auto md:min-w-[7.5rem] md:px-3.5"
                    >
                      <SlidersHorizontal className="h-4 w-4 md:mr-0" />
                      <span className="hidden md:inline">{t("crm.filters")}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-[100] w-80 border border-border bg-white p-4 shadow-lg "
                    align="end"
                    onInteractOutside={(event) => {
                      const target = event.target as HTMLElement | null;
                      if (
                        target?.closest(
                          "[data-radix-select-content], [data-radix-popper-content-wrapper]",
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select
                          value={statusFilter}
                          onValueChange={(v) =>
                            setStatusFilter(v as "all" | Lead["leadStatus"])
                          }
                        >
                          <SelectTrigger className="h-9 w-full bg-background">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="z-[220] border bg-white shadow-md ">
                            <SelectItem value="all">Všechny statusy</SelectItem>
                            <SelectItem value="NEW">NOVÝ LEAD</SelectItem>
                            <SelectItem value="CONTACTED">
                              KONTAKTOVÁNO
                            </SelectItem>
                            <SelectItem value="REPLIED">FOLLOW UP</SelectItem>
                            <SelectItem value="MEETING_SET">
                              KOMUNIKACE
                            </SelectItem>
                            <SelectItem value="CLOSED_WON">
                              DOMLUVENO
                            </SelectItem>
                            <SelectItem value="BREAK_UP">BREAKUP</SelectItem>
                            <SelectItem value="CLOSED_LOST">
                              NEDOMLUVENO
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Datum</Label>
                        <Select
                          value={dateFilter}
                          onValueChange={(v) =>
                            setDateFilter(
                              v as
                                | "all"
                                | "last_7_days"
                                | "last_30_days"
                                | "this_year",
                            )
                          }
                        >
                          <SelectTrigger className="h-9 w-full bg-background">
                            <SelectValue placeholder="Čas" />
                          </SelectTrigger>
                          <SelectContent className="z-[220] border bg-white shadow-md ">
                            <SelectItem value="all">Všechny datumy</SelectItem>
                            <SelectItem value="last_7_days">
                              Posledních 7 dní
                            </SelectItem>
                            <SelectItem value="last_30_days">
                              Posledních 30 dní
                            </SelectItem>
                            <SelectItem value="this_year">Tento rok</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Obor</Label>
                        <Select value={tagFilter} onValueChange={setTagFilter}>
                          <SelectTrigger className="h-9 w-full bg-background">
                            <SelectValue placeholder="Obor" />
                          </SelectTrigger>
                          <SelectContent className="z-[220] border border-border bg-white shadow-lg ">
                            <SelectItem value="all">Všechny obory</SelectItem>
                            {availableTags.map(({ tag, label, count }) => (
                              <SelectItem key={tag} value={tag}>
                                {label} ({count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Zdroj</Label>
                        <Select
                          value={sourceFilter}
                          onValueChange={(v) =>
                            setSourceFilter(
                              v as
                                | "all"
                                | "radar"
                                | "ap_radar"
                                | "full_auto"
                                | "ap_sniper"
                                | "sniper"
                                | "manual",
                            )
                          }
                        >
                          <SelectTrigger className="h-9 w-full bg-background">
                            <SelectValue placeholder="Zdroj" />
                          </SelectTrigger>
                          <SelectContent className="z-[220] border border-border bg-white shadow-lg ">
                            <SelectItem value="all">Všechny zdroje</SelectItem>
                            <SelectItem value="radar">Radar</SelectItem>
                            <SelectItem value="ap_radar">
                              Autopilot Radar
                            </SelectItem>
                            <SelectItem value="full_auto">Full Auto</SelectItem>
                            <SelectItem value="ap_sniper">
                              Autopilot Sniper
                            </SelectItem>
                            <SelectItem value="sniper">Sniper</SelectItem>
                            <SelectItem value="manual">{t("crm.sourceManual")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Řazení</Label>
                        <Select
                          value={sortBy}
                          onValueChange={(v) =>
                            setSortBy(
                              v as
                                | "newest"
                                | "oldest"
                                | "value_high"
                                | "value_low",
                            )
                          }
                        >
                          <SelectTrigger className="h-9 w-full bg-background">
                            <SelectValue placeholder="Řazení" />
                          </SelectTrigger>
                          <SelectContent className="z-[220] border bg-white shadow-md ">
                            <SelectItem value="newest">
                              Nejnovější (odesláno)
                            </SelectItem>
                            <SelectItem value="oldest">
                              Nejstarší (odesláno)
                            </SelectItem>
                            <SelectItem value="value_high">
                              Hodnota: nejvyšší
                            </SelectItem>
                            <SelectItem value="value_low">
                              Hodnota: nejnižší
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <SlidingViewToggle view={view} onChange={setView} />

                <Button
                  type="button"
                  size="sm"
                  className="hidden h-9 md:inline-flex"
                  onClick={() => setIsNewDealOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("crm.newDeal")}
                </Button>
              </div>
            </div>
          )}
        </div>

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
                      "sk-data-row group h-full w-full min-w-0 flex-col gap-1.5 !p-2.5 touch-none transition-opacity sm:!p-3",
                      !overlay &&
                        "cursor-grab active:cursor-grabbing hover:brightness-[0.98]",
                      overlay &&
                        "cursor-grabbing opacity-70 ring-2 ring-blue-500/25 grayscale-[20%]",
                      drag?.isDragging && "opacity-40 grayscale-[35%]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <CompanyAvatar
                          name={lead.company}
                          initials={lead.avatar}
                          faviconUrl={lead.faviconUrl}
                          sizeClassName="h-7 w-7"
                          textClassName="text-[9px]"
                        />
                        <div className="min-w-0">
                          <h4 className="mb-0.5 truncate text-[13px] font-bold leading-tight text-foreground">
                            {lead.company}
                          </h4>
                          {(() => {
                            const parts = leadProvenanceParts(
                                lead.source,
                                lead.author,
                                lead.contactedVia,
                              );
                            const sourceLabel =
                              parts.sourceLabel === "Manuálně"
                                ? t("crm.sourceManual")
                                : parts.sourceLabel === "Autopilot Sniper"
                                  ? t("crm.sourceAutopilotSniper")
                                  : parts.sourceLabel === "Radar"
                                    ? t("crm.sourceRadar")
                                    : parts.sourceLabel;
                            const authorLabel = parts.authorLabel;
                            if (!sourceLabel && !authorLabel) return null;
                            return (
                              <p className="mb-0.5 truncate text-[9px] text-muted-foreground">
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
                          {companyWeb ? (
                            <a
                              href={companyWeb}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center text-[9px] text-muted-foreground hover:text-blue-600 transition-colors truncate"
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
                          className="z-50 min-w-[15.5rem] border bg-white shadow-md "
                        >
                          <DropdownMenuItem onClick={() => onEdit()}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Upravit deal
                          </DropdownMenuItem>
                          {(lead.lastContactedAt || lead.contactedVia) && (
                            <DropdownMenuItem
                              disabled={isLoadingSentEmails}
                              onClick={() => void handleViewSentEmails(lead)}
                              className="whitespace-nowrap"
                            >
                              <Mail className="mr-2 h-4 w-4 shrink-0" />
                              Zobrazit odeslaný e-mail
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link
                              href={buildSniperLeadHref(lead)}
                              className="flex cursor-pointer items-center"
                            >
                              <Target className="mr-2 h-4 w-4" />
                              Odeslat do Snipera
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              void handleSendOutreach(lead.id, "FOLLOW_UP")
                            }
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Poslat follow-up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              void handleSendOutreach(lead.id, "BREAKUP")
                            }
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

                    <div className="mt-0.5 flex items-center justify-between gap-2 pt-1.5">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {(() => {
                          const d = leadPrimaryDateLabel(lead, {
                            sent: t("crm.sent"),
                            added: t("crm.added"),
                          });
                          return (
                            <div
                              className="flex items-center truncate text-[10px] font-medium text-muted-foreground"
                              title={d.title}
                            >
                              {d.isSent ? (
                                <Mail className="mr-1 h-3 w-3 shrink-0" />
                              ) : (
                                <Calendar className="mr-1 h-3 w-3 shrink-0" />
                              )}
                              <span className="truncate">{d.label}</span>
                            </div>
                          );
                        })()}
                        {lead.outreachDue && lead.nextOutreachKind ? (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 ">
                            {OUTREACH_KIND_LABELS[lead.nextOutreachKind]}{" "}
                            splatný
                          </span>
                        ) : null}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "sk-crm-status-pill shrink-0 cursor-pointer rounded-md border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest transition-opacity hover:opacity-80",
                              col.color,
                            )}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {col.title}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="z-50 border bg-white shadow-md "
                        >
                          <DropdownMenuItem
                            onClick={() => onQuickStatus("NEW")}
                          >
                            NOVÝ LEAD
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onQuickStatus("CONTACTED")}
                          >
                            KONTAKTOVÁNO
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onQuickStatus("REPLIED")}
                          >
                            FOLLOW UP
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onQuickStatus("MEETING_SET")}
                          >
                            KOMUNIKACE
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onQuickStatus("CLOSED_WON")}
                          >
                            DOMLUVENO
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onQuickStatus("BREAK_UP")}
                          >
                            BREAKUP
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onQuickStatus("CLOSED_LOST")}
                          >
                            NEDOMLUVENO
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}

        <div
          className={cn(
            "sk-data-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm",
            view !== "list" && "hidden",
          )}
          aria-hidden={view !== "list"}
        >
          {/* Desktop table */}
          {isLoading ? (
            <CrmTableSkeleton />
          ) : (
            <div className="sk-data-panel__scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="sticky top-0 z-10 w-[44px] bg-transparent px-3 py-3 text-center font-semibold">
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
                    <th className="sticky top-0 z-10 bg-transparent px-3 py-3 font-semibold w-[34%]">
                      {t("crm.colCompany")}
                    </th>
                    <th className="sticky top-0 z-10 w-[7.25rem] bg-transparent px-2 py-3 font-semibold">
                      {t("crm.colDate")}
                    </th>
                    <th className="sticky top-0 z-10 bg-transparent px-3 py-3 font-semibold w-[24%] min-w-0">
                      {t("crm.colContact")}
                    </th>
                    <th className="sticky top-0 z-10 min-w-[9.75rem] bg-transparent px-3 py-3 pl-3 font-semibold w-[14%]">
                      {t("crm.colStatus")}
                    </th>
                    <th className="sticky top-0 z-10 w-[10.5rem] bg-transparent px-2 py-3 pl-2 text-left font-semibold">
                      {t("crm.colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead) => {
                    const companyWeb = leadFullWebsiteUrl(lead.url);
                    const emailTrim = (lead.email ?? "").trim();
                    const phoneTrim = (lead.phone ?? "").trim();
                    return (
                      <tr key={lead.id}>
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={() =>
                                toggleRowSelection(lead.id)
                              }
                            />
                          </div>
                        </td>
                        <td className="min-w-0 overflow-hidden px-3 py-3 pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <CompanyAvatar
                              name={lead.company}
                              initials={lead.avatar}
                              faviconUrl={lead.faviconUrl}
                              sizeClassName="h-9 w-9"
                              textClassName="text-[10px]"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate font-semibold text-foreground"
                                title={lead.company}
                              >
                                {lead.company}
                              </p>
                              {(() => {
                                const parts = leadProvenanceParts(
                                    lead.source,
                                    lead.author,
                                    lead.contactedVia,
                                  );
                                const sourceLabel =
                                  parts.sourceLabel === "Manuálně"
                                    ? t("crm.sourceManual")
                                    : parts.sourceLabel === "Autopilot Sniper"
                                      ? t("crm.sourceAutopilotSniper")
                                      : parts.sourceLabel === "Radar"
                                        ? t("crm.sourceRadar")
                                        : parts.sourceLabel;
                                const authorLabel = parts.authorLabel;
                                if (!sourceLabel && !authorLabel) return null;
                                const provenance = [sourceLabel, authorLabel]
                                  .filter(Boolean)
                                  .join(" · ");
                                return (
                                  <p
                                    className="truncate text-xs text-muted-foreground"
                                    title={provenance}
                                  >
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
                        <td className="w-[7.25rem] overflow-hidden px-2 py-3 align-top">
                          {(() => {
                            const d = leadPrimaryDateLabel(lead, {
                            sent: t("crm.sent"),
                            added: t("crm.added"),
                          });
                            return (
                              <div
                                className="min-w-0 max-w-full leading-tight"
                                title={d.title}
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {d.kindLine}
                                </p>
                                <p className="truncate text-sm tabular-nums text-foreground">
                                  {d.dateLine}
                                </p>
                                {d.isSent && lead.date ? (
                                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                    {t("crm.added")} {lead.date}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="min-w-0 overflow-hidden px-3 py-3 align-middle">
                          <div className="flex min-w-0 max-w-full items-start gap-1.5">
                            {emailTrim ? (
                              <CopyEmailButton
                                email={emailTrim}
                                size="sm"
                                variant="ghost"
                                className="mt-0.5"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1 overflow-hidden leading-tight">
                              <p
                                className={cn(
                                  "truncate text-sm leading-snug",
                                  emailTrim
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                )}
                                title={emailTrim || undefined}
                              >
                                {emailTrim || t("common.noEmail")}
                              </p>
                              {phoneTrim ? (
                                <p
                                  className="truncate text-xs leading-snug text-muted-foreground"
                                  title={phoneTrim}
                                >
                                  {phoneTrim}
                                </p>
                              ) : (
                                <p className="truncate text-xs leading-snug text-muted-foreground">
                                  Bez telefonu
                                </p>
                              )}
                            </div>
                            {companyWeb && (!emailTrim || !phoneTrim) ? (
                              <ScrapeContactButton
                                isLoading={scrapingLeadIds.includes(lead.id)}
                                disabled={isBulkRunning}
                                onClick={() =>
                                  void handleScrapeLeadContacts(lead)
                                }
                                className="mt-0.5 h-8 w-8 shrink-0 rounded-lg border-border/60 p-0 text-muted-foreground hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 "
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="min-w-[9.75rem] px-3 py-3 pl-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  "sk-crm-status-pill inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-opacity hover:opacity-80 cursor-pointer",
                                  statusColorMap[lead.status],
                                )}
                              >
                                {statusLabelMap[lead.status]}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="z-50 border bg-white shadow-md "
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleQuickStatus(lead.id, "NEW")
                                }
                              >
                                NOVÝ LEAD
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleQuickStatus(lead.id, "CONTACTED")
                                }
                              >
                                KONTAKTOVÁNO
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleQuickStatus(lead.id, "REPLIED")
                                }
                              >
                                FOLLOW UP
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleQuickStatus(lead.id, "MEETING_SET")
                                }
                              >
                                KOMUNIKACE
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleQuickStatus(lead.id, "CLOSED_WON")
                                }
                              >
                                DOMLUVENO
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleQuickStatus(lead.id, "BREAK_UP")
                                }
                              >
                                BREAKUP
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  void handleQuickStatus(lead.id, "CLOSED_LOST")
                                }
                              >
                                NEDOMLUVENO
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                        <td className="w-[10.5rem] px-2 py-3 pl-2 text-left whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="sk-row-icon-btn h-8 w-8 shrink-0 rounded-lg border-blue-200 bg-blue-50 p-0 text-blue-700 shadow-sm hover:translate-y-0 hover:bg-blue-100 hover:text-blue-800"
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
                                onOpen={() =>
                                  handleOpenWebsite(lead, companyWeb)
                                }
                                size="md"
                              />
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(lead)}
                              className="sk-row-icon-btn h-8 w-8 shrink-0 rounded-lg border-border/60 bg-background p-0 text-muted-foreground shadow-sm hover:translate-y-0 hover:bg-muted hover:text-foreground"
                              title="Upravit deal"
                              aria-label="Upravit deal"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="sk-row-icon-btn h-8 px-2 hover:translate-y-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="z-50 min-w-[15.5rem] border bg-white shadow-md "
                              >
                                {companyWeb && (!emailTrim || !phoneTrim) ? (
                                  <DropdownMenuItem
                                    disabled={scrapingLeadIds.includes(lead.id)}
                                    onClick={() =>
                                      void handleScrapeLeadContacts(lead)
                                    }
                                  >
                                    <ScanSearch className="mr-2 h-4 w-4" />
                                    Doplnit kontakt z webu
                                  </DropdownMenuItem>
                                ) : null}
                                {(lead.lastContactedAt ||
                                  lead.contactedVia) && (
                                  <DropdownMenuItem
                                    disabled={isLoadingSentEmails}
                                    onClick={() =>
                                      void handleViewSentEmails(lead)
                                    }
                                    className="whitespace-nowrap"
                                  >
                                    <Mail className="mr-2 h-4 w-4 shrink-0" />
                                    Zobrazit odeslaný e-mail
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    void handleSendOutreach(
                                      lead.id,
                                      "FOLLOW_UP",
                                    )
                                  }
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Poslat follow-up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    void handleSendOutreach(lead.id, "BREAKUP")
                                  }
                                >
                                  <Hand className="mr-2 h-4 w-4" />
                                  Poslat breakup
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteSingleLead(lead.id)
                                  }
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

          <div className="sk-pager mt-0 flex shrink-0 items-center justify-between gap-2 border-0 bg-transparent px-3 py-2 md:gap-3 md:px-4 md:py-2.5">
            <p className="text-xs leading-none text-muted-foreground">
              {t("crm.showing", { from: shownFrom, to: shownTo, total: totalItems })}
            </p>
            <div className="flex items-center gap-0.5 md:gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="sk-pager-btn h-7 gap-0.5 rounded-lg px-1.5 text-[11px] font-medium text-muted-foreground shadow-none hover:text-foreground md:px-2 md:text-xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="!size-3.5 shrink-0" />
                {t("crm.previous")}
              </Button>
              <span className="min-w-[2.5rem] text-center text-[11px] tabular-nums leading-none text-muted-foreground md:text-xs">
                {safePage}/{totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="sk-pager-btn h-7 gap-0.5 rounded-lg px-1.5 text-[11px] font-medium text-muted-foreground shadow-none hover:text-foreground md:px-2 md:text-xs"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage >= totalPages}
              >
                {t("crm.next")}
                <ChevronRight className="!size-3.5 shrink-0" />
              </Button>
            </div>
          </div>
        </div>
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
              <p className="text-[11px] text-muted-foreground">
                Odhadovaná cena zakázky. Ve fázích nahoře se sčítá automaticky.
              </p>
            </div>
          </div>

          <div className="sk-dialog-actions gap-3">
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
        <DialogContent className="flex max-h-[88vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
          {sentEmailPreview &&
            (() => {
              const active =
                sentEmailPreview.emails.find(
                  (e) => e.id === sentEmailPreview.activeId,
                ) ?? sentEmailPreview.emails[0]!;
              const bodyText = htmlBodyToEditablePlainText(active.htmlBody);
              return (
                <>
                  <DialogHeader className="space-y-1 border-b border-border/60 px-6 py-4 pr-12 text-left">
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
                    <div className="flex gap-1 overflow-x-auto border-b border-border/50 px-4 py-2">
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
                                ? "bg-blue-600 text-white"
                                : "bg-muted text-muted-foreground hover:text-foreground",
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
                      <div className="whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-foreground">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("crm.newDeal")}</DialogTitle>
            <DialogDescription>
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
              <p className="text-[11px] text-muted-foreground">
                Odhadovaná cena zakázky. Ve fázích nahoře se sčítá automaticky.
              </p>
            </div>
          </div>

          <div className="sk-dialog-actions gap-3">
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
