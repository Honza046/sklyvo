"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { completeOnboardingTour } from "@/app/actions/onboarding-tour";

const TOUR_POPOVER_CLASS = "venegard-driver-popover";

/** Cílová stránka pro každý krok (desktop i mobile, stejné pořadí). */
const TOUR_STEP_HREFS = [
  "/",
  "/sniper",
  "/radar",
  "/autopilot/radar",
  "/crm",
  "/settings",
  "/help",
  "/",
] as const;

function isCopilotStepIndex(index: number) {
  return index === TOUR_STEP_HREFS.length - 1;
}

function pathMatchesTourHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function waitForRoute(href: string, timeoutMs = 2500): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (
        pathMatchesTourHref(window.location.pathname, href) ||
        Date.now() - started > timeoutMs
      ) {
        resolve();
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

function waitForSelector(selector: string, timeoutMs = 2500): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (el || Date.now() - started > timeoutMs) {
        resolve();
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

async function goToTourStep(router: ReturnType<typeof useRouter>, href: string) {
  if (!pathMatchesTourHref(window.location.pathname, href)) {
    router.push(href);
    await waitForRoute(href);
  }
  // Nech layout/active stavy dokreslit
  await new Promise<void>((r) => window.requestAnimationFrame(() => r()));
}

function refreshDriver(d: Driver) {
  window.requestAnimationFrame(() => {
    d.refresh();
    window.requestAnimationFrame(() => d.refresh());
  });
}

function buildDesktopSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="onboarding-overview"]',
      popover: {
        title: "Přehled",
        description: "Vítejte v aplikaci! Tady je vaše hlavní velitelské centrum.",
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
      element: '[data-tour="onboarding-autopilot"]',
      popover: {
        title: "Autopilot",
        description:
          "Tady necháte Radar a Sniper běžet za vás. Hromadné sbírání leadů i odesílání e-mailů na jedno místo.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-crm"]',
      popover: {
        title: "CRM",
        description:
          "Tady spravujete leady, dealy a celou pipeline. Přehled o tom, co se právě řeší.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-settings"]',
      popover: {
        title: "Pracovní prostor",
        description:
          "Než začnete pracovat, nastavte si profil a firmu, aby zprávy zněly přesně jako vy.",
        side: "right",
        align: "end",
      },
    },
    {
      element: '[data-tour="onboarding-help"]',
      popover: {
        title: "Centrum nápovědy",
        description:
          "FAQ, návody a znovuspuštění této prohlídky. Když něco nevíte, začněte tady.",
        side: "right",
        align: "end",
      },
    },
    {
      element: '[data-tour="onboarding-copilot"]',
      popover: {
        title: "AI asistent",
        description:
          "Kdykoli se zaseknete, klikněte sem. Asistent vám pomůže se vším dalším v aplikaci.",
        side: "left",
        align: "end",
      },
    },
  ];
}

function buildMobileSteps(): DriveStep[] {
  return [
    {
      element: 'nav[data-tour="onboarding-mobile-tabs"] [data-tour="onboarding-overview"]',
      popover: {
        title: "Přehled",
        description: "Vítejte v aplikaci! Tady je vaše hlavní velitelské centrum.",
        side: "top",
        align: "start",
      },
    },
    {
      element: 'nav[data-tour="onboarding-mobile-tabs"] [data-tour="onboarding-sniper"]',
      popover: {
        title: "Sniper",
        description: "Tady probíhá hlavní kouzlo. Sniper vám vygeneruje emaily přesně na míru.",
        side: "top",
        align: "center",
      },
    },
    {
      element: 'nav[data-tour="onboarding-mobile-tabs"] [data-tour="onboarding-radar"]',
      popover: {
        title: "Radar",
        description:
          "Tohle je váš vyhledávač. Zde najdete nové klienty a získáte na ně kontaktní údaje.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="onboarding-autopilot-page"]',
      popover: {
        title: "Autopilot",
        description:
          "Tady necháte Radar a Sniper běžet za vás. Hromadné sbírání leadů i odesílání e-mailů na jedno místo.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: 'nav[data-tour="onboarding-mobile-tabs"] [data-tour="onboarding-crm"]',
      popover: {
        title: "CRM",
        description:
          "Tady spravujete leady, dealy a celou pipeline. Přehled o tom, co se právě řeší.",
        side: "top",
        align: "end",
      },
    },
    {
      element: '[data-tour="onboarding-mobile-menu"]',
      popover: {
        title: "Pracovní prostor",
        description:
          "V menu najdete pracovní prostor. Nastavte si profil, aby zprávy zněly jako vy.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: '[data-tour="onboarding-help-page"]',
      popover: {
        title: "Centrum nápovědy",
        description:
          "FAQ, návody a znovuspuštění této prohlídky. Když něco nevíte, začněte tady.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="onboarding-copilot-mobile"]',
      popover: {
        title: "AI asistent",
        description:
          "Kdykoli se zaseknete, klikněte sem. Asistent vám pomůže se vším dalším v aplikaci.",
        side: "bottom",
        align: "end",
      },
    },
  ];
}

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

function tourSteps() {
  return isDesktopViewport() ? buildDesktopSteps() : buildMobileSteps();
}

function missingTourSelectors(): string[] {
  return tourSteps()
    .map((step) => (typeof step.element === "string" ? step.element : null))
    .filter((s): s is string => Boolean(s))
    .filter((s) => !document.querySelector(s));
}

export function VenegardOnboardingTour({
  active,
  userId,
  onCompleted,
  preview = false,
}: {
  active: boolean;
  userId: string | null;
  onCompleted: () => void;
  /** true = náhled (?tour=1), neuloží dokončení */
  preview?: boolean;
}) {
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  const persistRef = useRef(false);
  const runKeyRef = useRef<string | null>(null);
  const navBusyRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  const previewRef = useRef(preview);
  const routerRef = useRef(router);
  onCompletedRef.current = onCompleted;
  previewRef.current = preview;
  routerRef.current = router;

  useEffect(() => {
    if (!active || !userId) {
      // Uvolni klíč, ať jde tour znovu spustit (náhled z nápovědy)
      if (!active) {
        runKeyRef.current = null;
      }
      return;
    }

    const runKey = `${userId}:${preview ? "preview" : "live"}`;
    // Stejný běh už jednou startoval — nespouštět znovu (ani po destroy / re-renderu)
    if (runKeyRef.current === runKey) {
      return;
    }
    runKeyRef.current = runKey;
    persistRef.current = false;
    navBusyRef.current = false;

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number | undefined;

    const finish = async () => {
      if (cancelled || persistRef.current) return;
      persistRef.current = true;

      if (previewRef.current) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("venegard-tour-preview");
          const url = new URL(window.location.href);
          if (url.searchParams.has("tour")) {
            url.searchParams.delete("tour");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          }
        }
        onCompletedRef.current();
        return;
      }

      const res = await completeOnboardingTour();
      if (res.ok) {
        onCompletedRef.current();
      } else {
        persistRef.current = false;
      }
    };

    const moveToStep = async (d: Driver, index: number) => {
      if (cancelled || navBusyRef.current) return;
      navBusyRef.current = true;
      try {
        const href = TOUR_STEP_HREFS[index] ?? "/";
        const steps = tourSteps();
        const selector =
          typeof steps[index]?.element === "string" ? (steps[index].element as string) : null;
        const isCopilotStep = isCopilotStepIndex(index);

        d.setConfig({
          ...d.getConfig(),
          stageRadius: isCopilotStep ? 999 : 16,
          stagePadding: isCopilotStep ? 4 : 0,
        });

        await goToTourStep(routerRef.current, href);
        if (cancelled) return;
        if (selector) await waitForSelector(selector);
        if (cancelled) return;

        d.moveTo(index);
        refreshDriver(d);
      } finally {
        navBusyRef.current = false;
      }
    };

    const start = () => {
      if (cancelled || driverRef.current?.isActive()) return;
      const missing = missingTourSelectors();
      // Stránkové kotvy (Autopilot/Help) a FAB přibývají až po navigaci / mountu
      const criticalMissing = missing.filter(
        (s) =>
          !s.includes("onboarding-copilot") &&
          !s.includes("onboarding-autopilot-page") &&
          !s.includes("onboarding-help-page"),
      );
      if (criticalMissing.length > 0) return false;

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
        stagePadding: 0,
        stageRadius: 16,
        steps: tourSteps(),
        onHighlightStarted: (_el, _step, { driver: activeDriver, state }) => {
          const index = state.activeIndex ?? 0;
          const isCopilotStep = isCopilotStepIndex(index);
          activeDriver.setConfig({
            ...activeDriver.getConfig(),
            // FAB je kruh — velký radius = kulatý výřez
            stageRadius: isCopilotStep ? 999 : 16,
            stagePadding: isCopilotStep ? 4 : 0,
          });
        },
        onNextClick: (_el, _step, { driver: activeDriver, state }) => {
          if (navBusyRef.current) return;
          const current = state.activeIndex ?? 0;
          if (activeDriver.isLastStep()) {
            activeDriver.destroy();
            return;
          }
          void moveToStep(activeDriver, current + 1);
        },
        onPrevClick: (_el, _step, { driver: activeDriver, state }) => {
          if (navBusyRef.current) return;
          const current = state.activeIndex ?? 0;
          if (current <= 0) return;
          void moveToStep(activeDriver, current - 1);
        },
        onCloseClick: (_el, _step, { driver: activeDriver }) => {
          if (!activeDriver.isActive()) return;
          activeDriver.destroy();
        },
        onDestroyed: () => {
          driverRef.current = null;
          // Jen při reálném zavření uživatelem — ne při cleanup re-renderu
          if (!cancelled) {
            void finish();
          }
        },
      });

      driverRef.current = d;

      void (async () => {
        try {
          await goToTourStep(routerRef.current, TOUR_STEP_HREFS[0]);
          if (cancelled) return;
          const first = tourSteps()[0]?.element;
          if (typeof first === "string") await waitForSelector(first);
          if (cancelled) return;
          d.drive(0);
          refreshDriver(d);
        } catch (error) {
          console.error("onboarding tour start failed:", error);
          driverRef.current = null;
        }
      })();

      return true;
    };

    const tick = () => {
      if (cancelled) return;
      if (start()) return;
      attempts += 1;
      if (attempts < 40 && !cancelled) {
        timeoutId = window.setTimeout(tick, 150);
      } else if (!cancelled) {
        console.warn("onboarding tour: chybí elementy", missingTourSelectors());
      }
    };

    const rafId = window.requestAnimationFrame(() => tick());

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const activeDriver = driverRef.current;
      driverRef.current = null;
      if (activeDriver?.isActive()) {
        activeDriver.destroy();
      }
    };
  }, [active, userId, preview]);

  return null;
}
