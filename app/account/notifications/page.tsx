"use client";

import { AccountNotificationsPanel } from "@/components/account/account-notifications-panel";
import { AccountSubpageShell } from "@/components/account/account-subpage-shell";
import { useLanguage } from "@/context/LanguageContext";

export default function AccountNotificationsPage() {
  const { t } = useLanguage();

  return (
    <AccountSubpageShell
      title={t("account.notifications")}
      subtitle={t("account.notificationsSub")}
    >
      <AccountNotificationsPanel />
    </AccountSubpageShell>
  );
}
