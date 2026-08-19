import Link from "next/link";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";

/** Outside the gated admin layout — no requirePlatformAdmin. */
export default function AdminForbiddenPage() {
  return (
    <div className="sklyvo-app sk-admin-login">
      <div className="sk-admin-login__card sk-admin-login__card--forbidden">
        <div className="sk-admin-login__brand">
          <SklyvoMark size={40} />
          <div>
            <p className="sk-admin-login__eyebrow">Sklyvo Admin</p>
            <h1 className="sk-admin-login__title">Nemáš přístup</h1>
          </div>
        </div>
        <p className="sk-admin-login__lede">
          Tato konzole je jen pro správce platformy. Tvůj účet není v allowlistu{" "}
          <code className="font-mono text-xs">PLATFORM_ADMIN_EMAILS</code>.
        </p>
        <div className="sk-admin-login__actions">
          <Link href="/admin/login" className="sk-btn sk-btn--primary sk-btn--md">
            Admin přihlášení
          </Link>
          <Link href="/" className="sk-btn sk-btn--secondary sk-btn--md">
            Zpět do appky
          </Link>
        </div>
      </div>
    </div>
  );
}
