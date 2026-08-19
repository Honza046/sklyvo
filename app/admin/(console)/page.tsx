import Link from "next/link";
import {
  Activity,
  Building2,
  Coins,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  getAdminBillingOverview,
  getAdminDashboardStats,
  getPlatformFakturoidStatus,
  listAdminAuditLogs,
  listAdminUsers,
  listAdminWorkspaces,
} from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";
import {
  formatAdminDate,
  membershipLabel,
  paymentBadge,
} from "@/lib/admin-billing-display";

export const dynamic = "force-dynamic";

function formatInt(n: number) {
  return new Intl.NumberFormat("cs-CZ").format(n);
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: currency || "CZK",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

export default async function AdminDashboardPage() {
  const [stats, billing, workspaces, users, audit, fakturoid] =
    await Promise.all([
      getAdminDashboardStats(),
      getAdminBillingOverview(),
      listAdminWorkspaces(),
      listAdminUsers(),
      listAdminAuditLogs(8),
      getPlatformFakturoidStatus(),
    ]);

  const creditsPct =
    stats.creditsTotalSum > 0
      ? Math.min(
          100,
          Math.round((stats.creditsUsedSum / stats.creditsTotalSum) * 100),
        )
      : 0;

  const primary = [
    {
      label: "Uživatelé",
      value: formatInt(stats.usersTotal),
      hint: `+${formatInt(stats.newUsers7d)} za 7 dní`,
      href: "/admin/users",
      icon: Users,
      tone: "blue" as const,
    },
    {
      label: "Workspaces",
      value: formatInt(stats.workspacesTotal),
      hint: `+${formatInt(stats.newWorkspaces7d)} za 7 dní`,
      href: "/admin/workspaces",
      icon: Building2,
      tone: "slate" as const,
    },
    {
      label: "Placené",
      value: formatInt(stats.paidWorkspaces),
      hint: "Aktivní / trial tarify",
      href: "/admin/workspaces",
      icon: Wallet,
      tone: "emerald" as const,
    },
    {
      label: "Kredity",
      value: `${formatInt(stats.creditsUsedSum)}`,
      hint: `${creditsPct} % z ${formatInt(stats.creditsTotalSum)} celkem`,
      href: "/admin/workspaces",
      icon: Coins,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="sk-admin__page sk-admin__page--overview">
      <AdminPageHead
        title="Přehled"
        meta="Platforma Sklyvo · interní konzole"
      />

      <section
        className="sk-admin__stat-grid sk-admin__stat-grid--primary sk-admin__stat-grid--quad"
        aria-label="Metriky"
      >
        {primary.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`sk-admin__stat sk-admin__stat--${card.tone}`}
            >
              <div className="sk-admin__stat-top">
                <span className="sk-admin__stat-icon" aria-hidden>
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <p className="sk-admin__stat-label">{card.label}</p>
              </div>
              <p className="sk-admin__stat-value">{card.value}</p>
              <p className="sk-admin__stat-hint">{card.hint}</p>
            </Link>
          );
        })}
      </section>

      <div className="sk-admin__overview-split">
        <section className="sk-admin__panel sk-admin__panel--fill">
          <div className="sk-admin__panel-head">
            <div>
              <h2 className="sk-admin__h2">Poslední workspaces</h2>
              <p className="sk-admin__panel-sub">
                {workspaces.length} nedávno vytvořených
              </p>
            </div>
            <Link href="/admin/workspaces" className="sk-admin__text-link">
              Všechny
            </Link>
          </div>
          <div className="sk-admin__table-wrap sk-admin__table-wrap--rows sk-admin__table-wrap--inset">
            <table className="sk-admin__table sk-admin__table--rows sk-admin__table--dense">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Tarif</th>
                  <th>Platba</th>
                  <th>Členové</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.slice(0, 8).map((workspace) => {
                  const pay = paymentBadge(workspace.subscriptionStatus);
                  return (
                    <tr key={workspace.id}>
                      <td>
                        <Link
                          href={`/admin/workspaces/${workspace.id}`}
                          className="sk-admin__link"
                        >
                          <span className="font-semibold">{workspace.name}</span>
                          {workspace.companyName ? (
                            <span className="sk-admin__muted block text-xs">
                              {workspace.companyName}
                            </span>
                          ) : null}
                        </Link>
                      </td>
                      <td>{membershipLabel(workspace.planTier)}</td>
                      <td>
                        <span
                          className={`sk-admin__pill sk-admin__pill--${pay.tone}`}
                        >
                          {pay.label}
                        </span>
                      </td>
                      <td className="tabular-nums">{workspace._count.members}</td>
                    </tr>
                  );
                })}
                {workspaces.length === 0 ? (
                  <tr className="sk-admin__table-empty">
                    <td colSpan={4} className="sk-admin__empty">
                      Zatím žádný workspace.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <div className="sk-admin__overview-stack">
          <section className="sk-admin__panel">
            <div className="sk-admin__panel-head">
              <div>
                <h2 className="sk-admin__h2">Finance 30d</h2>
                <p className="sk-admin__panel-sub">Stripe · platforma</p>
              </div>
              <Link href="/admin/finance" className="sk-admin__text-link">
                Detail
              </Link>
            </div>
            <div className="sk-admin__stat-grid sk-admin__stat-grid--billing">
              <div className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static">
                <p className="sk-admin__stat-label">Obrat</p>
                <p className="sk-admin__stat-value">
                  {formatMoney(billing.revenueCents30d, billing.currency)}
                </p>
              </div>
              <div className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static">
                <p className="sk-admin__stat-label">Náklady</p>
                <p className="sk-admin__stat-value">
                  {formatMoney(billing.costsCents30d, billing.currency)}
                </p>
              </div>
              <div className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static">
                <p className="sk-admin__stat-label">Zisk</p>
                <p className="sk-admin__stat-value">
                  {formatMoney(billing.profitCents30d, billing.currency)}
                </p>
              </div>
            </div>
            <div className="sk-admin__status-row">
              <span
                className={`sk-admin__pill ${billing.stripeOk ? "sk-admin__pill--ok" : "sk-admin__pill--bad"}`}
              >
                {billing.stripeOk ? "Stripe OK" : "Stripe chyba"}
              </span>
              <span
                className={`sk-admin__pill ${fakturoid.configured ? "sk-admin__pill--ok" : "sk-admin__pill--trial"}`}
              >
                Fakturoid {fakturoid.configured ? "OK" : "—"}
              </span>
              <span className="sk-admin__pill sk-admin__pill--muted">
                {billing.paidCount} paid · {billing.openCount} open
              </span>
            </div>
          </section>

          <section className="sk-admin__panel">
            <div className="sk-admin__panel-head">
              <div>
                <h2 className="sk-admin__h2">Růst 7 dní</h2>
                <p className="sk-admin__panel-sub">Nové registrace</p>
              </div>
            </div>
            <div className="sk-admin__stat-grid sk-admin__stat-grid--growth">
              <Link
                href="/admin/users"
                className="sk-admin__stat sk-admin__stat--compact"
              >
                <div className="sk-admin__stat-top">
                  <span className="sk-admin__stat-icon" aria-hidden>
                    <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <p className="sk-admin__stat-label">Users 7d</p>
                </div>
                <p className="sk-admin__stat-value">
                  {formatInt(stats.newUsers7d)}
                </p>
              </Link>
              <Link
                href="/admin/workspaces"
                className="sk-admin__stat sk-admin__stat--compact"
              >
                <div className="sk-admin__stat-top">
                  <span className="sk-admin__stat-icon" aria-hidden>
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <p className="sk-admin__stat-label">WS 7d</p>
                </div>
                <p className="sk-admin__stat-value">
                  {formatInt(stats.newWorkspaces7d)}
                </p>
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="sk-admin__overview-split">
        <section className="sk-admin__panel sk-admin__panel--fill">
          <div className="sk-admin__panel-head">
            <div>
              <h2 className="sk-admin__h2">Poslední uživatelé</h2>
              <p className="sk-admin__panel-sub">Účty napříč platformou</p>
            </div>
            <Link href="/admin/users" className="sk-admin__text-link">
              Všechny
            </Link>
          </div>
          <div className="sk-admin__table-wrap sk-admin__table-wrap--rows sk-admin__table-wrap--inset">
            <table className="sk-admin__table sk-admin__table--rows sk-admin__table--dense">
              <thead>
                <tr>
                  <th>Uživatel</th>
                  <th>Workspace</th>
                  <th>Od</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 6).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="sk-admin__link"
                      >
                        <span className="font-semibold">
                          {user.name || "—"}
                        </span>
                        <span className="sk-admin__muted block text-xs">
                          {user.email}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/admin/workspaces/${user.workspace.id}`}
                        className="sk-admin__link"
                      >
                        {user.workspace.name}
                      </Link>
                    </td>
                    <td className="sk-admin__muted text-xs tabular-nums">
                      {formatAdminDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr className="sk-admin__table-empty">
                    <td colSpan={3} className="sk-admin__empty">
                      Zatím žádní uživatelé.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sk-admin__panel sk-admin__panel--fill">
          <div className="sk-admin__panel-head">
            <div>
              <h2 className="sk-admin__h2">Audit log</h2>
              <p className="sk-admin__panel-sub">Poslední admin akce</p>
            </div>
            <Link href="/admin/audit" className="sk-admin__text-link">
              Celý log
            </Link>
          </div>
          <div className="sk-admin__audit-feed">
            {audit.length === 0 ? (
              <p className="sk-admin__feed-empty">
                <Activity className="h-4 w-4" aria-hidden />
                Zatím žádné záznamy.
              </p>
            ) : (
              audit.map((log) => (
                <div key={log.id} className="sk-admin__audit-item">
                  <div className="sk-admin__audit-main">
                    <span className="sk-admin__audit-action">{log.action}</span>
                    <span className="sk-admin__audit-target">
                      {log.targetType}:{log.targetId.slice(0, 8)}…
                    </span>
                  </div>
                  <div className="sk-admin__audit-meta">
                    <span>{log.actorEmail}</span>
                    <span>
                      {log.createdAt.toLocaleString("cs-CZ", {
                        day: "numeric",
                        month: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
