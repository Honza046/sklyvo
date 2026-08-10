"use client";

import { OnboardingForm } from "@/components/onboarding-form";

/**
 * Simulace úvodního formuláře — neukládá do DB.
 * Otevři: /onboarding/preview
 */
export default function OnboardingPreviewPage() {
  return (
    <div className="relative">
      <div className="fixed left-1/2 top-3 z-[110] -translate-x-1/2 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900 shadow-sm ">
        Náhled onboardingu. Změny se neukládají
      </div>
      <OnboardingForm preview />
    </div>
  );
}
