"use client";

import { OnboardingForm } from "@/components/onboarding-form";

/**
 * Simulace úvodního formuláře — neukládá do DB.
 * Otevři: /onboarding/preview
 */
export default function OnboardingPreviewPage() {
  return (
    <div className="relative">
      <div className="fixed left-1/2 top-3 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[rgba(255,238,0,0.35)] bg-[rgba(255,238,0,0.12)] px-3 py-1 text-[11px] font-semibold text-[#FFEE00]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#FFEE00]" aria-hidden />
        Náhled onboardingu · změny se neukládají
      </div>
      <OnboardingForm preview />
    </div>
  );
}
