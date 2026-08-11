import Link from "next/link";
import { listAdminWorkspaces } from "@/app/actions/platform-admin";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import {
  formatAdminDate,
  membershipLabel,
  paymentBadge,
} from "@/lib/admin-billing-display";

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
          <h1 className="sk-admin__h1">Workspaces</h1>
          <p className="sk-admin__lede">
            Max 100 · name / plan / stripe customer / id
          </p>
        </div>
        <AdminSearchForm
          placeholder="Hledat workspace…"
          defaultValue={q ?? ""}
        />
      </header>

      <div className="sk-admin__table-wrap sk-admin__table-wrap--rows">
        <table className="sk-admin__table sk-admin__table--rows">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Členství</th>
              <th>Platba</th>
              <th>Od</th>
              <th>Další platba</th>
              <th>Členové</th>
              <th>Leady</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => {
              const pay = paymentBadge(w.subscriptionStatus);
              const nextPay = w.subscriptionPeriodEnd ?? w.trialEndsAt;
              return (
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
                    <span className="font-semibold">
                      {membershipLabel(w.planTier)}
                    </span>
                  </td>
                  <td>
                    <span className={`sk-admin__pill sk-admin__pill--${pay.tone}`}>
                      {pay.label}
                    </span>
                  </td>
                  <td className="sk-admin__muted text-xs tabular-nums">
                    {formatAdminDate(w.createdAt)}
                  </td>
                  <td className="text-xs tabular-nums">
                    {nextPay ? (
                      <span className="font-medium">
                        {formatAdminDate(nextPay)}
                      </span>
                    ) : (
                      <span className="sk-admin__muted">—</span>
                    )}
                  </td>
                  <td>{w._count.members}</td>
                  <td>
                    {w._count.leads}
                    <span className="sk-admin__muted block text-xs">
                      sent {w.emailsSent}
                    </span>
                  </td>
                </tr>
              );
            })}
            {workspaces.length === 0 ? (
              <tr className="sk-admin__table-empty">
                <td colSpan={7} className="sk-admin__empty">
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
