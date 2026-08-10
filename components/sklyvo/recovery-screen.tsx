"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { useLanguage } from "@/components/sklyvo/language-provider";

export function RecoveryScreen() {
  const { t } = useLanguage();
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
        setErrorMessage("Vyplňte e-mailovou adresu.");
        return;
      }

      const result = await requestPasswordReset(email, window.location.origin);
      if ("error" in result && result.error) {
        setErrorMessage(result.error);
        return;
      }
      setSuccessMessage(t.recovery.success);
      form.reset();
    } catch {
      setErrorMessage(
        "Při odesílání e-mailu nastala chyba. Zkuste to později.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="sklyvo-card__title">{t.recovery.title}</h1>
      <p className="sklyvo-card__sub">{t.recovery.sub}</p>

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
              {t.recovery.email}
            </label>
            <input
              id={emailId}
              className="sklyvo-field__input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder={t.recovery.email}
              required
              disabled={pending}
            />
          </div>
        </div>

        <div className="sklyvo-form__aside" />

        {errorMessage ? (
          <p className="sklyvo-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="sklyvo-success" role="status">
            {successMessage}
          </p>
        ) : null}

        <button type="submit" className="sklyvo-btn-primary" disabled={pending}>
          {pending ? t.recovery.sending : t.recovery.cta}
        </button>
      </form>

      <p className="sklyvo-form__footer">
        <span>{t.recovery.remember}</span>
        <Link className="sklyvo-link" href="/login">
          {t.recovery.signIn}
        </Link>
      </p>
    </>
  );
}
