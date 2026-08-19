"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { updateUserPassword } from "@/app/actions/auth";
import { AccountPanel } from "@/components/account/account-panel";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

export function AccountPasswordForm() {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("account.toast.passwordsMismatch"));
      return;
    }
    if (newPassword === currentPassword) {
      toast.error(t("account.toast.passwordSame"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("account.toast.passwordShort"));
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateUserPassword({ currentPassword, newPassword });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("account.toast.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AccountPanel
      title={t("account.passwordSectionTitle")}
      titleId="account-password-title"
      footer={
        <button
          type="submit"
          form="account-password-form"
          className="sk-btn sk-btn--white"
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("account.updatePassword")
          )}
        </button>
      }
    >
      <form
        id="account-password-form"
        className="sk-account-sub__form"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="sk-profile-field">
          <label className="sk-field-label" htmlFor="account-current-password">
            {t("account.currentPassword")}
          </label>
          <input
            id="account-current-password"
            type="password"
            className="sk-profile-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("account.currentPasswordPlaceholder")}
            autoComplete="current-password"
            disabled={isSaving}
          />
        </div>

        <div className="sk-profile-personal__names">
          <div className="sk-profile-field">
            <label className="sk-field-label" htmlFor="account-new-password">
              {t("account.newPassword")}
            </label>
            <input
              id="account-new-password"
              type="password"
              className="sk-profile-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("account.newPasswordPlaceholder")}
              autoComplete="new-password"
              disabled={isSaving}
            />
          </div>
          <div className="sk-profile-field">
            <label className="sk-field-label" htmlFor="account-confirm-password">
              {t("account.confirmPassword")}
            </label>
            <input
              id="account-confirm-password"
              type="password"
              className="sk-profile-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("account.confirmPasswordPlaceholder")}
              autoComplete="new-password"
              disabled={isSaving}
            />
          </div>
        </div>
      </form>
    </AccountPanel>
  );
}
