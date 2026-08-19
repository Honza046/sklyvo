"use client";

import { LockedToolPlaceholder } from "@/components/locked-tool-placeholder";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Storage is plan-gated. `locked` comes from the server layout so the
 * placeholder renders on first paint instead of flashing the real page.
 */
export function StorageAccessGate({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  if (locked) {
    return (
      <LockedToolPlaceholder
        title={t("storage.title")}
        description={t("storage.lockedDescription")}
        showPlanLink
      />
    );
  }

  return <>{children}</>;
}
