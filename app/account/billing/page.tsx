"use client";

import { AccountBillingPanel } from "@/components/account/account-billing-panel";
import { AccountSubpageShell } from "@/components/account/account-subpage-shell";
import { useLanguage } from "@/context/LanguageContext";

export default function AccountBillingPage() {
  const { t } = useLanguage();

  return (
    <AccountSubpageShell
      title={t("account.billing")}
      subtitle={t("account.billingSub")}
    >
      <AccountBillingPanel />
    </AccountSubpageShell>
  );
}
