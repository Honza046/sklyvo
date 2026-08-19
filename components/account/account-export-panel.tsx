"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import {
  exportAccountData,
  requestAccountDeletion,
} from "@/app/actions/user";
import { AccountPanel } from "@/components/account/account-panel";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

export function AccountExportPanel() {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportAccountData();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const blob = new Blob([result.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("account.exportReady"));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    if (!deletePassword.trim()) {
      toast.error(t("account.exportDeletePasswordRequired"));
      return;
    }
    if (!window.confirm(t("account.exportDeleteConfirm"))) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await requestAccountDeletion(deletePassword);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(t("account.exportDeleteSuccess"));
      window.location.href = "/login";
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="sk-account-sub__stack">
      <AccountPanel
        title={t("account.exportSectionTitle")}
        titleId="account-export-title"
        description={t("account.exportSectionDesc")}
        footer={
          <button
            type="button"
            className="sk-btn sk-btn--white"
            disabled={isExporting}
            onClick={() => void handleExport()}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4" aria-hidden />
                {t("account.exportDownload")}
              </>
            )}
          </button>
        }
      >
        <ul className="sk-account-sub__bullet-list">
          <li>{t("account.exportIncludesCrm")}</li>
          <li>{t("account.exportIncludesWorkspace")}</li>
          <li>{t("account.exportIncludesProfile")}</li>
        </ul>
      </AccountPanel>

      <AccountPanel
        title={t("account.exportDeleteTitle")}
        titleId="account-delete-title"
        description={t("account.exportDeleteDesc")}
        variant="danger"
        footer={
          <button
            type="button"
            className="sk-btn sk-btn--danger"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden />
                {t("account.exportDeleteCta")}
              </>
            )}
          </button>
        }
      >
        <div className="sk-profile-field">
          <label className="sk-field-label" htmlFor="account-delete-password">
            {t("account.currentPassword")}
          </label>
          <input
            id="account-delete-password"
            type="password"
            className="sk-profile-input"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder={t("account.currentPasswordPlaceholder")}
            autoComplete="current-password"
            disabled={isDeleting}
          />
        </div>
      </AccountPanel>
    </div>
  );
}
