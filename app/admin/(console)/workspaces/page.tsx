import Link from "next/link";
import { listAdminWorkspaces } from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";
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
    <div className="sk-admin__page sk-admin__page--list">
      <AdminPageHead
        title="Workspaces"
        meta={`${workspaces.length} záznamů`}
        actions={
          <AdminSearchForm placeholder="Hledat…" defaultValue={q ?? ""} />
        }
      />

      <div className="sk-admin__table-wrap sk-admin__table-wrap--rows sk-admin__table-wrap--scroll">
        <table className="sk-admin__table sk-admin__table--rows sk-admin__table--dense">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Tarif</th>
              <th>Platba</th>
              <th>Členové</th>
              <th>Leady</th>
              <th>Od</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => {
              const pay = paymentBadge(w.subscriptionStatus);
              return (
                <tr key={w.id}>
                  <td>
                    <Link href={`/admin/workspaces/${w.id}`} className="sk-admin__link">
                      <span className="font-semibold">{w.name}</span>
                      {w.companyName ? (
                        <span className="sk-admin__muted block text-xs">
                          {w.companyName}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td>{membershipLabel(w.planTier)}</td>
                  <td>
                    <span className={`sk-admin__pill sk-admin__pill--${pay.tone}`}>
                      {pay.label}
                    </span>
                  </td>
                  <td>{w._count.members}</td>
                  <td>
                    {w._count.leads}
                    <span className="sk-admin__muted block text-[11px]">
                      {w.emailsSent} sent
                    </span>
                  </td>
                  <td className="sk-admin__muted text-xs tabular-nums">
                    {formatAdminDate(w.createdAt)}
                  </td>
                </tr>
              );
            })}
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
