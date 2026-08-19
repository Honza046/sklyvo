"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

type ResetPasswordFormProps = {
  onSubmit: (password: string, confirmPassword: string) => Promise<string | null>;
  invalidToken?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
};

export function ResetPasswordForm({
  onSubmit,
  invalidToken = false,
  submitLabel = "Uložit heslo",
  pendingLabel = "Ukládám…",
}: ResetPasswordFormProps) {
  const passwordId = useId();
  const confirmId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setErrorMessage("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Hesla se neshodují.");
      return;
    }

    setPending(true);
    try {
      const error = await onSubmit(password, confirmPassword);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setSuccessMessage("Heslo bylo změněno. Přesměrováváme na přihlášení…");
    } catch {
      setErrorMessage("Nepodařilo se změnit heslo. Zkuste to znovu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="sklyvo-card__title">Nové heslo</h1>
      <p className="sklyvo-card__sub">
        Zadejte nové heslo pro svůj Sklyvo účet.
      </p>

      {invalidToken ? (
        <p className="sklyvo-error" role="alert">
          Odkaz je neplatný.{" "}
          <Link href="/recovery" className="sklyvo-link">
            Požádat o nový
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="sklyvo-fields">
            <div className="sklyvo-group">
              <label className="sklyvo-label" htmlFor={passwordId}>
                Nové heslo
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
                Potvrzení hesla
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
            {pending ? pendingLabel : submitLabel}
          </button>
        </form>
      )}

      <p className="sklyvo-form__footer">
        <Link className="sklyvo-link" href="/login">
          Zpět na přihlášení
        </Link>
      </p>
    </>
  );
}
