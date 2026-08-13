"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/context/CopilotContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import {
  EMAIL_SETUP_SETTINGS_HASH,
  getAutopilotEmailSetupPrompt,
} from "@/lib/copilot/setup-knowledge";
import type { EmailConnectionState } from "@/lib/email-connection-types";

export function AutopilotEmailGate({
  connectionState,
  children,
}: {
  connectionState: EmailConnectionState;
  children: React.ReactNode;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { openWithPrompt } = useCopilot();

  if (connectionState.connected) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="pointer-events-none min-h-0 flex-1 select-none blur-[2.5px] opacity-55">
        {children}
      </div>
      <div className="sk-email-gate absolute inset-0 flex items-center justify-center p-4">
        <div className="sk-email-gate__card" role="dialog" aria-modal="true">
          <div className="sk-email-gate__icon" aria-hidden>
            <Mail className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <h2 className="sk-type-h3 text-center">
            {t("autopilot.emailGate.title")}
          </h2>
          <p className="sk-type-body mt-2 text-center">
            {t("autopilot.emailGate.description")}
          </p>
          <div className="mt-5 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Button asChild className="sk-btn sk-btn--primary w-full sm:w-auto">
              <Link href="/settings/outreach">
                {t("autopilot.emailGate.openSettings")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="sk-btn sk-btn--secondary w-full sm:w-auto"
              onClick={() => {
                openWithPrompt(getAutopilotEmailSetupPrompt(language));
                router.push("/help");
              }}
            >
              {t("autopilot.emailGate.askCopilot")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
