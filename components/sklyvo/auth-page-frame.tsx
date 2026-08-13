"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import { LanguageProvider } from "@/components/sklyvo/language-provider";
import "@/components/sklyvo/auth.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

export function AuthPageFrame({
  children,
  initialRegional,
}: {
  children: React.ReactNode;
  initialRegional: string;
}) {
  return (
    <div className={`${jakarta.variable} min-h-dvh bg-[#08090a]`}>
      <LanguageProvider initialRegional={initialRegional}>
        {children}
      </LanguageProvider>
    </div>
  );
}
