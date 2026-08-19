import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { AdminNav } from "@/components/admin/admin-nav";
import { clearSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function logoutAdmin() {
  "use server";
  await clearSession();
  redirect("/admin/login");
}

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePlatformAdmin();

  return (
    <div className="sklyvo-app sk-admin sk-admin--shell">
      <aside className="sk-admin__sidebar shrink-0">
        <div className="sk-admin__sidebar-brand">
          <SklyvoMark size={30} interactive={false} />
          <div className="min-w-0">
            <p className="sk-admin__brand-title">Sklyvo Admin</p>
            <p className="sk-admin__brand-sub truncate">{actor.email}</p>
          </div>
        </div>

        <AdminNav variant="sidebar" />

        <div className="sk-admin__sidebar-foot">
          <Link
            href="/"
            className="sk-admin__sidebar-action"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Do appky
          </Link>
          <form action={logoutAdmin}>
            <button type="submit" className="sk-admin__sidebar-action sk-admin__sidebar-action--muted">
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Odhlásit
            </button>
          </form>
        </div>
      </aside>

      <div className="sk-admin__content min-h-0 min-w-0 flex-1">
        <main className="sk-admin__main">{children}</main>
      </div>
    </div>
  );
}
