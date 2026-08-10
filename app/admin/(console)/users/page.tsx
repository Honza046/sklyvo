import Link from "next/link";
import { listAdminUsers } from "@/app/actions/platform-admin";
import { AdminSearchForm } from "@/components/admin/admin-search-form";

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
          <p className="sk-admin__lede">Max 100 výsledků · search e-mail / jméno / id</p>
        </div>
        <AdminSearchForm placeholder="Hledat uživatele…" defaultValue={q ?? ""} />
      </header>

      <div className="sk-admin__table-wrap">
        <table className="sk-admin__table">
          <thead>
            <tr>
              <th>Uživatel</th>
              <th>Role</th>
              <th>Workspace</th>
              <th>2FA</th>
              <th>Stav</th>
              <th>Vytvořen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/admin/users/${u.id}`} className="sk-admin__link">
                    <span className="font-semibold">{u.name || "—"}</span>
                    <span className="sk-admin__muted block text-xs">{u.email}</span>
                  </Link>
                </td>
                <td>{u.role}</td>
                <td>
                  <Link
                    href={`/admin/workspaces/${u.workspace.id}`}
                    className="sk-admin__link"
                  >
                    {u.workspace.name}
                    <span className="sk-admin__muted block text-xs">
                      {u.workspace.planTier} · {u.workspace.subscriptionStatus}
                    </span>
                  </Link>
                </td>
                <td>{u.totpEnabled ? "Ano" : "Ne"}</td>
                <td>
                  {u.disabledAt ? (
                    <span className="sk-admin__pill sk-admin__pill--bad">
                      Disabled
                    </span>
                  ) : (
                    <span className="sk-admin__pill sk-admin__pill--ok">OK</span>
                  )}
                </td>
                <td className="sk-admin__muted text-xs">
                  {u.createdAt.toLocaleString("cs-CZ")}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
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
