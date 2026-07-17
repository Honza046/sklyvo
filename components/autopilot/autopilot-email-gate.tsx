"use client";

import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/context/CopilotContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { EMAIL_SETUP_SETTINGS_HASH, getAutopilotEmailSetupPrompt } from "@/lib/copilot/setup-knowledge";
import type { EmailConnectionState } from "@/lib/email-connection-types";

export function AutopilotEmailGate({
  connectionState,
  children,
}: {
  connectionState: EmailConnectionState;
  children: React.ReactNode;
}) {
  const { t, language } = useLanguage();
  const { openWithPrompt } = useCopilot();

  if (connectionState.connected) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="pointer-events-none min-h-0 flex-1 select-none blur-[2px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-lg rounded-2xl border border-amber-200/80 bg-background/95 p-6 text-center shadow-xl backdrop-blur-sm dark:border-amber-900/60">
          <p className="text-base font-semibold text-foreground">
            {t("autopilot.emailGate.title")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t("autopilot.emailGate.description")}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
              <Link href={`/settings#${EMAIL_SETUP_SETTINGS_HASH}`}>
                {t("autopilot.emailGate.openSettings")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => openWithPrompt(getAutopilotEmailSetupPrompt(language))}
            >
              <Bot className="mr-2 h-4 w-4" />
              {t("autopilot.emailGate.askCopilot")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
