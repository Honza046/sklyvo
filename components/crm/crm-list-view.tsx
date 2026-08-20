"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw } from "lucide-react";
import { leadProvenanceParts } from "@/lib/lead-provenance";
import type { LeadSourceValue } from "@/lib/lead-provenance";
import { CompanyAvatar } from "@/components/crm/company-avatar";
import {
  MATEJ_STATUS_TINT,
  matejAvatarStyle,
  matejBadgeStyle,
  nextLeadStatus,
  type CrmLeadStatusDb,
  type CrmLeadStatusKey,
} from "@/lib/crm/matej-status";
import { CrmMatejCheckbox } from "@/components/crm/crm-matej-checkbox";
import {
  buildSniperLeadHref,
  CrmRowActions,
  leadFullWebsiteUrl,
  ScrapeContactButton,
} from "@/components/crm/crm-row-widgets";
import {
  CrmTableLoadingSpinner,
  CrmTableSkeleton,
} from "@/components/crm/crm-table-skeleton";
import { buildLeadFaviconUrl } from "@/lib/lead-favicon";

export type CrmListLead = {
  id: string;
  company: string;
  url: string;
  status: CrmLeadStatusKey;
  leadStatus: CrmLeadStatusDb;
  date: string;
  avatar: string;
  faviconUrl?: string | null;
  email: string;
  phone: string;
  author: string;
  source: LeadSourceValue;
  contactedVia?: "" | "SNIPER" | "AUTOPILOT_SNIPER";
  websiteVisited?: boolean;
  websiteVisitedBy?: string;
  lastContactedAt?: string | null;
};

type CrmListViewProps = {
  visible: boolean;
  isLoading: boolean;
  leads: CrmListLead[];
  selectedIds: string[];
  allFilteredSelected: boolean;
  allPageSelected: boolean;
  somePageSelected: boolean;
  totalItems: number;
  safePage: number;
  totalPages: number;
  scrapingLeadIds: string[];
  isBulkRunning: boolean;
  loadingSentEmailsLeadId: string | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  statusLabelMap: Record<CrmLeadStatusKey, string>;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
  onQuickStatus: (id: string, status: CrmLeadStatusDb) => void;
  onCycleStatus: (id: string, current: CrmLeadStatusDb) => void;
  onOpenWebsite: (lead: CrmListLead, url: string) => void;
  onOpenEdit: (lead: CrmListLead) => void;
  onScrapeContacts: (lead: CrmListLead) => void;
  onViewSentEmails: (lead: CrmListLead) => void;
  onSendOutreach: (id: string, kind: "FOLLOW_UP" | "BREAKUP") => void;
  onDelete: (id: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function CrmListView({
  visible,
  isLoading,
  leads,
  selectedIds,
  allFilteredSelected,
  allPageSelected,
  somePageSelected,
  totalItems,
  safePage,
  totalPages,
  scrapingLeadIds,
  isBulkRunning,
  loadingSentEmailsLeadId,
  t,
  statusLabelMap,
  onToggleAll,
  onToggleRow,
  onQuickStatus,
  onCycleStatus,
  onOpenWebsite,
  onOpenEdit,
  onScrapeContacts,
  onViewSentEmails,
  onSendOutreach,
  onDelete,
  onPrevPage,
  onNextPage,
}: CrmListViewProps) {
  if (!visible) return null;

  return (
    <div className="sk-crm-table" aria-hidden={!visible}>
      <div className="sk-crm-table__head">
        <CrmMatejCheckbox
          checked={allFilteredSelected || allPageSelected}
          indeterminate={somePageSelected}
          onChange={onToggleAll}
          aria-label="Vybrat vše na stránce"
        />
        <span className="sk-crm-table__th">{t("crm.colCompany")}</span>
        <span className="sk-crm-table__th">{t("crm.colDate")}</span>
        <span className="sk-crm-table__th">{t("crm.colContact")}</span>
        <span className="sk-crm-table__th">{t("crm.colStatus")}</span>
        <span className="sk-crm-table__th sk-crm-table__th--right">
          {t("crm.colActions")}
        </span>
      </div>

      <div className="sk-crm-table__body">
        {isLoading && totalItems === 0 ? (
          <CrmTableLoadingSpinner />
        ) : isLoading ? (
          <CrmTableSkeleton embedded />
        ) : leads.length === 0 ? (
          <div className="sk-crm-table__empty">
            Žádné firmy neodpovídají hledání.
          </div>
        ) : (
          leads.map((lead) => {
            const companyWeb = leadFullWebsiteUrl(lead.url);
            const emailTrim = (lead.email ?? "").trim();
            const phoneTrim = (lead.phone ?? "").trim();
            const noMail = !emailTrim;
            const tint = MATEJ_STATUS_TINT[lead.status];
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

            return (
              <div key={lead.id} className="sk-crm-table__row">
                <CrmMatejCheckbox
                  checked={selectedIds.includes(lead.id)}
                  onChange={() => onToggleRow(lead.id)}
                  aria-label="Vybrat řádek"
                />

                <div className="sk-crm-firm">
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
                  <div className="min-w-0">
                    <div className="sk-crm-firm__name" title={lead.company}>
                      {lead.company}
                    </div>
                    {sourceLabel ? (
                      <div className="sk-crm-firm__source">{sourceLabel}</div>
                    ) : null}
                  </div>
                </div>

                <span className="sk-crm-date">{lead.date}</span>

                <div className="sk-crm-contact">
                  <div className="min-w-0 flex-1">
                    <div
                      className="sk-crm-contact__email"
                      style={{
                        color: noMail ? "#6b7078" : undefined,
                        fontStyle: noMail ? "italic" : undefined,
                      }}
                      title={emailTrim || undefined}
                    >
                      {emailTrim || t("common.noEmail")}
                    </div>
                    <div className="sk-crm-contact__phone">
                      {phoneTrim || "Bez telefonu"}
                    </div>
                  </div>
                  {companyWeb && (!emailTrim || !phoneTrim) ? (
                    <ScrapeContactButton
                      isLoading={scrapingLeadIds.includes(lead.id)}
                      disabled={isBulkRunning}
                      onClick={() => onScrapeContacts(lead)}
                    />
                  ) : null}
                </div>

                <div className="sk-crm-status-cell">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" style={matejBadgeStyle(tint)}>
                        {statusLabelMap[lead.status]}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="z-50 border bg-[color:var(--n-card)] shadow-md"
                    >
                      {(
                        [
                          ["NEW", "NOVÝ LEAD"],
                          ["CONTACTED", "KONTAKTOVÁNO"],
                          ["REPLIED", "FOLLOW UP"],
                          ["MEETING_SET", "KOMUNIKACE"],
                          ["CLOSED_WON", "DOMLUVENO"],
                          ["BREAK_UP", "BREAKUP"],
                          ["CLOSED_LOST", "NEDOMLUVENO"],
                        ] as const
                      ).map(([value, label]) => (
                        <DropdownMenuItem
                          key={value}
                          onClick={() => onQuickStatus(lead.id, value)}
                        >
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    type="button"
                    className="sk-crm-cycle"
                    aria-label="Změnit status"
                    onClick={() => onCycleStatus(lead.id, lead.leadStatus)}
                  >
                    <RefreshCw className="h-3 w-3 text-[#6b7078]" strokeWidth={2.2} />
                  </button>
                </div>

                <CrmRowActions
                  companyWeb={companyWeb}
                  emailTrim={emailTrim}
                  phoneTrim={phoneTrim}
                  visited={lead.websiteVisited}
                  visitedBy={lead.websiteVisitedBy}
                  hasSentEmails={Boolean(
                    lead.lastContactedAt || lead.contactedVia,
                  )}
                  isLoadingSentEmails={loadingSentEmailsLeadId === lead.id}
                  isScraping={scrapingLeadIds.includes(lead.id)}
                  sniperHref={buildSniperLeadHref(lead)}
                  onOpenWebsite={() => onOpenWebsite(lead, companyWeb)}
                  onEdit={() => onOpenEdit(lead)}
                  onScrape={() => onScrapeContacts(lead)}
                  onViewSentEmails={() => onViewSentEmails(lead)}
                  onSendFollowUp={() => onSendOutreach(lead.id, "FOLLOW_UP")}
                  onSendBreakup={() => onSendOutreach(lead.id, "BREAKUP")}
                  onDelete={() => onDelete(lead.id)}
                />
              </div>
            );
          })
        )}
      </div>

      <div className="sk-crm-table__foot">
        <span className="sk-crm-table__shown">
          {t("crm.showing", {
            shown: leads.length,
            total: totalItems,
          })}
        </span>
        <div className="sk-crm-table__pager">
          <button
            type="button"
            className="sk-crm-pagebtn"
            onClick={onPrevPage}
            disabled={safePage <= 1}
          >
            {t("crm.previous")}
          </button>
          <span className="sk-crm-table__page-num tabular-nums">
            {safePage}/{totalPages}
          </span>
          <button
            type="button"
            className="sk-crm-pagebtn"
            onClick={onNextPage}
            disabled={safePage >= totalPages}
          >
            {t("crm.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { nextLeadStatus };
