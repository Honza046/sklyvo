import Link from "next/link";
import {
  Building2,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  getAdminBillingOverview,
  getAdminDashboardStats,
} from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";

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
  const [stats, billing] = await Promise.all([
    getAdminDashboardStats(),
    getAdminBillingOverview(),
  ]);

  const primary = [
    {
      label: "Uživatelé",
      value: formatInt(stats.usersTotal),
      href: "/admin/users",
      icon: Users,
      tone: "blue" as const,
    },
    {
      label: "Workspaces",
      value: formatInt(stats.workspacesTotal),
      href: "/admin/workspaces",
      icon: Building2,
      tone: "slate" as const,
    },
    {
      label: "Placené",
      value: formatInt(stats.paidWorkspaces),
      href: "/admin/workspaces",
      icon: Wallet,
      tone: "emerald" as const,
    },
  ];

  const growth = [
    {
      label: "Users 7d",
      value: formatInt(stats.newUsers7d),
      href: "/admin/users",
      icon: UserPlus,
    },
    {
      label: "WS 7d",
      value: formatInt(stats.newWorkspaces7d),
      href: "/admin/workspaces",
      icon: Sparkles,
    },
  ];

  return (
    <div className="sk-admin__page sk-admin__page--overview">
      <AdminPageHead title="Přehled" />

      <section className="sk-admin__stat-grid sk-admin__stat-grid--primary" aria-label="Metriky">
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
            </Link>
          );
        })}
      </section>

      <div className="sk-admin__overview-row">
        <section className="sk-admin__panel">
          <div className="sk-admin__panel-head">
            <h2 className="sk-admin__h2">7 dní</h2>
          </div>
          <div className="sk-admin__stat-grid sk-admin__stat-grid--growth">
            {growth.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className="sk-admin__stat sk-admin__stat--compact"
                >
                  <div className="sk-admin__stat-top">
                    <span className="sk-admin__stat-icon" aria-hidden>
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <p className="sk-admin__stat-label">{card.label}</p>
                  </div>
                  <p className="sk-admin__stat-value">{card.value}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="sk-admin__panel">
          <div className="sk-admin__panel-head">
            <h2 className="sk-admin__h2">Finance 30d</h2>
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
        </section>
      </div>
    </div>
  );
}
