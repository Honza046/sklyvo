"use client";

import { LanguageProvider } from "@/context/LanguageContext";
import { CopilotProvider } from "@/context/CopilotContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <CopilotProvider>{children}</CopilotProvider>
    </LanguageProvider>
  );
}
