"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getImpersonationBannerState,
  stopImpersonation,
} from "@/app/actions/platform-admin";
import { toast } from "sonner";

type BannerState = {
  active: boolean;
  targetName: string | null;
  targetEmail: string | null;
  actorEmail: string | null;
};

export function ImpersonationBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<BannerState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      setState(null);
      return;
    }
    let cancelled = false;
    void getImpersonationBannerState().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!state?.active) return null;

  const label = state.targetName || state.targetEmail || "uživatel";

  return (
    <div className="sk-admin-impersonation" role="status">
      <p>
        Jsi přihlášen jako <strong>{label}</strong>
        {state.actorEmail ? (
          <span className="opacity-80"> (admin: {state.actorEmail})</span>
        ) : null}
      </p>
      <button
        type="button"
        disabled={pending}
        className="sk-btn sk-btn--secondary sk-btn--sm"
        onClick={() => {
          startTransition(async () => {
            const res = await stopImpersonation();
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            toast.success("Impersonace ukončena");
            router.push("/admin");
            router.refresh();
          });
        }}
      >
        Ukončit
      </button>
    </div>
  );
}
