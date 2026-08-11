import Link from "next/link";
import { listAdminUsers } from "@/app/actions/platform-admin";
import { AdminSearchForm } from "@/components/admin/admin-search-form";
import {
  formatAdminDate,
  membershipLabel,
  paymentBadge,
} from "@/lib/admin-billing-display";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listAdminUsers(q);

  return (
    <div className="sk-admin__page">
      <header className="sk-admin__page-head sk-admin__page-head--row">
        <div>
          <h1 className="sk-admin__h1">Uživatelé</h1>
          <p className="sk-admin__lede">
            Max 100 výsledků · search e-mail / jméno / id
          </p>
        </div>
        <AdminSearchForm
          placeholder="Hledat uživatele…"
          defaultValue={q ?? ""}
        />
      </header>

      <div className="sk-admin__table-wrap sk-admin__table-wrap--rows">
        <table className="sk-admin__table sk-admin__table--rows">
          <thead>
            <tr>
              <th>Uživatel</th>
              <th>Workspace</th>
              <th>Členství</th>
              <th>Platba</th>
              <th>Od</th>
              <th>Další platba</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const pay = paymentBadge(u.workspace.subscriptionStatus);
              const nextPay =
                u.workspace.subscriptionPeriodEnd ?? u.workspace.trialEndsAt;
              return (
                <tr key={u.id}>
                  <td>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="sk-admin__link"
                    >
                      <span className="font-semibold">
                        {u.name || "—"}
                      </span>
                      <span className="sk-admin__muted block text-xs">
                        {u.email}
                      </span>
                      <span className="sk-admin__muted block text-[10px] font-semibold uppercase tracking-wide">
                        {u.role}
                        {u.disabledAt ? " · disabled" : null}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/admin/workspaces/${u.workspace.id}`}
                      className="sk-admin__link"
                    >
                      {u.workspace.name}
                    </Link>
                  </td>
                  <td>
                    <span className="font-semibold">
                      {membershipLabel(u.workspace.planTier)}
                    </span>
                  </td>
                  <td>
                    <span className={`sk-admin__pill sk-admin__pill--${pay.tone}`}>
                      {pay.label}
                    </span>
                  </td>
                  <td className="sk-admin__muted text-xs tabular-nums">
                    {formatAdminDate(u.workspace.createdAt)}
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
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr className="sk-admin__table-empty">
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
