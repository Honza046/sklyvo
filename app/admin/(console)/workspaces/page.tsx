import Link from "next/link";
import { listAdminWorkspaces } from "@/app/actions/platform-admin";
import { AdminSearchForm } from "@/components/admin/admin-search-form";

export const dynamic = "force-dynamic";

export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const workspaces = await listAdminWorkspaces(q);

  return (
    <div className="sk-admin__page">
      <header className="sk-admin__page-head sk-admin__page-head--row">
        <div>
          <h1 className="sk-admin__h1">Workspacey</h1>
          <p className="sk-admin__lede">
            Max 100 · name / plan / stripe customer / id
          </p>
        </div>
        <AdminSearchForm
          placeholder="Hledat workspace…"
          defaultValue={q ?? ""}
        />
      </header>

      <div className="sk-admin__table-wrap">
        <table className="sk-admin__table">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Plán</th>
              <th>Kredity</th>
              <th>Členové</th>
              <th>Leady</th>
              <th>Stripe</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w.id}>
                <td>
                  <Link
                    href={`/admin/workspaces/${w.id}`}
                    className="sk-admin__link"
                  >
                    <span className="font-semibold">{w.name}</span>
                    {w.companyName ? (
                      <span className="sk-admin__muted block text-xs">
                        {w.companyName}
                      </span>
                    ) : null}
                  </Link>
                </td>
                <td>
                  {w.planTier}
                  <span className="sk-admin__muted block text-xs">
                    {w.subscriptionStatus}
                  </span>
                </td>
                <td>
                  {w.creditsUsed} / {w.creditsTotal}
                </td>
                <td>{w._count.members}</td>
                <td>
                  {w._count.leads}
                  <span className="sk-admin__muted block text-xs">
                    sent {w.emailsSent}
                  </span>
                </td>
                <td className="font-mono text-xs">
                  {w.stripeCustomerId ? (
                    <a
                      href={`https://dashboard.stripe.com/customers/${w.stripeCustomerId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="sk-admin__link"
                    >
                      {w.stripeCustomerId.slice(0, 14)}…
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {workspaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="sk-admin__empty">
                  Nic nenalezeno.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
