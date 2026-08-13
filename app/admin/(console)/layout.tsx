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
    <div className="sklyvo-app sk-admin flex h-dvh max-h-dvh flex-col overflow-hidden">
      <header className="sk-admin__top shrink-0">
        <div className="sk-admin__brand">
          <SklyvoMark size={28} interactive={false} />
          <div>
            <p className="sk-admin__brand-title">Sklyvo Admin</p>
            <p className="sk-admin__brand-sub">{actor.email}</p>
          </div>
        </div>
        <AdminNav />
        <div className="sk-admin__top-actions">
          <Link
            href="/"
            className="sk-btn sk-btn--secondary sk-btn--sm sk-admin__app-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Do appky
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="sk-btn sk-btn--ghost sk-btn--sm sk-admin__logout-btn"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Odhlásit
            </button>
          </form>
        </div>
      </header>
      <main className="sk-admin__main min-h-0 flex-1">{children}</main>
      <footer className="sk-admin__foot shrink-0">
        <span>Sklyvo Platform Admin</span>
        <span className="sk-admin__foot-sep">·</span>
        <span>{actor.email}</span>
      </footer>
    </div>
  );
}
