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
      label: "Placené / trial",
      value: formatInt(stats.paidWorkspaces),
      href: "/admin/workspaces",
      icon: Wallet,
      tone: "emerald" as const,
    },
  ];

  const growth = [
    {
      label: "Noví users · 7 dní",
      value: formatInt(stats.newUsers7d),
      href: "/admin/users",
      icon: UserPlus,
    },
    {
      label: "Nové workspaces · 7 dní",
      value: formatInt(stats.newWorkspaces7d),
      href: "/admin/workspaces",
      icon: Sparkles,
    },
  ];

  const financeCards = [
    {
      label: "Obrat",
      value: formatMoney(billing.revenueCents30d, billing.currency),
      hint: "30 dní · Stripe",
    },
    {
      label: "Náklady",
      value: formatMoney(billing.costsCents30d, billing.currency),
      hint: "Fixní + Stripe poplatky",
    },
    {
      label: "Čistý zisk",
      value: formatMoney(billing.profitCents30d, billing.currency),
      hint: "Obrat − náklady",
    },
  ];

  return (
    <div className="sk-admin__page sk-admin__page--overview">
      <header className="sk-admin__page-head sk-admin__page-head--compact">
        <div>
          <p className="sk-admin__eyebrow">Platforma</p>
          <h1 className="sk-admin__h1">Přehled</h1>
        </div>
        <p className="sk-admin__lede sk-admin__lede--compact">
          Stav platformy na jedné obrazovce
        </p>
      </header>

      <section
        className="sk-admin__stat-grid sk-admin__stat-grid--primary"
        aria-label="Základní metriky"
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
            </Link>
          );
        })}
      </section>

      <div className="sk-admin__overview-row">
        <section className="sk-admin__panel" aria-label="Růst za 7 dní">
          <div className="sk-admin__panel-head">
            <div>
              <h2 className="sk-admin__h2">Posledních 7 dní</h2>
              <p className="sk-admin__panel-sub">Nové registrace</p>
            </div>
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

        <section className="sk-admin__panel" aria-label="Finance">
          <div className="sk-admin__panel-head">
            <div>
              <h2 className="sk-admin__h2">Finance</h2>
              <p className="sk-admin__panel-sub">
                {billing.stripeOk ? "30 dní · Stripe" : "Stripe nedostupné"}
              </p>
            </div>
            <Link href="/admin/finance" className="sk-admin__text-link">
              Detail
            </Link>
          </div>
          <div className="sk-admin__stat-grid sk-admin__stat-grid--billing">
            {financeCards.map((card) => (
              <div
                key={card.label}
                className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static"
              >
                <p className="sk-admin__stat-label">{card.label}</p>
                <p className="sk-admin__stat-value">{card.value}</p>
                <p className="sk-admin__stat-hint">{card.hint}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
