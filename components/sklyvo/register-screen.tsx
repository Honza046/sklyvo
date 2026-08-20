"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { registerUser } from "@/app/actions/auth";
import { useLanguage } from "@/components/sklyvo/language-provider";
import { AuthButtonLoader } from "@/components/sklyvo/auth-button-loader";
import {
  OAuthProviderButtons,
  useOAuthLogin,
} from "@/components/sklyvo/oauth-providers";
import { authError, localizeAuthError } from "@/lib/sklyvo/auth-errors";

export function RegisterScreen() {
  const { t, language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, setPending] = useState(false);
  const { oauthPending, handleOAuthLogin } = useOAuthLogin();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await registerUser(formData);
      if ("error" in result && result.error) {
        setErrorMessage(localizeAuthError(language, result.error));
        return;
      }
      window.location.href = "/onboarding";
    } catch {
      setErrorMessage(authError(language, "registerFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="sklyvo-card__title">{t.register.title}</h1>
      <p className="sklyvo-card__sub">{t.register.sub}</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="sklyvo-fields">
          <div className="sklyvo-group">
            <label className="sklyvo-label" htmlFor={nameId}>
              {t.register.name}
            </label>
            <div className="sklyvo-field">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id={nameId}
                className="sklyvo-field__input"
                type="text"
                name="name"
                autoComplete="name"
                placeholder={t.register.namePlaceholder}
                required
                disabled={pending}
              />
            </div>
          </div>

          <div className="sklyvo-group">
            <label className="sklyvo-label" htmlFor={emailId}>
              {t.register.email}
            </label>
            <div className="sklyvo-field">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m2 7 10 6 10-6" />
              </svg>
              <input
                id={emailId}
                className="sklyvo-field__input"
                type="email"
                name="email"
                autoComplete="email"
                placeholder={t.register.emailPlaceholder}
                required
                disabled={pending}
              />
            </div>
          </div>

          <div className="sklyvo-group">
            <label className="sklyvo-label" htmlFor={passwordId}>
              {t.register.password}
            </label>
            <div className="sklyvo-field">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id={passwordId}
                className="sklyvo-field__input"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder={t.register.passwordPlaceholder}
                required
                minLength={8}
                disabled={pending}
              />
              <button
                type="button"
                className="sklyvo-field__reveal"
                aria-label={
                  showPassword
                    ? t.register.hidePassword
                    : t.register.showPassword
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
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
        </div>

        <div className="sklyvo-form__aside" />

        {errorMessage ? (
          <p className="sklyvo-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="sklyvo-btn-primary" disabled={pending}>
          {pending ? <AuthButtonLoader /> : t.register.cta}
        </button>
      </form>

      <div className="sklyvo-divider">
        <span className="sklyvo-divider__label">{t.register.or}</span>
      </div>

      <OAuthProviderButtons
        disabled={pending || oauthPending !== null}
        onSelect={(provider) => {
          setErrorMessage("");
          void handleOAuthLogin(provider, setErrorMessage);
        }}
      />

      <p className="sklyvo-form__footer">
        <span>{t.register.hasAccount}</span>
        <Link className="sklyvo-link" href="/login">
          {t.register.signIn}
        </Link>
      </p>
    </>
  );
}
