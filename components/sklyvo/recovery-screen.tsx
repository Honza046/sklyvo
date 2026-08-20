"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { useLanguage } from "@/components/sklyvo/language-provider";
import { authError, localizeAuthError } from "@/lib/sklyvo/auth-errors";

export function RecoveryScreen() {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const emailId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setErrorMessage("");
    setSuccessMessage("");
    setPending(true);

    try {
      const formData = new FormData(form);
      const emailRaw = formData.get("email");
      const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
      if (!email) {
        setErrorMessage(authError(language, "emailRequired"));
        return;
      }

      const result = await requestPasswordReset(email, window.location.origin);
      if ("error" in result && result.error) {
        setErrorMessage(localizeAuthError(language, result.error));
        return;
      }
      setSuccessMessage(t.recovery.success);
      form.reset();
    } catch {
      setErrorMessage(authError(language, "resetSendFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="l2-title">{t.recovery.title}</h1>
      <p className="l2-sub">{t.recovery.sub}</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="l2-fields">
          <div className="l2-group">
            <div className="l2-field">
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
                className="l2-field__input"
                type="email"
                name="email"
                autoComplete="email"
                placeholder={t.recovery.emailPlaceholder}
                aria-label={t.recovery.email}
                required
                disabled={pending}
              />
            </div>
          </div>
        </div>

        <div className="l2-forgot-row" aria-hidden />

        {errorMessage ? (
          <p className="l2-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="l2-success" role="status">
            {successMessage}
          </p>
        ) : null}

        <button type="submit" className="l2-cta" disabled={pending}>
          {pending ? t.recovery.sending : t.recovery.cta}
        </button>
      </form>

      <p className="l2-foot">
        <span>{t.recovery.remember}</span>
        <Link className="l2-link" href="/login">
          {t.recovery.signIn}
        </Link>
      </p>
    </>
  );
}
