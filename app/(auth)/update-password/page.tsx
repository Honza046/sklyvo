"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ResetPasswordForm } from "@/components/sklyvo/reset-password-form";
import { StandaloneAuthShell } from "@/components/sklyvo/standalone-auth-shell";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    const allow = () => {
      if (!cancelled) setSessionOk(true);
    };
    const deny = () => {
      if (!cancelled) router.replace("/login");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) allow();
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) allow();
    });

    const t = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session) allow();
        else deny();
      });
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      subscription.unsubscribe();
    };
  }, [router]);

  if (sessionOk === null) {
    return (
      <StandaloneAuthShell>
        <p className="sklyvo-card__sub" style={{ textAlign: "center" }}>
          Ověřuji relaci…
        </p>
      </StandaloneAuthShell>
    );
  }

  return (
    <StandaloneAuthShell>
      <ResetPasswordForm
        onSubmit={async (password) => {
          const supabase = createSupabaseBrowserClient();
          const { error } = await supabase.auth.updateUser({ password });
          if (error) {
            return `Chyba při aktualizaci hesla: ${error.message}`;
          }
          window.setTimeout(() => router.push("/login"), 1200);
          return null;
        }}
        submitLabel="Uložit nové heslo"
      />
    </StandaloneAuthShell>
  );
}
