import Link from "next/link";
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
    <div className="sklyvo-app sk-admin min-h-screen">
      <header className="sk-admin__top">
        <div className="sk-admin__brand">
          <SklyvoMark size={28} />
          <div>
            <p className="sk-admin__brand-title">Sklyvo Ops</p>
            <p className="sk-admin__brand-sub">{actor.email}</p>
          </div>
        </div>
        <AdminNav />
        <div className="sk-admin__top-actions">
          <Link href="/" className="sk-press-btn sk-admin__ghost-btn">
            Do appky
          </Link>
          <form action={logoutAdmin}>
            <button type="submit" className="sk-press-btn sk-admin__ghost-btn">
              Odhlásit
            </button>
          </form>
        </div>
      </header>
      <main className="sk-admin__main">{children}</main>
    </div>
  );
}
