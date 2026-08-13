import { notFound } from "next/navigation";
import { getAdminUser } from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";
import { UserAdminActions } from "@/components/admin/user-admin-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUser(id);
  if (!user) notFound();

  return (
    <div className="sk-admin__page sk-admin__page--detail">
      <AdminPageHead
        title={user.name || user.email}
        backHref="/admin/users"
        backLabel="Uživatelé"
        meta={user.email}
      />

      <div className="sk-admin__detail-grid">
        <section className="sk-admin__card">
          <h2 className="sk-admin__h2">Profil</h2>
          <dl className="sk-admin__dl sk-admin__dl--compact">
            <div>
              <dt>Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>2FA</dt>
              <dd>{user.totpEnabled ? "Ano" : "Ne"}</dd>
            </div>
            <div>
              <dt>Stav</dt>
              <dd>{user.disabledAt ? "Disabled" : "Aktivní"}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>
                <Link
                  href={`/admin/workspaces/${user.workspace.id}`}
                  className="sk-admin__link"
                >
                  {user.workspace.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd className="font-mono text-[11px]">{user.id}</dd>
            </div>
          </dl>
        </section>

        <section className="sk-admin__card">
          <h2 className="sk-admin__h2">Akce</h2>
          <UserAdminActions
            userId={user.id}
            disabled={Boolean(user.disabledAt)}
            email={user.email}
          />
        </section>
      </div>
    </div>
  );
}
