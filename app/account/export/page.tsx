"use client";

import { AccountExportPanel } from "@/components/account/account-export-panel";
import { AccountSubpageShell } from "@/components/account/account-subpage-shell";
import { useLanguage } from "@/context/LanguageContext";

export default function AccountExportPage() {
  const { t } = useLanguage();

  return (
    <AccountSubpageShell
      title={t("account.exportData")}
      subtitle={t("account.exportDataSub")}
    >
      <AccountExportPanel />
    </AccountSubpageShell>
  );
}
