import Link from "next/link";
import { listAdminUsers } from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";
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
    <div className="sk-admin__page sk-admin__page--list">
      <AdminPageHead
        title="Uživatelé"
        meta={`${users.length} záznamů`}
        actions={
          <AdminSearchForm placeholder="Hledat…" defaultValue={q ?? ""} />
        }
      />

      <div className="sk-admin__table-wrap sk-admin__table-wrap--rows sk-admin__table-wrap--scroll">
        <table className="sk-admin__table sk-admin__table--rows sk-admin__table--dense">
          <thead>
            <tr>
              <th>Uživatel</th>
              <th>Workspace</th>
              <th>Tarif</th>
              <th>Platba</th>
              <th>Od</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const pay = paymentBadge(u.workspace.subscriptionStatus);
              return (
                <tr key={u.id}>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="sk-admin__link">
                      <span className="font-semibold">{u.name || "—"}</span>
                      <span className="sk-admin__muted block text-xs">{u.email}</span>
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
                  <td>{membershipLabel(u.workspace.planTier)}</td>
                  <td>
                    <span className={`sk-admin__pill sk-admin__pill--${pay.tone}`}>
                      {pay.label}
                    </span>
                  </td>
                  <td className="sk-admin__muted text-xs tabular-nums">
                    {formatAdminDate(u.workspace.createdAt)}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="sk-admin__empty">
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
