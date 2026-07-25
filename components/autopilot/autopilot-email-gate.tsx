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
        <div className="max-w-lg rounded-xl border border-amber-200/80 bg-background/95 p-4 text-center shadow-xl backdrop-blur-sm dark:border-amber-900/60 sm:rounded-2xl sm:p-6">
          <p className="text-sm font-semibold text-foreground sm:text-base">
            {t("autopilot.emailGate.title")}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">{t("autopilot.emailGate.description")}</p>
          <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-center">
            <Button asChild className="h-9 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 sm:h-10 sm:rounded-xl">
              <Link href={`/settings#${EMAIL_SETUP_SETTINGS_HASH}`}>
                {t("autopilot.emailGate.openSettings")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg text-sm sm:h-10 sm:rounded-xl"
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
