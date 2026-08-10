import Link from "next/link";
import { getAdminDashboardStats } from "@/app/actions/platform-admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const cards = [
    { label: "Uživatelé", value: stats.usersTotal, href: "/admin/users" },
    {
      label: "Workspacey",
      value: stats.workspacesTotal,
      href: "/admin/workspaces",
    },
    {
      label: "Placené / trial",
      value: stats.paidWorkspaces,
      href: "/admin/workspaces",
    },
    {
      label: "Noví users (7 dní)",
      value: stats.newUsers7d,
      href: "/admin/users",
    },
    {
      label: "Nové workspacey (7 dní)",
      value: stats.newWorkspaces7d,
      href: "/admin/workspaces",
    },
    {
      label: "Kredity used / total",
      value: `${stats.creditsUsedSum} / ${stats.creditsTotalSum}`,
      href: "/admin/workspaces",
    },
  ];

  return (
    <div className="sk-admin__page">
      <header className="sk-admin__page-head">
        <h1 className="sk-admin__h1">Přehled</h1>
        <p className="sk-admin__lede">
          Interní ops konzole. Cross-tenant data bez tajných tokenů.
        </p>
      </header>

      <div className="sk-admin__stat-grid">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="sk-admin__stat">
            <p className="sk-admin__stat-label">{card.label}</p>
            <p className="sk-admin__stat-value">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
