"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { loginUser } from "@/app/actions/auth";
import {
  beginLoginPasskey,
  finishLoginPasskey,
  verifyLoginTotp,
} from "@/app/actions/two-factor";
import { useLanguage } from "@/components/sklyvo/language-provider";
import {
  OAuthProviderButtons,
  useOAuthLogin,
} from "@/components/sklyvo/oauth-providers";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  exchange: "Sociální přihlášení se nepodařilo dokončit. Zkuste to znovu.",
  user: "Nepodařilo se načíst údaje z poskytovatele. Zkuste to prosím znovu.",
  callback: "Chybí autorizační kód. Zkuste přihlášení znovu.",
  provider: "Poskytovatel přihlášení požadavek odmítl. Zkuste to znovu.",
  email:
    "Poskytovatel nevrátil e-mail. V Supabase zapni „Allow users without an email“ a zkus to znovu.",
};

type TwoFactorMethods = ("totp" | "passkey")[];

export function LoginScreen() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [twoFactorMethods, setTwoFactorMethods] = useState<TwoFactorMethods | null>(
    null,
  );
  const [twoFactorMode, setTwoFactorMode] = useState<"totp" | "passkey" | null>(
    null,
  );
  const [totpCode, setTotpCode] = useState("");
  const { oauthPending, handleOAuthLogin } = useOAuthLogin();
  const emailId = useId();
  const passwordId = useId();
  const totpId = useId();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth_error");
    if (oauth && OAUTH_ERROR_MESSAGES[oauth]) {
      setErrorMessage(OAUTH_ERROR_MESSAGES[oauth]);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await loginUser(formData);
      if ("error" in result && result.error) {
        setErrorMessage(result.error);
        return;
      }
      if ("requires2fa" in result && result.requires2fa) {
        setTwoFactorMethods(result.methods);
        setTwoFactorMode(result.methods[0] ?? null);
        return;
      }
      window.location.href = "/";
    } catch {
      setErrorMessage("Přihlášení se nepodařilo. Zkuste to prosím znovu.");
    } finally {
      setPending(false);
    }
  }

  async function handleTotpVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);
    try {
      const result = await verifyLoginTotp(totpCode);
      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }
      window.location.href = "/";
    } catch {
      setErrorMessage("Ověření se nepodařilo. Zkuste to znovu.");
    } finally {
      setPending(false);
    }
  }

  async function handlePasskeyVerify() {
    setErrorMessage("");
    setPending(true);
    try {
      const begin = await beginLoginPasskey();
      if ("error" in begin) {
        setErrorMessage(begin.error);
        return;
      }
      const assertion = await startAuthentication({ optionsJSON: begin.options });
      const finish = await finishLoginPasskey({ response: assertion });
      if ("error" in finish) {
        setErrorMessage(finish.error);
        return;
      }
      window.location.href = "/";
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setErrorMessage("Ověření passkey bylo zrušeno.");
      } else {
        setErrorMessage("Ověření passkey se nepodařilo.");
      }
    } finally {
      setPending(false);
    }
  }

  if (twoFactorMethods) {
    return (
      <>
        <h1 className="sklyvo-card__title">Dvoufázové ověření</h1>
        <p className="sklyvo-card__sub">
          Dokončete přihlášení kódem z authenticatoru nebo passkey.
        </p>

        {twoFactorMethods.length > 1 ? (
          <div className="mb-4 flex gap-2">
            {twoFactorMethods.includes("totp") ? (
              <button
                type="button"
                className={
                  twoFactorMode === "totp"
                    ? "sklyvo-btn-primary"
                    : "sklyvo-btn-provider"
                }
                style={{ flex: 1 }}
                onClick={() => setTwoFactorMode("totp")}
                disabled={pending}
              >
                Authenticator
              </button>
            ) : null}
            {twoFactorMethods.includes("passkey") ? (
              <button
                type="button"
                className={
                  twoFactorMode === "passkey"
                    ? "sklyvo-btn-primary"
                    : "sklyvo-btn-provider"
                }
                style={{ flex: 1 }}
                onClick={() => setTwoFactorMode("passkey")}
                disabled={pending}
              >
                Passkey
              </button>
            ) : null}
          </div>
        ) : null}

        {twoFactorMode === "totp" ? (
          <form onSubmit={handleTotpVerify} noValidate>
            <div className="sklyvo-fields">
              <div className="sklyvo-field">
                <label className="sr-only" htmlFor={totpId}>
                  Ověřovací kód
                </label>
                <input
                  id={totpId}
                  className="sklyvo-field__input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  disabled={pending}
                />
              </div>
            </div>

            {errorMessage ? (
              <p className="sklyvo-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button type="submit" className="sklyvo-btn-primary" disabled={pending}>
              {pending ? "…" : "Ověřit kód"}
            </button>
          </form>
        ) : null}

        {twoFactorMode === "passkey" ? (
          <div>
            {errorMessage ? (
              <p className="sklyvo-error" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <button
              type="button"
              className="sklyvo-btn-primary"
              disabled={pending}
              onClick={() => void handlePasskeyVerify()}
            >
              {pending ? "…" : "Použít passkey"}
            </button>
          </div>
        ) : null}

        <p className="sklyvo-form__footer">
          <button
            type="button"
            className="sklyvo-link"
            onClick={() => {
              setTwoFactorMethods(null);
              setTwoFactorMode(null);
              setTotpCode("");
              setErrorMessage("");
            }}
          >
            Zpět na přihlášení
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="sklyvo-card__title">{t.login.title}</h1>
      <p className="sklyvo-card__sub">{t.login.sub}</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="sklyvo-fields">
          <div className="sklyvo-field">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--sk-icon)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 6 10-6" />
            </svg>
            <label className="sr-only" htmlFor={emailId}>
              {t.login.email}
            </label>
            <input
              id={emailId}
              className="sklyvo-field__input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder={t.login.email}
              required
              disabled={pending}
            />
          </div>

          <div className="sklyvo-field">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--sk-icon)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <label className="sr-only" htmlFor={passwordId}>
              {t.login.password}
            </label>
            <input
              id={passwordId}
              className="sklyvo-field__input"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder={t.login.password}
              required
              disabled={pending}
            />
            <button
              type="button"
              className="sklyvo-field__reveal"
              aria-label={
                showPassword ? t.login.hidePassword : t.login.showPassword
              }
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--sk-icon)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
                <line
                  className="sklyvo-field__slash"
                  x1="3"
                  y1="21"
                  x2="21"
                  y2="3"
                  style={{
                    strokeDashoffset: showPassword ? 26 : 0,
                    opacity: showPassword ? 0 : 1,
                  }}
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="sklyvo-form__aside">
          <Link className="sklyvo-link" href="/recovery">
            {t.login.forgot}
          </Link>
        </div>

        {errorMessage ? (
          <p className="sklyvo-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="sklyvo-btn-primary" disabled={pending}>
          {pending ? "…" : t.login.cta}
        </button>
      </form>

      <div className="sklyvo-divider">
        <span className="sklyvo-divider__label">{t.login.or}</span>
      </div>

      <OAuthProviderButtons
        disabled={pending || oauthPending !== null}
        onSelect={(provider) => {
          setErrorMessage("");
          void handleOAuthLogin(provider, setErrorMessage);
        }}
      />

      <p className="sklyvo-form__footer">
        <span>{t.login.noAccount}</span>
        <Link className="sklyvo-link" href="/register">
          {t.login.signUp}
        </Link>
      </p>
    </>
  );
}
