"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  setUserDisabled,
  startImpersonation,
} from "@/app/actions/platform-admin";

export function UserAdminActions({
  userId,
  disabled,
  email,
}: {
  userId: string;
  disabled: boolean;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending || busy}
        className="sk-btn sk-btn--secondary sk-btn--md"
        onClick={() => {
          startTransition(async () => {
            const res = await setUserDisabled(userId, !disabled);
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            toast.success(disabled ? "Účet zapnut" : "Účet deaktivován");
            router.refresh();
          });
        }}
      >
        {disabled ? "Zapnout účet" : "Deaktivovat účet"}
      </button>
      <button
        type="button"
        disabled={pending || busy || disabled}
        className="sk-btn sk-btn--primary sk-btn--md"
        onClick={() => {
          setBusy(true);
          void (async () => {
            const res = await startImpersonation(userId);
            setBusy(false);
            if ("error" in res) {
              toast.error(res.error);
              return;
            }
            toast.success(`Přihlášen jako ${email}`);
            router.push("/");
            router.refresh();
          })();
        }}
      >
        Přihlásit se jako
      </button>
    </div>
  );
}
