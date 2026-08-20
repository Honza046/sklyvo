"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const CRM_HINT_DELAY_MS = 1000;

function useDelayedHint(delayMs = CRM_HINT_DELAY_MS) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onEnter = () => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), delayMs);
  };

  const onLeave = () => {
    clearTimer();
    setOpen(false);
  };

  useEffect(() => () => clearTimer(), []);

  return { open, setOpen, onEnter, onLeave };
}

function CrmHintBubble({
  open,
  anchorRef,
  side = "top",
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  side?: "top" | "bottom";
  children: ReactNode;
}) {
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setCoords(null);
      return;
    }

    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        left: rect.left + rect.width / 2,
        top: side === "bottom" ? rect.bottom + 6 : rect.top - 6,
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, side]);

  if (!open || !coords || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "sk-crm-hint",
        side === "bottom" ? "sk-crm-hint--bottom" : "sk-crm-hint--top",
      )}
      role="tooltip"
      style={{ left: coords.left, top: coords.top }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function CrmActionHint({
  label,
  description,
  side = "top",
  children,
}: {
  label: string;
  description?: string;
  side?: "top" | "bottom";
  children: ReactElement;
}) {
  const { open, onEnter, onLeave } = useDelayedHint();
  const wrapRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={wrapRef}
      className="sk-crm-hint-wrap"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
      <CrmHintBubble open={open} anchorRef={wrapRef} side={side}>
        <p className="sk-crm-hint__label">{label}</p>
        {description ? <p className="sk-crm-hint__desc">{description}</p> : null}
      </CrmHintBubble>
    </div>
  );
}

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
  const { open: hintOpen, setOpen: setHintOpen, onEnter, onLeave } =
    useDelayedHint();
  const wrapRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={wrapRef}
      className="sk-crm-hint-wrap"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        onClick={onOpen}
        onFocus={() => setHintOpen(true)}
        onBlur={() => setHintOpen(false)}
        className={cn("sk-crm-iconbtn", visited && "sk-crm-iconbtn--visited")}
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
      <CrmHintBubble open={hintOpen} anchorRef={wrapRef}>
        {visited ? (
          <>
            <p className="sk-crm-hint__label sk-crm-hint__label--success">
              Web už někdo prošel
            </p>
            <p className="sk-crm-hint__desc">
              {who
                ? `První návštěva webu: ${who}`
                : "Někdo z týmu už web otevřel."}
            </p>
          </>
        ) : (
          <>
            <p className="sk-crm-hint__label">Otevřít web</p>
            <p className="sk-crm-hint__desc">Po první návštěvě zezelená.</p>
          </>
        )}
      </CrmHintBubble>
    </div>
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
  const { open: hintOpen, setOpen: setHintOpen, onEnter, onLeave } =
    useDelayedHint();
  const wrapRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={wrapRef}
      className="sk-crm-hint-wrap shrink-0"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
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
      <CrmHintBubble open={hintOpen} anchorRef={wrapRef}>
        <p className="sk-crm-hint__label">{SCRAPE_CONTACT_HINT}</p>
      </CrmHintBubble>
    </div>
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
      <CrmActionHint label="Odeslat do Snipera">
        <Link
          href={sniperHref}
          className="sk-crm-iconbtn"
          aria-label="Odeslat do Snipera"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </CrmActionHint>
      {companyWeb ? (
        <WebsiteVisitedGlobeButton
          visited={visited}
          visitedBy={visitedBy}
          onOpen={onOpenWebsite}
        />
      ) : null}
      {hasSentEmails ? (
        <CrmActionHint
          label="Zobrazit odeslaný e-mail"
          description="Náhled textu, který jsme firmě odeslali."
        >
          <button
            type="button"
            className="sk-crm-iconbtn"
            aria-label="Zobrazit odeslaný e-mail"
            disabled={isLoadingSentEmails}
            onClick={onViewSentEmails}
          >
            {isLoadingSentEmails ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
            )}
          </button>
        </CrmActionHint>
      ) : null}
      <CrmActionHint label="Upravit deal">
        <button
          type="button"
          className="sk-crm-iconbtn"
          aria-label="Upravit deal"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </CrmActionHint>
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
