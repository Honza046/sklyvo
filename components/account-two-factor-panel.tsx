"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint,
  KeyRound,
  Loader2,
  Trash2,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";
import {
  beginPasskeyRegistration,
  beginTotpSetup,
  confirmTotpSetup,
  deletePasskey,
  disableTotp,
  finishPasskeyRegistration,
  getTwoFactorStatus,
} from "@/app/actions/two-factor";
import { AccountPanel } from "@/components/account/account-panel";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";

type PasskeyRow = {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export function AccountTwoFactorPanel() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);

  const [totpSetup, setTotpSetup] = useState<{
    qrDataUrl: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);

  const [disablePassword, setDisablePassword] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    const status = await getTwoFactorStatus();
    if ("error" in status) {
      toast.error(status.error);
      return;
    }
    setTotpEnabled(status.totpEnabled);
    setPasskeys(status.passkeys);
  }

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleBeginTotp() {
    setTotpBusy(true);
    try {
      const result = await beginTotpSetup();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setTotpSetup({ qrDataUrl: result.qrDataUrl, secret: result.secret });
      setTotpCode("");
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleConfirmTotp() {
    setTotpBusy(true);
    try {
      const result = await confirmTotpSetup(totpCode);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("account.twoFactor.totpEnabled"));
      setTotpSetup(null);
      setTotpCode("");
      await refresh();
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleDisableTotp() {
    if (!disablePassword.trim()) {
      toast.error(t("account.twoFactor.enterDisablePassword"));
      return;
    }
    setTotpBusy(true);
    try {
      const result = await disableTotp({ password: disablePassword });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("account.twoFactor.totpDisabled"));
      setDisablePassword("");
      await refresh();
    } finally {
      setTotpBusy(false);
    }
  }

  async function handleAddPasskey() {
    setPasskeyBusy(true);
    try {
      const begin = await beginPasskeyRegistration();
      if ("error" in begin) {
        toast.error(begin.error);
        return;
      }
      const attestation = await startRegistration({
        optionsJSON: begin.options,
      });
      const finish = await finishPasskeyRegistration({
        response: attestation,
        name: "Passkey",
      });
      if ("error" in finish) {
        toast.error(finish.error);
        return;
      }
      toast.success(t("account.twoFactor.passkeyAdded"));
      await refresh();
    } catch (err) {
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? t("account.twoFactor.passkeyCancelled")
          : t("account.twoFactor.passkeyFailed");
      toast.error(message);
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function handleDeletePasskey(id: string) {
    if (!deletePassword.trim()) {
      toast.error(t("account.twoFactor.enterDeletePassword"));
      return;
    }
    setDeletingId(id);
    try {
      const result = await deletePasskey({ id, password: deletePassword });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("account.twoFactor.passkeyRemoved"));
      setDeletePassword("");
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <AccountPanel
        title={t("account.twoFactor.title")}
        titleId="account-2fa-title"
        loading
        loadingLabel={t("account.twoFactor.loading")}
      />
    );
  }

  return (
    <AccountPanel
      title={t("account.twoFactor.title")}
      titleId="account-2fa-title"
      description={t("account.twoFactor.desc")}
    >
      <div className="sk-account-sub__2fa-grid">
        <div className="sk-account-sub__2fa-block">
          <div className="sk-account-sub__2fa-head">
            <div className="sk-account-sub__2fa-icon">
              <KeyRound className="h-4 w-4" aria-hidden />
            </div>
            <div className="sk-account-sub__2fa-copy">
              <p className="sk-account-sub__2fa-title">
                {t("account.twoFactor.authenticatorTitle")}
              </p>
              <p className="sk-account-sub__2fa-desc">
                {t("account.twoFactor.authenticatorDesc")}{" "}
                <span className="sk-account-sub__2fa-status">
                  {totpEnabled
                    ? t("account.twoFactor.on")
                    : t("account.twoFactor.off")}
                </span>
              </p>
            </div>
          </div>

          {!totpEnabled && !totpSetup ? (
            <button
              type="button"
              className="sk-btn sk-btn--secondary"
              disabled={totpBusy}
              onClick={() => void handleBeginTotp()}
            >
              {totpBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("account.twoFactor.enableAuthenticator")
              )}
            </button>
          ) : null}

          {totpSetup ? (
            <div className="sk-account-sub__2fa-setup">
              <p className="sk-account-sub__2fa-desc">
                {t("account.twoFactor.scanQr")}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={totpSetup.qrDataUrl}
                alt={t("account.twoFactor.qrAlt")}
                className="sk-account-sub__2fa-qr"
              />
              <p className="sk-account-sub__2fa-secret">{totpSetup.secret}</p>
              <div className="sk-profile-field">
                <label className="sk-field-label" htmlFor="account-totp-code">
                  {t("account.twoFactor.verificationCode")}
                </label>
                <input
                  id="account-totp-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="sk-profile-input"
                  disabled={totpBusy}
                />
              </div>
              <div className="sk-account-sub__actions">
                <button
                  type="button"
                  className="sk-btn sk-btn--white"
                  disabled={totpBusy || totpCode.trim().length < 6}
                  onClick={() => void handleConfirmTotp()}
                >
                  {totpBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("account.twoFactor.confirmEnable")
                  )}
                </button>
                <button
                  type="button"
                  className="sk-btn sk-btn--secondary"
                  disabled={totpBusy}
                  onClick={() => {
                    setTotpSetup(null);
                    setTotpCode("");
                  }}
                >
                  {t("account.cancel")}
                </button>
              </div>
            </div>
          ) : null}

          {totpEnabled ? (
            <div className="sk-account-sub__2fa-setup">
              <div className="sk-profile-field">
                <label className="sk-field-label" htmlFor="account-disable-totp">
                  {t("account.twoFactor.disablePassword")}
                </label>
                <input
                  id="account-disable-totp"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="sk-profile-input"
                  placeholder={t("account.twoFactor.yourPassword")}
                  disabled={totpBusy}
                />
              </div>
              <button
                type="button"
                className="sk-btn sk-btn--secondary"
                disabled={totpBusy}
                onClick={() => void handleDisableTotp()}
              >
                {t("account.twoFactor.disableAuthenticator")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="sk-account-sub__2fa-block">
          <div className="sk-account-sub__2fa-head">
            <div className="sk-account-sub__2fa-icon">
              <Fingerprint className="h-4 w-4" aria-hidden />
            </div>
            <div className="sk-account-sub__2fa-copy">
              <p className="sk-account-sub__2fa-title">
                {t("account.twoFactor.passkeyTitle")}
              </p>
              <p className="sk-account-sub__2fa-desc">
                {t("account.twoFactor.passkeyDesc")}
              </p>
            </div>
          </div>

          {passkeys.length > 0 ? (
            <ul className="sk-account-sub__2fa-passkeys">
              {passkeys.map((pk) => (
                <li key={pk.id} className="sk-account-sub__2fa-passkey-row">
                  <div className="sk-account-sub__2fa-passkey-main">
                    <p className="sk-account-sub__2fa-passkey-name">
                      {pk.name || "Passkey"}
                    </p>
                    <p className="sk-account-sub__2fa-passkey-date">
                      {t("account.twoFactor.addedOn", {
                        date: new Date(pk.createdAt).toLocaleDateString(
                          DATE_LOCALE[language] || "cs-CZ",
                        ),
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="sk-account-sub__2fa-passkey-delete"
                    disabled={deletingId === pk.id}
                    onClick={() => void handleDeletePasskey(pk.id)}
                    aria-label={t("account.twoFactor.removePasskey")}
                  >
                    {deletingId === pk.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sk-account-sub__2fa-desc">
              {t("account.twoFactor.noPasskeys")}
            </p>
          )}

          {passkeys.length > 0 ? (
            <div className="sk-profile-field">
              <label className="sk-field-label" htmlFor="account-delete-passkey-pw">
                {t("account.twoFactor.deletePassword")}
              </label>
              <input
                id="account-delete-passkey-pw"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="sk-profile-input"
                placeholder={t("account.twoFactor.yourPassword")}
              />
            </div>
          ) : null}

          <button
            type="button"
            className="sk-btn sk-btn--secondary"
            disabled={passkeyBusy}
            onClick={() => void handleAddPasskey()}
          >
            {passkeyBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("account.twoFactor.addPasskey")
            )}
          </button>
        </div>
      </div>
    </AccountPanel>
  );
}
