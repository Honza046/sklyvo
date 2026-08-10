import Link from "next/link";

/** Outside the gated admin layout — no requirePlatformAdmin. */
export default function AdminForbiddenPage() {
  return (
    <div className="sklyvo-app flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Sklyvo Ops
        </p>
        <h1 className="mt-2 text-xl font-bold tracking-tight">
          Nemáš přístup k Ops
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tento účet není v allowlistu. Přihlas se přes Ops login účtem z{" "}
          <code className="text-xs">PLATFORM_ADMIN_EMAILS</code>, nebo na localu
          zapni <code className="text-xs">PLATFORM_ADMIN_LOCAL=1</code>.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/admin/login" className="sk-btn sk-btn--primary sk-btn--md">
            Ops přihlášení
          </Link>
          <Link href="/" className="sk-btn sk-btn--secondary sk-btn--md">
            Zpět do appky
          </Link>
        </div>
      </div>
    </div>
  );
}
