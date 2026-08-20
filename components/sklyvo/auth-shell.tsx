"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  AUTH_HANDOFF_EASE,
  AUTH_HANDOFF_MS,
  clearAuthFromLanding,
  peekAuthFromLanding,
} from "@/components/sklyvo/landing-auth-link";
import { Globe } from "@/components/sklyvo/globe";
import { LanguageToggle } from "@/components/sklyvo/language-toggle";
import { useLanguage } from "@/components/sklyvo/language-provider";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { useFitToViewport } from "@/lib/use-fit-to-viewport";
import { LegalDocumentDialog } from "@/components/legal/legal-document-dialog";
import { LEGAL_DOCUMENT_IDS } from "@/lib/legal/types";
import type { LegalDocumentId } from "@/lib/legal/types";
import "@/components/sklyvo/login-v2.css";

const HEIGHT_MS = 560;
const EASING = "cubic-bezier(0.33, 0.01, 0.2, 1)";
const LOGIN_HEIGHT_KEY = "sklyvo-auth-login-h";

export type AuthMode = "login" | "register" | "recovery";

let persistedCardHeight: number | null = null;
let persistedLoginHeight: number | null = null;

/** Prevents Strict Mode remount from restarting the rise mid-flight. */
let landingEnterActive = false;

function readStoredLoginHeight() {
  if (typeof window === "undefined") return null;
  const value = Number(sessionStorage.getItem(LOGIN_HEIGHT_KEY));
  // Ignore stale inflated values from the old 560px fallback era.
  return Number.isFinite(value) && value > 200 && value < 700 ? value : null;
}

function storeLoginHeight(height: number) {
  persistedLoginHeight = height;
  sessionStorage.setItem(LOGIN_HEIGHT_KEY, String(height));
}

function resolveLoginHeight(natural: number) {
  return persistedLoginHeight ?? readStoredLoginHeight() ?? natural;
}

/**
 * Natural height of the form card. Crest lives inside `.l2-card__body`, so we
 * only sum body + seats — counting crest again left empty space under the form.
 */
function measureContentHeight(card: HTMLElement) {
  const body = card.querySelector(".l2-card__body");
  const seats = card.querySelector(".l2-seats");
  const seatsH =
    seats instanceof HTMLElement && seats.getAttribute("data-open") === "true"
      ? seats.offsetHeight
      : 0;

  let bodyH = 0;
  if (body instanceof HTMLElement) {
    const prevHeight = card.style.height;
    const prevFlex = body.style.flex;
    card.style.height = "auto";
    body.style.flex = "0 0 auto";
    bodyH = body.scrollHeight;
    body.style.flex = prevFlex;
    card.style.height = prevHeight;
  }

  return Math.ceil(bodyH + seatsH);
}

function modeFromPath(pathname: string): AuthMode {
  if (pathname.startsWith("/register")) return "register";
  if (pathname.startsWith("/recovery")) return "recovery";
  return "login";
}

function Crest({ mode }: { mode: AuthMode }) {
  if (mode === "register") {
    return (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F2F3F5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    );
  }

  if (mode === "recovery") {
    return (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F2F3F5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    );
  }

  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F2F3F5"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

export function AuthChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = modeFromPath(pathname);
  const { t } = useLanguage();
  const copy = t[mode];
  const loginCopy = t.login as typeof t.login & {
    slotsLine?: string;
    close?: string;
    legalList?: string[];
  };

  const formCardRef = useRef<HTMLElement>(null);
  const globeCardRef = useRef<HTMLElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLDivElement>(null);
  const prevModeRef = useRef<AuthMode | null>(null);
  const prevStepRef = useRef<string | null>(null);

  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [authStep, setAuthStep] = useState<string | null>(null);
  const [fromLanding, setFromLanding] = useState(false);
  const [chromeReady, setChromeReady] = useState(false);
  const [globeReady, setGlobeReady] = useState(true);
  const [banner, setBanner] = useState(true);
  const [legalDoc, setLegalDoc] = useState<LegalDocumentId | null>(null);

  useFitToViewport(authRef, !fromLanding);

  // Imperative enter: avoid CSS keyframes tied to React state (Strict Mode
  // remounts restart them mid-flight and it reads as stutter).
  useLayoutEffect(() => {
    if (!peekAuthFromLanding()) return;

    // Hide real logo/lang before paint (layout effect re-render is sync enough).
    setFromLanding(true);
    setGlobeReady(false);

    const stage = enterRef.current;
    const legal = document.querySelector(".l2-page .l2-legal");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (stage && !reduced) {
      if (!landingEnterActive) {
        landingEnterActive = true;
        // Transform only — opacity:0 before first paint is what flashed black.
        stage.style.transform = "translate3d(0, 36px, 0)";
        stage.style.willChange = "transform";
        void stage.offsetHeight;
        stage.style.transition = `transform ${AUTH_HANDOFF_MS}ms ${AUTH_HANDOFF_EASE}`;
        stage.style.transform = "translate3d(0, 0, 0)";
      } else {
        stage.style.transform = "translate3d(0, 0, 0)";
      }
    }

    // Legal can soft-fade on the next frame (never force a blank first paint).
    if (legal instanceof HTMLElement && !reduced && !legal.dataset.handOff) {
      legal.dataset.handOff = "1";
      legal.style.opacity = "0";
      requestAnimationFrame(() => {
        legal.style.transition = `opacity ${AUTH_HANDOFF_MS}ms ${AUTH_HANDOFF_EASE}`;
        legal.style.opacity = "1";
      });
    }

    const bridge = document.getElementById("sk-auth-chrome-bridge");
    let settled = false;
    let settleTimer = 0;
    let globeTimer = 0;

    // Hard cut after the FULL spread — settling on the first transitionend
    // (top OR left) cut the bridge away mid-move and read as a blink.
    const settleChrome = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(settleTimer);

      // Reveal real chrome in the DOM first, then drop the bridge — same frame,
      // no flushSync (illegal inside layout/lifecycle).
      const page = document.querySelector(".l2-page");
      if (page instanceof HTMLElement) {
        page.setAttribute("data-chrome-ready", "true");
      }
      for (const el of document.querySelectorAll(".l2-brand, .lang--night")) {
        if (el instanceof HTMLElement) el.style.visibility = "visible";
      }
      document.getElementById("sk-auth-chrome-bridge")?.remove();
      setChromeReady(true);
    };

    settleTimer = window.setTimeout(
      settleChrome,
      bridge ? AUTH_HANDOFF_MS + 32 : 0,
    );

    // Mount the heavy globe after the rise is underway so it doesn't hitch frames.
    globeTimer = window.setTimeout(() => setGlobeReady(true), 420);

    const clearTimer = window.setTimeout(() => {
      landingEnterActive = false;
      setFromLanding(false);
      setChromeReady(false);
      clearAuthFromLanding();
      if (stage) {
        stage.style.willChange = "";
        stage.style.transition = "";
        stage.style.transform = "";
      }
      for (const el of document.querySelectorAll(".l2-brand, .lang--night")) {
        if (el instanceof HTMLElement) el.style.visibility = "";
      }
      if (legal instanceof HTMLElement) {
        delete legal.dataset.handOff;
        legal.style.transition = "";
        legal.style.opacity = "";
      }
    }, AUTH_HANDOFF_MS + 160);

    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(globeTimer);
      window.clearTimeout(clearTimer);
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.querySelector(".sklyvo-auth");
    if (!(root instanceof HTMLElement)) return;

    const readStep = () => root.getAttribute("data-step");
    setAuthStep(readStep());

    const observer = new MutationObserver(() => {
      setAuthStep(readStep());
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-step"],
    });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    // Don't thrash card heights while the landing enter is running.
    if (fromLanding || peekAuthFromLanding()) return;

    const form = formCardRef.current;
    const globe = globeCardRef.current;
    if (!form || !globe) return;

    const cards = [form, globe];
    let frame = 0;
    let settleTimer = 0;
    let finished = false;

    const natural = measureContentHeight(form);
    const liveStep =
      form.closest(".sklyvo-auth")?.getAttribute("data-step") ?? authStep;
    const isTwoFactor = mode === "login" && liveStep === "2fa";

    let target = natural;
    if (mode === "login" && !isTwoFactor) {
      storeLoginHeight(natural);
      target = natural;
    } else if (mode === "recovery" || isTwoFactor) {
      const loginH = resolveLoginHeight(natural);
      const slack = Math.max(0, loginH - natural);
      target = Math.max(natural, Math.round(loginH - slack * 0.25));
    } else {
      const loginH = resolveLoginHeight(natural);
      target = Math.max(natural, loginH);
    }

    const paint = (px: number, transition: string) => {
      for (const el of cards) {
        el.style.transition = transition;
        el.style.height = `${px}px`;
      }
      setCardHeight(px);
    };

    const prevMode = prevModeRef.current;
    const prevStep = prevStepRef.current;
    prevModeRef.current = mode;
    prevStepRef.current = liveStep;

    const stepChanged = prevStep !== liveStep;
    const modeChanged = prevMode != null && prevMode !== mode;
    const shouldAnimate =
      prevMode != null &&
      persistedCardHeight != null &&
      Math.abs(persistedCardHeight - target) > 2 &&
      (modeChanged || stepChanged);

    if (!shouldAnimate) {
      persistedCardHeight = target;
      paint(target, "none");
      return;
    }

    const startHeight = persistedCardHeight!;
    let cancelledEarly = false;

    setAnimating(true);
    paint(startHeight, "none");
    void form.offsetHeight;

    const transition = `height ${HEIGHT_MS}ms ${EASING}`;
    frame = requestAnimationFrame(() => {
      if (cancelledEarly) return;
      paint(target, transition);
    });

    const finish = () => {
      if (finished) return;
      finished = true;
      for (const el of cards) el.style.transition = "none";
      persistedCardHeight = target;
      setCardHeight(target);
      setAnimating(false);
    };

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== form || event.propertyName !== "height") return;
      form.removeEventListener("transitionend", onEnd);
      window.clearTimeout(settleTimer);
      finish();
    };

    form.addEventListener("transitionend", onEnd);
    settleTimer = window.setTimeout(() => {
      form.removeEventListener("transitionend", onEnd);
      finish();
    }, HEIGHT_MS + 120);

    return () => {
      cancelledEarly = true;
      cancelAnimationFrame(frame);
      form.removeEventListener("transitionend", onEnd);
      window.clearTimeout(settleTimer);
      if (!finished) {
        persistedCardHeight = startHeight;
        for (const el of cards) el.style.transition = "none";
      }
    };
  }, [mode, authStep, banner, fromLanding]);

  const legalList = loginCopy.legalList ?? [
    "Zásady ochrany osobních údajů",
    "Podmínky použití",
    "Zpracování dat",
    "Cookies",
  ];

  return (
    <main
      className="l2-page"
      data-from-landing={fromLanding ? "true" : undefined}
      data-chrome-ready={chromeReady ? "true" : undefined}
    >
      <Link className="l2-brand" href="/" aria-label="Sklyvo — zpět na úvod">
        <SklyvoMark size={28} reachY={0.72} interactive={false} />
        <span className="l2-brand__word">Sklyvo</span>
      </Link>

      <LanguageToggle variant="night" />

      <div ref={enterRef} className="l2-auth-enter">
        <div
          className="l2-auth sklyvo-auth"
          ref={authRef}
          data-mode={mode}
          data-animating={animating ? "true" : undefined}
          data-from-landing={fromLanding ? "true" : undefined}
        >
          <section
            ref={formCardRef}
            className="l2-card"
            style={cardHeight != null ? { height: cardHeight } : undefined}
          >
            {mode === "login" ? (
              <div className="l2-seats" data-open={banner}>
                <span className="l2-seats__label">
                  <span className="l2-seats__dot" />
                  <span className="l2-seats__text">
                    {loginCopy.slotsLine ?? "27 z 500 míst zbývá"}
                  </span>
                </span>
                <button
                  type="button"
                  className="l2-seats__close"
                  aria-label={loginCopy.close ?? "Zavřít"}
                  onClick={() => setBanner(false)}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#08090A"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="19" y1="5" x2="5" y2="19" />
                  </svg>
                </button>
              </div>
            ) : null}

            <div className="l2-card__body">
              <div className="l2-crest">
                <span className="l2-crest__box">
                  <Crest mode={mode} />
                </span>
              </div>
              <div key={mode} className="sklyvo-auth-panel">
                {children}
              </div>
            </div>
          </section>

          <aside
            ref={globeCardRef}
            className="l2-globe-card"
            style={cardHeight != null ? { height: cardHeight } : undefined}
          >
            <div className="l2-globe-card__head">
              <h2 className="l2-globe-card__title">{copy.globeTitle}</h2>
              <p className="l2-globe-card__body">{copy.globeBody}</p>
            </div>
            <div className="l2-globe-card__stage">
              {globeReady ? (
                <Globe
                  size={500}
                  theme="night"
                  className="l2-globe-card__canvas"
                />
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      <div className="l2-legal">
        {LEGAL_DOCUMENT_IDS.map((id, index) => (
          <button
            key={id}
            type="button"
            data-legal
            onClick={() => setLegalDoc(id)}
          >
            {legalList[index] ?? id}
          </button>
        ))}
      </div>

      <LegalDocumentDialog
        documentId={legalDoc}
        onOpenChange={(open) => {
          if (!open) setLegalDoc(null);
        }}
      />
    </main>
  );
}
