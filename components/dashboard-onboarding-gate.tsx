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
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto sk-onboarding__gate p-4 sm:p-8">
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
