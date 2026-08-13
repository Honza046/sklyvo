"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceBillingForm } from "@/components/admin/workspace-billing-form";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  disabledAt: Date | null;
};

type Lead = {
  id: string;
  companyName: string | null;
  contactEmail: string | null;
  email: string | null;
  status: string;
  source: string;
  createdAt: Date;
};

type Activity = {
  id: string;
  title: string;
  actionType: string;
  description: string | null;
  createdAt: Date;
};

type StatusGroup = { status: string; count: number };
type SourceGroup = { source: string; count: number };

export type AdminWorkspaceTabsProps = {
  workspace: {
    id: string;
    name: string;
    planTier: string | null;
    subscriptionStatus: string | null;
    creditsUsed: number;
    creditsTotal: number;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionPeriodEnd: Date | null;
    trialEndsAt: Date | null;
    leadsCount: number;
    emailsSent: number;
    activeDeals: number;
    pipelineValue: number;
    emailConnection: { status: string; provider: string | null; senderEmail: string | null } | null;
    googleSheetsConnection: { status: string; googleAccountEmail: string | null } | null;
    microsoftConnection: { status: string; msAccountEmail: string | null } | null;
    fakturoidConnection: { connectedAt: Date | null; accountSlug: string | null; accountEmail: string | null } | null;
    _count: { leads: number; documents: number; activityLogs: number };
    members: Member[];
    recentLeads: Lead[];
    recentActivity: Activity[];
    leadStatusGroups: StatusGroup[];
    leadSourceGroups: SourceGroup[];
  };
};

const TABS = [
  { id: "billing", label: "Billing" },
  { id: "usage", label: "Usage" },
  { id: "integrations", label: "Integrace" },
  { id: "data", label: "Data" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function statusPill(status: string | null | undefined) {
  const s = (status ?? "DISCONNECTED").toUpperCase();
  if (s === "CONNECTED") return "sk-admin__pill sk-admin__pill--ok";
  if (s === "ERROR") return "sk-admin__pill sk-admin__pill--bad";
  return "sk-admin__pill";
}

export function AdminWorkspaceTabs({ workspace: ws }: AdminWorkspaceTabsProps) {
  const [tab, setTab] = useState<TabId>("billing");

  return (
    <div className="sk-admin__tabs">
      <div className="sk-admin__tabs-bar" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn("sk-admin__tab", tab === item.id && "is-active")}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="sk-admin__tab-panel">
        {tab === "billing" ? (
          <div className="sk-admin__tab-grid">
            <dl className="sk-admin__dl sk-admin__dl--compact">
              <div>
                <dt>Plán</dt>
                <dd>
                  {ws.planTier} · {ws.subscriptionStatus}
                </dd>
              </div>
              <div>
                <dt>Kredity</dt>
                <dd>
                  {ws.creditsUsed} / {ws.creditsTotal}
                </dd>
              </div>
              <div>
                <dt>Stripe</dt>
                <dd className="font-mono text-[11px]">
                  {ws.stripeCustomerId ? (
                    <a
                      href={`https://dashboard.stripe.com/customers/${ws.stripeCustomerId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="sk-admin__link"
                    >
                      {ws.stripeCustomerId.slice(0, 18)}…
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Období / trial</dt>
                <dd className="text-[11px]">
                  {ws.subscriptionPeriodEnd?.toLocaleDateString("cs-CZ") || "—"} /{" "}
                  {ws.trialEndsAt?.toLocaleDateString("cs-CZ") || "—"}
                </dd>
              </div>
            </dl>
            <WorkspaceBillingForm
              workspaceId={ws.id}
              planTier={ws.planTier ?? ""}
              subscriptionStatus={ws.subscriptionStatus ?? ""}
              creditsTotal={ws.creditsTotal}
              creditsUsed={ws.creditsUsed}
            />
          </div>
        ) : null}

        {tab === "usage" ? (
          <div className="sk-admin__tab-stack">
            <dl className="sk-admin__dl sk-admin__dl--inline">
              <div>
                <dt>Leady</dt>
                <dd>{ws.leadsCount} / DB {ws._count.leads}</dd>
              </div>
              <div>
                <dt>E-maily</dt>
                <dd>{ws.emailsSent}</dd>
              </div>
              <div>
                <dt>Deals</dt>
                <dd>
                  {ws.activeDeals} / {ws.pipelineValue}
                </dd>
              </div>
              <div>
                <dt>Dokumenty</dt>
                <dd>{ws._count.documents}</dd>
              </div>
            </dl>
            <div className="sk-admin__chip-row">
              {ws.leadStatusGroups.map((g) => (
                <span key={g.status} className="sk-admin__pill">
                  {g.status}: {g.count}
                </span>
              ))}
              {ws.leadSourceGroups.map((g) => (
                <span key={g.source} className="sk-admin__pill">
                  {g.source}: {g.count}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "integrations" ? (
          <ul className="sk-admin__list sk-admin__list--compact">
            <li>
              <span className={statusPill(ws.emailConnection?.status)}>E-mail</span>
              <span className="sk-admin__muted text-xs">
                {ws.emailConnection?.provider} {ws.emailConnection?.senderEmail}
              </span>
            </li>
            <li>
              <span className={statusPill(ws.googleSheetsConnection?.status)}>Sheets</span>
              <span className="sk-admin__muted text-xs">
                {ws.googleSheetsConnection?.googleAccountEmail}
              </span>
            </li>
            <li>
              <span className={statusPill(ws.microsoftConnection?.status)}>Microsoft</span>
              <span className="sk-admin__muted text-xs">
                {ws.microsoftConnection?.msAccountEmail}
              </span>
            </li>
            <li>
              <span
                className={statusPill(
                  ws.fakturoidConnection?.connectedAt ? "CONNECTED" : "DISCONNECTED",
                )}
              >
                Fakturoid
              </span>
              <span className="sk-admin__muted text-xs">
                {ws.fakturoidConnection?.accountSlug} {ws.fakturoidConnection?.accountEmail}
              </span>
            </li>
          </ul>
        ) : null}

        {tab === "data" ? (
          <div className="sk-admin__tab-split">
            <div className="sk-admin__mini-table">
              <p className="sk-admin__mini-title">Členové</p>
              <table className="sk-admin__table sk-admin__table--dense">
                <tbody>
                  {ws.members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/admin/users/${m.id}`} className="sk-admin__link">
                          {m.name || m.email}
                        </Link>
                      </td>
                      <td>{m.role}</td>
                      <td>{m.disabledAt ? "Off" : "OK"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sk-admin__mini-table">
              <p className="sk-admin__mini-title">Leady</p>
              <table className="sk-admin__table sk-admin__table--dense">
                <tbody>
                  {ws.recentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.companyName || "—"}</td>
                      <td className="text-xs">{lead.status}</td>
                      <td className="sk-admin__muted text-[11px]">
                        {lead.createdAt.toLocaleDateString("cs-CZ")}
                      </td>
                    </tr>
                  ))}
                  {ws.recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="sk-admin__empty">
                        —
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="sk-admin__mini-table sk-admin__mini-table--wide">
              <p className="sk-admin__mini-title">Aktivita</p>
              <ul className="sk-admin__list sk-admin__list--compact">
                {ws.recentActivity.map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.title}</span>
                    <span className="sk-admin__muted text-[11px]">
                      {a.actionType} · {a.createdAt.toLocaleDateString("cs-CZ")}
                    </span>
                  </li>
                ))}
                {ws.recentActivity.length === 0 ? (
                  <li className="sk-admin__empty">—</li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
