"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  loginPlatformAdmin,
} from "@/app/actions/platform-admin";
import {
  beginLoginPasskey,
  finishLoginPasskey,
  verifyLoginTotp,
} from "@/app/actions/two-factor";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TwoFactorMethods = ("totp" | "passkey")[];

export function AdminLoginScreen() {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const totpId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [twoFactorMethods, setTwoFactorMethods] =
    useState<TwoFactorMethods | null>(null);
  const [twoFactorMode, setTwoFactorMode] = useState<"totp" | "passkey" | null>(
    null,
  );
  const [totpCode, setTotpCode] = useState("");

  async function goAdmin() {
    router.replace("/admin");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await loginPlatformAdmin(formData);
      if ("error" in result && result.error) {
        setErrorMessage(result.error);
        return;
      }
      if ("requires2fa" in result && result.requires2fa) {
        setTwoFactorMethods(result.methods);
        setTwoFactorMode(result.methods.includes("totp") ? "totp" : "passkey");
        return;
      }
      await goAdmin();
    } catch {
      setErrorMessage("Přihlášení selhalo. Zkus to znovu.");
    } finally {
      setPending(false);
    }
  }

  async function handleTotpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);
    try {
      const result = await verifyLoginTotp(totpCode.trim());
      if ("error" in result && result.error) {
        setErrorMessage(result.error);
        return;
      }
      await goAdmin();
    } catch {
      setErrorMessage("Ověření kódu selhalo.");
    } finally {
      setPending(false);
    }
  }

  async function handlePasskey() {
    setErrorMessage("");
    setPending(true);
    try {
      const begin = await beginLoginPasskey();
      if ("error" in begin) {
        setErrorMessage(begin.error);
        return;
      }
      const credential = await startAuthentication({
        optionsJSON: begin.options,
      });
      const finish = await finishLoginPasskey({ response: credential });
      if ("error" in finish) {
        setErrorMessage(finish.error);
        return;
      }
      await goAdmin();
    } catch {
      setErrorMessage("Passkey se nepodařilo ověřit.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sklyvo-app sk-admin-login">
      <div className="sk-admin-login__card">
        <div className="sk-admin-login__brand">
          <SklyvoMark size={40} />
          <div>
            <p className="sk-admin-login__eyebrow">Interní konzole</p>
            <h1 className="sk-admin-login__title">Sklyvo Admin</h1>
          </div>
        </div>

        <p className="sk-admin-login__lede">
          Oddělené přihlášení pro správu zákazníků a workspaceů (CTO).
        </p>

        {errorMessage ? (
          <p className="sk-admin-login__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {!twoFactorMethods ? (
          <form className="sk-admin-login__form" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor={emailId}>E-mail</Label>
              <Input
                id={emailId}
                name="email"
                type="email"
                autoComplete="username"
                required
                className="h-11 rounded-xl"
                placeholder="jan@…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={passwordId}>Heslo</Label>
              <div className="relative">
                <Input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="h-11 rounded-xl pr-20"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Skrýt" : "Zobrazit"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="sk-btn sk-btn--primary sk-btn--md w-full"
            >
              {pending ? "Přihlašuji…" : "Vstup do Admin"}
            </button>
          </form>
        ) : (
          <div className="sk-admin-login__form">
            {twoFactorMode === "totp" ? (
              <form onSubmit={handleTotpSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={totpId}>Kód z authenticatoru</Label>
                  <Input
                    id={totpId}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="h-11 rounded-xl tracking-[0.2em]"
                    placeholder="000000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={pending}
                  className="sk-btn sk-btn--primary sk-btn--md w-full"
                >
                  {pending ? "Ověřuji…" : "Potvrdit a vstoupit"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => void handlePasskey()}
                className="sk-btn sk-btn--primary sk-btn--md w-full"
              >
                {pending ? "Čekám na passkey…" : "Pokračovat passkey"}
              </button>
            )}

            {twoFactorMethods.length > 1 ? (
              <button
                type="button"
                className="mt-3 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                onClick={() =>
                  setTwoFactorMode((m) => (m === "totp" ? "passkey" : "totp"))
                }
              >
                Použít {twoFactorMode === "totp" ? "passkey" : "authenticator"}
              </button>
            ) : null}
          </div>
        )}

        <p className="sk-admin-login__foot">
          <Link href="/login">← Běžné přihlášení do appky</Link>
        </p>
      </div>
    </div>
  );
}
