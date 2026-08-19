"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, Plus } from "lucide-react";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { AccountPanel } from "@/components/account/account-panel";
import { useLanguage } from "@/context/LanguageContext";
import type { EmailConnectionState } from "@/lib/email-connection-types";
import { cn } from "@/lib/utils";

export function AccountEmailsPanel() {
  const { t } = useLanguage();
  const [connection, setConnection] = useState<EmailConnectionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const state = await getEmailConnectionState();
        setConnection(state);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <AccountPanel loading loadingLabel={t("account.emailsLoading")} />;
  }

  const connected = connection?.connected === true;
  const senderEmail =
    connection?.senderEmail?.trim() ||
    connection?.suggestedSenderEmail?.trim() ||
    "—";

  return (
    <AccountPanel
      description={t("account.connectedEmailsDesc")}
      hint={t("account.connectedEmailsWorkspaceHint")}
      footer={
        <div className="sk-account-sub__actions">
          <Link href="/settings/outreach" className="sk-btn sk-btn--white">
            {t("account.openEmailSettings")}
          </Link>
          <Link href="/settings/connect-email" className="sk-btn sk-btn--secondary">
            <Plus className="h-4 w-4" aria-hidden />
            {t("account.addMailbox")}
          </Link>
        </div>
      }
    >
      <div className="sk-account-sub__email-card">
        <div className="sk-account-sub__email-icon">
          <Mail className="h-4 w-4" aria-hidden />
        </div>
        <div className="sk-account-sub__email-main">
          <p className="sk-account-sub__email-label">
            {t("account.workspaceMailboxLabel")}
          </p>
          <p className="sk-account-sub__email-value">{senderEmail}</p>
        </div>
        <span
          className={cn(
            "sk-account-sub__email-badge",
            connected
              ? "sk-account-sub__email-badge--ok"
              : "sk-account-sub__email-badge--off",
          )}
        >
          {connected ? t("account.connected") : t("account.emailsNotConnected")}
        </span>
      </div>
    </AccountPanel>
  );
}
