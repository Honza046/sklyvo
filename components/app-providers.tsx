"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/context/LanguageContext";
import { CopilotProvider } from "@/context/CopilotContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <CopilotProvider>{children}</CopilotProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
