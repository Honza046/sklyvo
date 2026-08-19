"use client";

import { AutopilotEmailGate } from "@/components/autopilot/autopilot-email-gate";
import { LockedToolPlaceholder } from "@/components/locked-tool-placeholder";
import { useLanguage } from "@/context/LanguageContext";
import type { EmailConnectionState } from "@/lib/email-connection-types";

/**
 * Autopilot has two gates — plan tier, then a connected outreach email —
 * but only one should ever show at once. `locked` is resolved server-side
 * in the layout so the locked placeholder is there on first paint, never a
 * flash of the real (or email-gated) content first.
 */
export function AutopilotAccessGate({
  locked,
  connectionState,
  children,
}: {
  locked: boolean;
  connectionState: EmailConnectionState;
  children: React.ReactNode;
}) {
  if (locked) {
    return <AutopilotLocked />;
  }

  return (
    <AutopilotEmailGate connectionState={connectionState}>
      <div
        data-tour="onboarding-autopilot-page"
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </div>
    </AutopilotEmailGate>
  );
}

function AutopilotLocked() {
  const { t } = useLanguage();
  return (
    <LockedToolPlaceholder
      title={t("autopilot.title")}
      description={t("autopilot.lockedDescription")}
    />
  );
}
