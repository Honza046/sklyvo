"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions/auth";
import { ResetPasswordForm } from "@/components/sklyvo/reset-password-form";
import { StandaloneAuthShell } from "@/components/sklyvo/standalone-auth-shell";

function ObnovaHeslaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();

  return (
    <ResetPasswordForm
      invalidToken={!token}
      onSubmit={async (password) => {
        if (!token) {
          return "Chybí ověřovací token. Vyžádejte si nový odkaz.";
        }
        const result = await resetPassword(token, password);
        if ("error" in result && result.error) {
          return result.error;
        }
        window.setTimeout(() => router.replace("/login"), 1200);
        return null;
      }}
    />
  );
}

export default function ObnovaHeslaPage() {
  return (
    <StandaloneAuthShell>
      <Suspense
        fallback={
          <p className="sklyvo-card__sub" style={{ textAlign: "center" }}>
            Načítám…
          </p>
        }
      >
        <ObnovaHeslaContent />
      </Suspense>
    </StandaloneAuthShell>
  );
}
