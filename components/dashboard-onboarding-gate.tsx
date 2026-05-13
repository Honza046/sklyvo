"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { OnboardingForm } from "@/components/onboarding-form";

type Props = {
  needsOnboarding: boolean;
  children: ReactNode;
};

export function DashboardOnboardingGate({ needsOnboarding, children }: Props) {
  const router = useRouter();

  return (
    <>
      {needsOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/60 p-4 backdrop-blur-sm sm:p-8">
          <OnboardingForm
            embedded
            onCompleted={() => {
              router.refresh();
            }}
          />
        </div>
      )}
      {children}
    </>
  );
}
