"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Globe,
  Hand,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ScanSearch,
  Send,
  Trash,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shortLeadAuthorName } from "@/lib/lead-provenance";

const SCRAPE_CONTACT_HINT =
  "Důkladně prohledá web a doplní e-mail nebo telefon";

export function leadFullWebsiteUrl(domainOrUrl: string): string {
  const raw = (domainOrUrl ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export function buildSniperLeadHref(lead: {
  url: string;
  email: string;
}): string {
  const website = leadFullWebsiteUrl(lead.url);
  const email = (lead.email ?? "").trim();
  const qs: string[] = [];
  if (website) qs.push(`url=${encodeURIComponent(website)}`);
  if (email) qs.push(`email=${encodeURIComponent(email)}`);
  return qs.length > 0 ? `/sniper?${qs.join("&")}` : "/sniper";
}

export function WebsiteVisitedGlobeButton({
  visited,
  visitedBy,
  onOpen,
}: {
  visited?: boolean;
  visitedBy?: string;
  onOpen: () => void;
}) {
  const who = shortLeadAuthorName(visitedBy);
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <Popover open={hintOpen} onOpenChange={setHintOpen}>
      <div
        className="relative inline-flex shrink-0"
        onMouseEnter={() => setHintOpen(true)}
        onMouseLeave={() => setHintOpen(false)}
      >
        <PopoverAnchor asChild>
          <button
            type="button"
            onClick={onOpen}
            onFocus={() => setHintOpen(true)}
            onBlur={() => setHintOpen(false)}
            className={cn(
              "sk-crm-iconbtn",
              visited && "sk-crm-iconbtn--visited",
            )}
            aria-label={
              visited
                ? who
                  ? `Web prohlédnut, první návštěva webu: ${who}`
                  : "Web prohlédnut"
                : "Otevřít web firmy"
            }
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </PopoverAnchor>
      </div>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="z-[200] w-auto max-w-[15rem] rounded-xl border border-border bg-[color:var(--n-card)] px-3 py-2 shadow-lg"
      >
        {visited ? (
          <>
            <p className="text-xs font-semibold leading-snug text-emerald-400">
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

export function ScrapeContactButton({
  isLoading,
  disabled,
  onClick,
}: {
  isLoading: boolean;
  disabled?: boolean;
  onClick: () => void;
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
          <button
            type="button"
            disabled={disabled || isLoading}
            onClick={onClick}
            onFocus={() => setHintOpen(true)}
            onBlur={() => setHintOpen(false)}
            className="sk-crm-scan"
            aria-label={SCRAPE_CONTACT_HINT}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#02A7FF]" />
            ) : (
              <ScanSearch className="h-3.5 w-3.5 text-[#02A7FF]" strokeWidth={2} />
            )}
          </button>
        </PopoverAnchor>
      </div>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-auto max-w-[15rem] rounded-xl border-border/70 bg-[color:var(--n-card)] px-3 py-2 shadow-lg"
      >
        <p className="text-xs font-medium leading-snug text-foreground">
          {SCRAPE_CONTACT_HINT}
        </p>
      </PopoverContent>
    </Popover>
  );
}

export function CrmRowActions({
  companyWeb,
  emailTrim,
  phoneTrim,
  visited,
  visitedBy,
  hasSentEmails,
  isLoadingSentEmails,
  isScraping,
  sniperHref,
  onOpenWebsite,
  onEdit,
  onScrape,
  onViewSentEmails,
  onSendFollowUp,
  onSendBreakup,
  onDelete,
}: {
  companyWeb: string;
  emailTrim: string;
  phoneTrim: string;
  visited?: boolean;
  visitedBy?: string;
  hasSentEmails: boolean;
  isLoadingSentEmails: boolean;
  isScraping: boolean;
  sniperHref: string;
  onOpenWebsite: () => void;
  onEdit: () => void;
  onScrape: () => void;
  onViewSentEmails: () => void;
  onSendFollowUp: () => void;
  onSendBreakup: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="sk-crm-actions">
      <Link
        href={sniperHref}
        className="sk-crm-iconbtn"
        title="Odeslat do Snipera"
        aria-label="Odeslat do Snipera"
      >
        <Send className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
      {companyWeb ? (
        <WebsiteVisitedGlobeButton
          visited={visited}
          visitedBy={visitedBy}
          onOpen={onOpenWebsite}
        />
      ) : null}
      {hasSentEmails ? (
        <button
          type="button"
          className="sk-crm-iconbtn"
          title="Zobrazit odeslaný e-mail"
          aria-label="Zobrazit odeslaný e-mail"
          disabled={isLoadingSentEmails}
          onClick={onViewSentEmails}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
      <button
        type="button"
        className="sk-crm-iconbtn"
        title="Upravit deal"
        aria-label="Upravit deal"
        onClick={onEdit}
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="sk-crm-iconbtn"
            aria-label="Další akce"
          >
            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-50 min-w-[15.5rem] border bg-[color:var(--n-card)] shadow-md"
        >
          {companyWeb && (!emailTrim || !phoneTrim) ? (
            <DropdownMenuItem disabled={isScraping} onClick={onScrape}>
              <ScanSearch className="mr-2 h-4 w-4" />
              Doplnit kontakt z webu
            </DropdownMenuItem>
          ) : null}
          {hasSentEmails ? (
            <DropdownMenuItem
              disabled={isLoadingSentEmails}
              onClick={onViewSentEmails}
              className="whitespace-nowrap"
            >
              <Mail className="mr-2 h-4 w-4 shrink-0" />
              Zobrazit odeslaný e-mail
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={onSendFollowUp}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Poslat follow-up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSendBreakup}>
            <Hand className="mr-2 h-4 w-4" />
            Poslat breakup
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-400 focus:text-red-300"
          >
            <Trash className="mr-2 h-4 w-4" />
            Smazat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function useCloseOnOutsideClick(
  open: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
  excludeSelector?: string,
) {
  useEffect(() => {
    if (!open) return;

    const isInsideContainer = (event: PointerEvent) => {
      const path = event.composedPath();
      for (const node of path) {
        if (!(node instanceof Node)) continue;
        if (containerRef.current?.contains(node)) return true;
        if (
          node instanceof Element &&
          excludeSelector &&
          (node.matches?.(excludeSelector) || node.closest?.(excludeSelector))
        ) {
          return true;
        }
        if (
          node instanceof Element &&
          node.closest?.(
            "[data-radix-select-content], [data-radix-popper-content-wrapper], [data-radix-select-trigger]",
          )
        ) {
          return true;
        }
      }
      return false;
    };

    const onDoc = (event: PointerEvent) => {
      if (isInsideContainer(event)) return;
      onClose();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        document.querySelector(
          '[data-radix-select-content][data-state="open"]',
        )
      ) {
        return;
      }
      onClose();
    };

    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, containerRef, excludeSelector]);
}

export function CrmFiltersPanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(open, onClose, ref, "[data-crm-filters-trigger]");

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="sk-crm-filters"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {children}
      <button
        type="button"
        className="sk-crm-btn sk-crm-btn--white sk-crm-filters__apply"
        onClick={onClose}
      >
        Použít filtry
      </button>
    </div>
  );
}
