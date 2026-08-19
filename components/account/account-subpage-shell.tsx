"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type AccountSubpageShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AccountSubpageShell({
  title,
  subtitle,
  children,
}: AccountSubpageShellProps) {
  const { t } = useLanguage();

  return (
    <div className="sk-account-sub">
      <div className="sk-account-sub__header">
        <Link href="/account" className="sk-account-sub__back">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("account.backToProfile")}
        </Link>

        <div className="sk-page-head shrink-0">
          <h1 className="sk-page-head__title">{title}</h1>
          {subtitle ? <p className="sk-page-head__sub">{subtitle}</p> : null}
        </div>
      </div>

      <div className="sk-account-sub__body">{children}</div>
    </div>
  );
}
