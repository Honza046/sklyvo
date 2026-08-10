import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/app/actions/platform-admin";
import { UserAdminActions } from "@/components/admin/user-admin-actions";

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
    <div className="sk-admin__page">
      <header className="sk-admin__page-head">
        <Link href="/admin/users" className="sk-admin__back">
          ← Uživatelé
        </Link>
        <h1 className="sk-admin__h1">{user.name || user.email}</h1>
        <p className="sk-admin__lede">{user.email}</p>
      </header>

      <div className="sk-admin__cards">
        <section className="sk-admin__card">
          <h2 className="sk-admin__h2">Profil</h2>
          <dl className="sk-admin__dl">
            <div>
              <dt>ID</dt>
              <dd className="font-mono text-xs">{user.id}</dd>
            </div>
            <div>
              <dt>Role (workspace)</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>2FA</dt>
              <dd>{user.totpEnabled ? "Zapnuto" : "Vypnuto"}</dd>
            </div>
            <div>
              <dt>Stav</dt>
              <dd>
                {user.disabledAt
                  ? `Disabled od ${user.disabledAt.toLocaleString("cs-CZ")}`
                  : "Aktivní"}
              </dd>
            </div>
            <div>
              <dt>Vytvořen</dt>
              <dd>{user.createdAt.toLocaleString("cs-CZ")}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>
                <Link
                  href={`/admin/workspaces/${user.workspace.id}`}
                  className="sk-admin__link"
                >
                  {user.workspace.name} ({user.workspace.planTier})
                </Link>
              </dd>
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
