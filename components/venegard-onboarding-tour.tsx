"use client";

import { useCallback, useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { completeOnboardingTour } from "@/app/actions/onboarding-tour";

const TOUR_POPOVER_CLASS = "venegard-driver-popover";

function buildDesktopSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="onboarding-sidebar"]',
      popover: {
        title: "Vítejte",
        description: "Vítejte v aplikaci! Zde najdete vaše hlavní velitelské centrum.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-radar"]',
      popover: {
        title: "Radar",
        description:
          "Tohle je váš vyhledávač. Zde najdete nové klienty a získáte na ně kontaktní údaje.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-sniper"]',
      popover: {
        title: "Sniper",
        description: "Tady probíhá hlavní kouzlo. Sniper vám vygeneruje emaily přesně na míru.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-settings"]',
      popover: {
        title: "Pracovní prostor",
        description:
          "Než začnete pracovat, klikněte sem a nastavte si svůj profil, aby zprávy zněly přesně jako vy.",
        side: "right",
        align: "end",
      },
    },
  ];
}

function buildMobileSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="onboarding-mobile-header"]',
      popover: {
        title: "Vítejte",
        description:
          "Vítejte v aplikaci! Nahoře je menu (☰) s Autopilotem, nastavením a účtem.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="onboarding-mobile-tabs"]',
      popover: {
        title: "Hlavní nástroje",
        description: "Dole přepínáte Přehled, Sniper, Radar a CRM.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="onboarding-radar"]',
      popover: {
        title: "Radar",
        description:
          "Tohle je váš vyhledávač. Zde najdete nové klienty a získáte na ně kontaktní údaje.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="onboarding-sniper"]',
      popover: {
        title: "Sniper",
        description: "Tady probíhá hlavní kouzlo. Sniper vám vygeneruje emaily přesně na míru.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="onboarding-mobile-menu"]',
      popover: {
        title: "Nastavení",
        description:
          "V menu najdete Autopilot a pracovní prostor — nastavte si profil, aby zprávy zněly jako vy.",
        side: "bottom",
        align: "end",
      },
    },
  ];
}

export function VenegardOnboardingTour({
  active,
  userId,
  onCompleted,
}: {
  active: boolean;
  userId: string | null;
  onCompleted: () => void;
}) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const persistRef = useRef(false);
  const startedForSessionRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const persistCompletion = useCallback(async () => {
    if (persistRef.current) return;
    persistRef.current = true;
    const res = await completeOnboardingTour();
    if (res.ok) {
      onCompleted();
    } else {
      persistRef.current = false;
    }
  }, [onCompleted]);

  useEffect(() => {
    if (userId && userId !== lastUserIdRef.current) {
      lastUserIdRef.current = userId;
      startedForSessionRef.current = false;
      persistRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!active || !userId) return;

    const mdUp = () =>
      typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

    const desktopSelectors = [
      '[data-tour="onboarding-sidebar"]',
      '[data-tour="onboarding-radar"]',
      '[data-tour="onboarding-sniper"]',
      '[data-tour="onboarding-settings"]',
    ] as const;

    const mobileSelectors = [
      '[data-tour="onboarding-mobile-header"]',
      '[data-tour="onboarding-mobile-tabs"]',
      '[data-tour="onboarding-radar"]',
      '[data-tour="onboarding-sniper"]',
      '[data-tour="onboarding-mobile-menu"]',
    ] as const;

    const selectors = () => (mdUp() ? desktopSelectors : mobileSelectors);
    const allPresent = () => selectors().every((s) => document.querySelector(s));

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number | undefined;

    const start = () => {
      if (cancelled || !allPresent() || startedForSessionRef.current) return;
      startedForSessionRef.current = true;

      const d = driver({
        showProgress: true,
        progressText: "Krok {{current}} z {{total}}",
        nextBtnText: "Pokračovat",
        prevBtnText: "Zpět",
        doneBtnText: "Hotovo",
        animate: true,
        smoothScroll: true,
        allowClose: true,
        popoverClass: TOUR_POPOVER_CLASS,
        overlayOpacity: 0.55,
        stageRadius: 12,
        steps: mdUp() ? buildDesktopSteps() : buildMobileSteps(),
        onDestroyed: () => {
          driverRef.current = null;
          void persistCompletion();
        },
      });

      driverRef.current = d;
      try {
        d.drive();
      } catch {
        startedForSessionRef.current = false;
      }
    };

    const tick = () => {
      if (cancelled) return;
      if (allPresent()) {
        start();
        return;
      }
      attempts += 1;
      if (attempts < 25 && !cancelled) {
        timeoutId = window.setTimeout(tick, 120);
      } else {
        startedForSessionRef.current = false;
      }
    };

    const rafId = window.requestAnimationFrame(() => tick());

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
      driverRef.current = null;
    };
  }, [active, userId, persistCompletion]);

  return null;
}
