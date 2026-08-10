import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminWorkspace } from "@/app/actions/platform-admin";
import { WorkspaceBillingForm } from "@/components/admin/workspace-billing-form";

export const dynamic = "force-dynamic";

function statusPill(status: string | null | undefined) {
  const s = (status ?? "DISCONNECTED").toUpperCase();
  if (s === "CONNECTED") return "sk-admin__pill sk-admin__pill--ok";
  if (s === "ERROR") return "sk-admin__pill sk-admin__pill--bad";
  return "sk-admin__pill";
}

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  return (
    <div className="sk-admin__page">
      <header className="sk-admin__page-head">
        <Link href="/admin/workspaces" className="sk-admin__back">
          ← Workspacey
        </Link>
        <h1 className="sk-admin__h1">{ws.name}</h1>
        <p className="sk-admin__lede">
          {ws.companyName || "Bez companyName"} · {ws.industry || "—"}
        </p>
      </header>

      <div className="sk-admin__cards">
        <section className="sk-admin__card">
          <h2 className="sk-admin__h2">Billing</h2>
          <dl className="sk-admin__dl">
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
              <dt>Stripe customer</dt>
              <dd className="font-mono text-xs">
                {ws.stripeCustomerId ? (
                  <a
                    href={`https://dashboard.stripe.com/customers/${ws.stripeCustomerId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="sk-admin__link"
                  >
                    {ws.stripeCustomerId}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>Stripe subscription</dt>
              <dd className="font-mono text-xs">
                {ws.stripeSubscriptionId || "—"}
              </dd>
            </div>
            <div>
              <dt>Period end / trial</dt>
              <dd className="text-xs">
                {ws.subscriptionPeriodEnd?.toLocaleString("cs-CZ") || "—"} /{" "}
                {ws.trialEndsAt?.toLocaleString("cs-CZ") || "—"}
              </dd>
            </div>
          </dl>
          <WorkspaceBillingForm
            workspaceId={ws.id}
            planTier={ws.planTier}
            subscriptionStatus={ws.subscriptionStatus}
            creditsTotal={ws.creditsTotal}
            creditsUsed={ws.creditsUsed}
          />
        </section>

        <section className="sk-admin__card">
          <h2 className="sk-admin__h2">Usage</h2>
          <dl className="sk-admin__dl">
            <div>
              <dt>Leady (denorm)</dt>
              <dd>{ws.leadsCount}</dd>
            </div>
            <div>
              <dt>Leady (DB)</dt>
              <dd>{ws._count.leads}</dd>
            </div>
            <div>
              <dt>E-maily odeslané</dt>
              <dd>{ws.emailsSent}</dd>
            </div>
            <div>
              <dt>Active deals / pipeline</dt>
              <dd>
                {ws.activeDeals} / {ws.pipelineValue}
              </dd>
            </div>
            <div>
              <dt>Dokumenty / activity</dt>
              <dd>
                {ws._count.documents} / {ws._count.activityLogs}
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {ws.leadStatusGroups.map((g) => (
              <span key={g.status} className="sk-admin__pill">
                {g.status}: {g.count}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ws.leadSourceGroups.map((g) => (
              <span key={g.source} className="sk-admin__pill">
                {g.source}: {g.count}
              </span>
            ))}
          </div>
        </section>

        <section className="sk-admin__card">
          <h2 className="sk-admin__h2">Integrace (status only)</h2>
          <ul className="sk-admin__list">
            <li>
              <span className={statusPill(ws.emailConnection?.status)}>
                E-mail {ws.emailConnection?.status ?? "—"}
              </span>
              <span className="sk-admin__muted text-xs">
                {ws.emailConnection?.provider ?? ""}{" "}
                {ws.emailConnection?.senderEmail ?? ""}
              </span>
            </li>
            <li>
              <span className={statusPill(ws.googleSheetsConnection?.status)}>
                Sheets {ws.googleSheetsConnection?.status ?? "—"}
              </span>
              <span className="sk-admin__muted text-xs">
                {ws.googleSheetsConnection?.googleAccountEmail ?? ""}
              </span>
            </li>
            <li>
              <span className={statusPill(ws.microsoftConnection?.status)}>
                Microsoft {ws.microsoftConnection?.status ?? "—"}
              </span>
              <span className="sk-admin__muted text-xs">
                {ws.microsoftConnection?.msAccountEmail ?? ""}
              </span>
            </li>
            <li>
              <span className={statusPill(ws.fakturoidConnection?.connectedAt ? "CONNECTED" : "DISCONNECTED")}>
                Fakturoid{" "}
                {ws.fakturoidConnection?.connectedAt ? "CONNECTED" : "—"}
              </span>
              <span className="sk-admin__muted text-xs">
                {ws.fakturoidConnection?.accountSlug ?? ""}{" "}
                {ws.fakturoidConnection?.accountEmail ?? ""}
              </span>
            </li>
          </ul>
        </section>

        <section className="sk-admin__card">
          <h2 className="sk-admin__h2">Členové</h2>
          <div className="sk-admin__table-wrap">
            <table className="sk-admin__table">
              <thead>
                <tr>
                  <th>Jméno</th>
                  <th>Role</th>
                  <th>Stav</th>
                </tr>
              </thead>
              <tbody>
                {ws.members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/admin/users/${m.id}`} className="sk-admin__link">
                        {m.name || m.email}
                        <span className="sk-admin__muted block text-xs">
                          {m.email}
                        </span>
                      </Link>
                    </td>
                    <td>{m.role}</td>
                    <td>{m.disabledAt ? "Disabled" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sk-admin__card sk-admin__card--wide">
          <h2 className="sk-admin__h2">Poslední leady</h2>
          <div className="sk-admin__table-wrap">
            <table className="sk-admin__table">
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Vytvořeno</th>
                </tr>
              </thead>
              <tbody>
                {ws.recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.companyName}</td>
                    <td className="text-xs">
                      {lead.contactEmail || lead.email || "—"}
                    </td>
                    <td>{lead.status}</td>
                    <td>{lead.source}</td>
                    <td className="sk-admin__muted text-xs">
                      {lead.createdAt.toLocaleString("cs-CZ")}
                    </td>
                  </tr>
                ))}
                {ws.recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="sk-admin__empty">
                      Žádné leady.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sk-admin__card sk-admin__card--wide">
          <h2 className="sk-admin__h2">Activity log</h2>
          <ul className="sk-admin__list">
            {ws.recentActivity.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.title}</span>
                <span className="sk-admin__muted text-xs">
                  {a.actionType} · {a.createdAt.toLocaleString("cs-CZ")}
                </span>
                {a.description ? (
                  <span className="sk-admin__muted block text-xs">
                    {a.description}
                  </span>
                ) : null}
              </li>
            ))}
            {ws.recentActivity.length === 0 ? (
              <li className="sk-admin__empty">Žádná aktivita.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
