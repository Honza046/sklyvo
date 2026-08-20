"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/sklyvo/language-provider";
import { authError, localizeAuthError } from "@/lib/sklyvo/auth-errors";

type ResetPasswordFormProps = {
  onSubmit: (password: string, confirmPassword: string) => Promise<string | null>;
  invalidToken?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
};

export function ResetPasswordForm({
  onSubmit,
  invalidToken = false,
  submitLabel,
  pendingLabel,
}: ResetPasswordFormProps) {
  const { language } = useLanguage();
  const passwordId = useId();
  const confirmId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const resolvedSubmit =
    submitLabel ??
    (language === "en"
      ? "Save password"
      : language === "de"
        ? "Passwort speichern"
        : language === "es"
          ? "Guardar contraseña"
          : "Uložit heslo");
  const resolvedPending =
    pendingLabel ??
    (language === "en"
      ? "Saving…"
      : language === "de"
        ? "Wird gespeichert…"
        : language === "es"
          ? "Guardando…"
          : "Ukládám…");

  const copy =
    language === "en"
      ? {
          title: "New password",
          sub: "Enter a new password for your Sklyvo account.",
          password: "New password",
          confirm: "Confirm password",
          invalidToken: "This link is invalid.",
          requestNew: "Request a new one",
          back: "Back to sign in",
        }
      : language === "de"
        ? {
            title: "Neues Passwort",
            sub: "Geben Sie ein neues Passwort für Ihr Sklyvo-Konto ein.",
            password: "Neues Passwort",
            confirm: "Passwort bestätigen",
            invalidToken: "Dieser Link ist ungültig.",
            requestNew: "Neuen anfordern",
            back: "Zurück zur Anmeldung",
          }
        : language === "es"
          ? {
              title: "Nueva contraseña",
              sub: "Introduce una nueva contraseña para tu cuenta de Sklyvo.",
              password: "Nueva contraseña",
              confirm: "Confirmar contraseña",
              invalidToken: "Este enlace no es válido.",
              requestNew: "Solicitar uno nuevo",
              back: "Volver al inicio de sesión",
            }
          : {
              title: "Nové heslo",
              sub: "Zadejte nové heslo pro svůj Sklyvo účet.",
              password: "Nové heslo",
              confirm: "Potvrzení hesla",
              invalidToken: "Odkaz je neplatný.",
              requestNew: "Požádat o nový",
              back: "Zpět na přihlášení",
            };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setErrorMessage(authError(language, "newPasswordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(authError(language, "passwordsMismatch"));
      return;
    }

    setPending(true);
    try {
      const error = await onSubmit(password, confirmPassword);
      if (error) {
        setErrorMessage(localizeAuthError(language, error));
        return;
      }
      setSuccessMessage(authError(language, "passwordChanged"));
    } catch {
      setErrorMessage(authError(language, "resetFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="sklyvo-card__title">{copy.title}</h1>
      <p className="sklyvo-card__sub">{copy.sub}</p>

      {invalidToken ? (
        <p className="sklyvo-error" role="alert">
          {copy.invalidToken}{" "}
          <Link href="/recovery" className="sklyvo-link">
            {copy.requestNew}
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="sklyvo-fields">
            <div className="sklyvo-group">
              <label className="sklyvo-label" htmlFor={passwordId}>
                {copy.password}
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id={passwordId}
                  className="sklyvo-field__input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={pending}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="sklyvo-group">
              <label className="sklyvo-label" htmlFor={confirmId}>
                {copy.confirm}
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
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id={confirmId}
                  className="sklyvo-field__input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={pending}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
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

          <button
            type="submit"
            className="sklyvo-btn-primary"
            disabled={pending || Boolean(successMessage)}
          >
            {pending ? resolvedPending : resolvedSubmit}
          </button>
        </form>
      )}

      <p className="sklyvo-form__footer">
        <Link className="sklyvo-link" href="/login">
          {copy.back}
        </Link>
      </p>
    </>
  );
}
