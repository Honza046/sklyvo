"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { completeOnboardingTour } from "@/app/actions/onboarding-tour";
import { TOUR_STEP_ICON_SVGS } from "@/components/sklyvo/nav-icons";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationParams } from "@/lib/i18n/types";

const TOUR_POPOVER_CLASS = "sklyvo-driver-popover sk-tour-popover";

const TOUR_STEP_COUNT = 7;

type TourTranslate = (path: string, params?: TranslationParams) => string;

const TOUR_ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

type PopoverDom = {
  wrapper: HTMLElement;
  title: HTMLElement;
  description: HTMLElement;
  footer: HTMLElement;
  progress: HTMLElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
};

function renderTourChrome(
  popover: PopoverDom,
  activeIndex: number,
  totalSteps: number,
  t: TourTranslate,
) {
  const { wrapper, title, description, footer, progress, previousButton, nextButton } =
    popover;
  const isLast = activeIndex >= totalSteps - 1;

  let top = wrapper.querySelector<HTMLElement>(".sk-tour-top");
  if (!top) {
    top = document.createElement("div");
    top.className = "sk-tour-top";
    wrapper.insertBefore(top, title);
  }

  top.innerHTML = `
    <span class="sk-tour-label">${t("tour.badge")}</span>
    <div class="sk-tour-dots" role="presentation">
      ${Array.from({ length: totalSteps }, (_, i) => {
        const active = i <= activeIndex;
        const current = i === activeIndex;
        return `<span class="sk-tour-dot${active ? " is-active" : ""}${current ? " is-current" : ""}"></span>`;
      }).join("")}
    </div>
  `;

  let icon = wrapper.querySelector<HTMLElement>(".sk-tour-icon");
  if (!icon) {
    icon = document.createElement("div");
    icon.className = "sk-tour-icon";
    wrapper.insertBefore(icon, title);
  }
  icon.innerHTML = TOUR_STEP_ICON_SVGS[activeIndex] ?? TOUR_STEP_ICON_SVGS[0];

  title.classList.add("sk-tour-title");
  description.classList.add("sk-tour-desc");

  progress.style.display = "none";
  footer.classList.add("sk-tour-footer");
  previousButton.classList.add("sk-tour-prev");
  nextButton.classList.add("sk-tour-next");

  nextButton.innerHTML = isLast
    ? `${t("tour.done")} ${TOUR_ARROW_SVG}`
    : `${t("tour.continue")} ${TOUR_ARROW_SVG}`;

  if (activeIndex <= 0) {
    previousButton.style.visibility = "hidden";
    previousButton.style.pointerEvents = "none";
  } else {
    previousButton.style.visibility = "";
    previousButton.style.pointerEvents = "";
  }
}

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

async function goToTourStep(
  router: ReturnType<typeof useRouter>,
  href: string,
) {
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

function buildDesktopSteps(t: TourTranslate): DriveStep[] {
  return [
    {
      element: '[data-tour="onboarding-overview"]',
      popover: {
        title: t("tour.steps.overviewTitle"),
        description: t("tour.steps.overviewDesc"),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-sniper"]',
      popover: {
        title: t("tour.steps.sniperTitle"),
        description: t("tour.steps.sniperDesc"),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-radar"]',
      popover: {
        title: t("tour.steps.radarTitle"),
        description: t("tour.steps.radarDesc"),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-autopilot"]',
      popover: {
        title: t("tour.steps.autopilotTitle"),
        description: t("tour.steps.autopilotDesc"),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-crm"]',
      popover: {
        title: t("tour.steps.crmTitle"),
        description: t("tour.steps.crmDesc"),
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="onboarding-settings"]',
      popover: {
        title: t("tour.steps.settingsTitle"),
        description: t("tour.steps.settingsDesc"),
        side: "right",
        align: "end",
      },
    },
    {
      element: '[data-tour="onboarding-help"]',
      popover: {
        title: t("tour.steps.helpTitle"),
        description: t("tour.steps.helpDesc"),
        side: "right",
        align: "end",
      },
    },
  ];
}

function tourSteps(t: TourTranslate) {
  return buildDesktopSteps(t);
}

function missingTourSelectors(t: TourTranslate): string[] {
  return tourSteps(t)
    .map((step) => (typeof step.element === "string" ? step.element : null))
    .filter((s): s is string => Boolean(s))
    .filter((s) => !document.querySelector(s));
}

export function SklyvoOnboardingTour({
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
  const { t } = useLanguage();
  const driverRef = useRef<Driver | null>(null);
  const persistRef = useRef(false);
  const runKeyRef = useRef<string | null>(null);
  const navBusyRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  const previewRef = useRef(preview);
  const routerRef = useRef(router);
  const tRef = useRef(t);
  onCompletedRef.current = onCompleted;
  previewRef.current = preview;
  routerRef.current = router;
  tRef.current = t;

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
    let started = false;
    const translate = (...args: Parameters<TourTranslate>) =>
      tRef.current(...args);

    const finish = async () => {
      if (cancelled || persistRef.current) return;
      persistRef.current = true;

      if (previewRef.current) {
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("sklyvo-tour-preview");
          const url = new URL(window.location.href);
          if (url.searchParams.has("tour")) {
            url.searchParams.delete("tour");
            window.history.replaceState(
              {},
              "",
              `${url.pathname}${url.search}${url.hash}`,
            );
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
        const steps = tourSteps(translate);
        const selector =
          typeof steps[index]?.element === "string"
            ? (steps[index].element as string)
            : null;
        const isCopilotStep = isCopilotStepIndex(index);

        d.setConfig({
          ...d.getConfig(),
          stageRadius: isCopilotStep ? 999 : 18,
          stagePadding: isCopilotStep ? 6 : 10,
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
      if (cancelled || started || driverRef.current?.isActive()) return false;
      const missing = missingTourSelectors(translate);
      // Stránkové kotvy (Autopilot/Help) a FAB přibývají až po navigaci / mountu
      const criticalMissing = missing.filter(
        (s) =>
          !s.includes("onboarding-autopilot-page") &&
          !s.includes("onboarding-help-page"),
      );
      if (criticalMissing.length > 0) return false;

      started = true;
      const d = driver({
        showProgress: false,
        nextBtnText: translate("tour.continue"),
        prevBtnText: translate("tour.back"),
        doneBtnText: translate("tour.done"),
        animate: true,
        smoothScroll: true,
        allowClose: true,
        popoverClass: TOUR_POPOVER_CLASS,
        overlayOpacity: 0.62,
        overlayColor: "#000000",
        /* Tight cutout — no gray “pad” of sidebar around the target */
        stagePadding: 2,
        stageRadius: 12,
        popoverOffset: 16,
        steps: tourSteps(translate),
        onPopoverRender: (popover, { state }) => {
          renderTourChrome(
            popover as PopoverDom,
            state.activeIndex ?? 0,
            TOUR_STEP_COUNT,
            translate,
          );
        },
        onHighlightStarted: (_el, _step, { driver: activeDriver, state }) => {
          const index = state.activeIndex ?? 0;
          const isCopilotStep = isCopilotStepIndex(index);
          activeDriver.setConfig({
            ...activeDriver.getConfig(),
            // FAB je kruh — velký radius = kulatý výřez; nav = těsný výřez bez šedého rámu
            stageRadius: isCopilotStep ? 999 : 12,
            stagePadding: isCopilotStep ? 6 : 2,
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
          const first = tourSteps(translate)[0]?.element;
          if (typeof first === "string") await waitForSelector(first);
          if (cancelled) return;
          d.drive(0);
          refreshDriver(d);
        } catch (error) {
          console.error("onboarding tour start failed:", error);
          driverRef.current = null;
          started = false;
          if (runKeyRef.current === runKey) {
            runKeyRef.current = null;
          }
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
        console.warn(
          "onboarding tour: chybí elementy",
          missingTourSelectors(translate),
        );
        runKeyRef.current = null;
      }
    };

    const rafId = window.requestAnimationFrame(() => tick());

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const activeDriver = driverRef.current;
      driverRef.current = null;
      // Strict Mode / remount: uvolni klíč, ať se tour může spustit znovu
      if (runKeyRef.current === runKey) {
        runKeyRef.current = null;
      }
      if (activeDriver?.isActive()) {
        activeDriver.destroy();
      }
    };
  }, [active, userId, preview]);

  return null;
}
