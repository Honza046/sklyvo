"use client";

import Link from "next/link";
import { LayoutPanelTop } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * A tool that isn't available on the current plan gets the 2.0 design's calm
 * empty-state panel — a full-height card, not a paywall overlaid on blurred
 * content the user can't use anyway.
 */
export function LockedToolPlaceholder({
  title,
  description,
  showPlanLink = false,
  planLinkLabel,
}: {
  title: string;
  description: string;
  showPlanLink?: boolean;
  planLinkLabel?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sk-page-head shrink-0">
        <h1 className="sk-page-head__title">{title}</h1>
        <p className="sk-page-head__sub">{description}</p>
      </div>
      <div className="sk-coming-soon mt-4">
        <div className="sk-coming-soon__icon" aria-hidden>
          <LayoutPanelTop className="h-[22px] w-[22px]" strokeWidth={1.9} />
        </div>
        <p className="sk-coming-soon__title">{title}</p>
        <p className="sk-coming-soon__desc">{description}</p>
        {showPlanLink ? (
          <Link href="/pricing" className="sk-coming-soon__cta">
            {planLinkLabel ?? t("planGate.choosePlan")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
