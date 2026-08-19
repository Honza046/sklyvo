"use client";

import { AccountDevicesPanel } from "@/components/account/account-devices-panel";
import { AccountSubpageShell } from "@/components/account/account-subpage-shell";
import { useLanguage } from "@/context/LanguageContext";

export default function AccountDevicesPage() {
  const { t } = useLanguage();

  return (
    <AccountSubpageShell
      title={t("account.devices")}
      subtitle={t("account.devicesSub")}
    >
      <AccountDevicesPanel />
    </AccountSubpageShell>
  );
}
