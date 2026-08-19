"use client";

import { AccountEmailsPanel } from "@/components/account/account-emails-panel";
import { AccountSubpageShell } from "@/components/account/account-subpage-shell";
import { useLanguage } from "@/context/LanguageContext";

export default function AccountEmailsPage() {
  const { t } = useLanguage();

  return (
    <AccountSubpageShell
      title={t("account.connectedEmails")}
      subtitle={t("account.connectedEmailsSub")}
    >
      <AccountEmailsPanel />
    </AccountSubpageShell>
  );
}
