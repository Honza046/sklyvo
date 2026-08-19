"use client";

import { AccountPasswordForm } from "@/components/account/account-password-form";
import { AccountSubpageShell } from "@/components/account/account-subpage-shell";
import { AccountTwoFactorPanel } from "@/components/account-two-factor-panel";
import { useLanguage } from "@/context/LanguageContext";

export default function AccountSecurityPage() {
  const { t } = useLanguage();

  return (
    <AccountSubpageShell
      title={t("account.security")}
      subtitle={t("account.securitySub")}
    >
      <div className="sk-account-sub__stack">
        <AccountPasswordForm />
        <AccountTwoFactorPanel />
      </div>
    </AccountSubpageShell>
  );
}
