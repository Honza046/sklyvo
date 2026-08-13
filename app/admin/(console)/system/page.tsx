import {
  getAdminBillingOverview,
  getAdminDashboardStats,
  getPlatformFakturoidStatus,
} from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";
import { getPlatformAdminEmails } from "@/lib/platform-admin";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const [stats, billing, fakturoid] = await Promise.all([
    getAdminDashboardStats(),
    getAdminBillingOverview(),
    getPlatformFakturoidStatus(),
  ]);
  const admins = getPlatformAdminEmails();

  const rows = [
    {
      label: "Stripe",
      value: billing.stripeOk ? "Připojeno" : billing.stripeError || "Chyba",
      tone: billing.stripeOk ? "ok" : "bad",
    },
    {
      label: "Fakturoid",
      value: fakturoid.label,
      tone: fakturoid.configured ? "ok" : "trial",
    },
    {
      label: "Admin přístup",
      value: `${admins.length} e-mail${admins.length === 1 ? "" : "ů"}`,
      tone: admins.length > 0 ? "ok" : "bad",
    },
    {
      label: "Uživatelé",
      value: String(stats.usersTotal),
      tone: "muted",
    },
    {
      label: "Workspaces",
      value: String(stats.workspacesTotal),
      tone: "muted",
    },
    {
      label: "Crons",
      value: "Vercel cron",
      tone: "muted",
    },
  ] as const;

  return (
    <div className="sk-admin__page sk-admin__page--system">
      <AdminPageHead title="Systém" meta="Stav platformy" />

      <div className="sk-admin__system-grid">
        {rows.map((row) => (
          <div key={row.label} className="sk-admin__system-card">
            <p className="sk-admin__system-label">{row.label}</p>
            <p className="sk-admin__system-value">{row.value}</p>
            <span className={`sk-admin__pill sk-admin__pill--${row.tone}`}>
              {row.tone === "ok" ? "OK" : row.tone === "bad" ? "!" : "—"}
            </span>
          </div>
        ))}
      </div>

      {admins.length > 0 ? (
        <section className="sk-admin__panel">
          <div className="sk-admin__panel-head">
            <h2 className="sk-admin__h2">PLATFORM_ADMIN_EMAILS</h2>
          </div>
          <ul className="sk-admin__list sk-admin__list--compact">
            {admins.map((email) => (
              <li key={email} className="font-mono text-xs">
                {email}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
