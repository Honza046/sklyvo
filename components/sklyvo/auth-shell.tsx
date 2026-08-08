"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { Globe } from "@/components/sklyvo/globe";
import { LanguageToggle } from "@/components/sklyvo/language-toggle";
import { useLanguage } from "@/components/sklyvo/language-provider";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";

const HEIGHT_MS = 560;
const EASING = "cubic-bezier(0.33, 0.01, 0.2, 1)";
const LOGIN_HEIGHT_KEY = "sklyvo-auth-login-h";
/** Fallback when recovery is opened before login was ever measured. */
const LOGIN_HEIGHT_FALLBACK = 560;

export type AuthMode = "login" | "register" | "recovery";

let persistedCardHeight: number | null = null;
let persistedLoginHeight: number | null = null;

function readStoredLoginHeight() {
  if (typeof window === "undefined") return null;
  const value = Number(sessionStorage.getItem(LOGIN_HEIGHT_KEY));
  return Number.isFinite(value) && value > 200 ? value : null;
}

function storeLoginHeight(height: number) {
  persistedLoginHeight = height;
  sessionStorage.setItem(LOGIN_HEIGHT_KEY, String(height));
}

function resolveLoginHeight(natural: number) {
  return (
    persistedLoginHeight ??
    readStoredLoginHeight() ??
    Math.max(natural, LOGIN_HEIGHT_FALLBACK)
  );
}

function initialCardHeight(): number {
  // Must match SSR — never read sessionStorage here (would hydrate mismatch).
  return persistedCardHeight ?? LOGIN_HEIGHT_FALLBACK;
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
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="oklch(0.28 0.015 250)"
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
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="oklch(0.28 0.015 250)"
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
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="oklch(0.28 0.015 250)"
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

/**
 * Measure the height the card NEEDS for its content.
 * Sum crest + body children — don't use the card's bounding box (flex stretch /
 * locked height would report the tall size and skip the shrink animation).
 */
function measureContentHeight(card: HTMLElement) {
  const crest = card.querySelector(".sklyvo-card__crest");
  const body = card.querySelector(".sklyvo-card__body");
  const styles = getComputedStyle(card);
  const pad =
    (parseFloat(styles.paddingTop) || 0) +
    (parseFloat(styles.paddingBottom) || 0);
  const crestH = crest instanceof HTMLElement ? crest.offsetHeight : 0;

  let bodyH = 0;
  if (body instanceof HTMLElement) {
    const prevFlex = body.style.flex;
    body.style.flex = "0 0 auto";
    bodyH = body.scrollHeight;
    body.style.flex = prevFlex;
  }

  return Math.ceil(crestH + bodyH + pad);
}

export function AuthChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = modeFromPath(pathname);
  const { t } = useLanguage();
  const copy = t[mode];

  const formCardRef = useRef<HTMLElement>(null);
  const globeCardRef = useRef<HTMLElement>(null);
  const prevModeRef = useRef<AuthMode | null>(null);

  const [cardHeight, setCardHeight] = useState<number>(initialCardHeight);
  const [animating, setAnimating] = useState(false);

  useLayoutEffect(() => {
    const form = formCardRef.current;
    const globe = globeCardRef.current;
    if (!form || !globe) return;

    const cards = [form, globe];
    let frame = 0;
    let settleTimer = 0;
    let finished = false;

    const natural = measureContentHeight(form);

    let target = natural;
    if (mode === "login") {
      storeLoginHeight(natural);
      target = natural;
    } else if (mode === "recovery") {
      // Always match login card height — even after hard refresh on /recovery.
      target = resolveLoginHeight(natural);
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
    prevModeRef.current = mode;

    // Refresh / first mount: snap to target — never animate (avoids the
    // globe card shrinking from auto-height then growing back).
    const shouldAnimate =
      prevMode != null &&
      prevMode !== mode &&
      persistedCardHeight != null &&
      Math.abs(persistedCardHeight - target) > 2;

    if (!shouldAnimate) {
      persistedCardHeight = target;
      paint(target, "none");
      return;
    }

    const startHeight = persistedCardHeight!;
    let cancelledEarly = false;

    // Growing with overflow:hidden clips the new fields (reads as a blink).
    // Snap open instantly; only animate when shrinking empty space away.
    if (target > startHeight + 2) {
      persistedCardHeight = target;
      paint(target, "none");
      return;
    }

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
        // Keep the height we were animating from so a remount can continue cleanly.
        persistedCardHeight = startHeight;
        for (const el of cards) el.style.transition = "none";
      }
    };
  }, [mode]);

  return (
    <main className="sklyvo-login">
      <div className="scene__layer scene__layer--high" />
      <div className="scene__layer scene__layer--mid" />
      <div className="scene__layer scene__layer--low" />
      <div className="scene__haze" />

      <div className="sklyvo-brand">
        <SklyvoMark size={30} />
        <span className="sklyvo-brand__word">Sklyvo</span>
      </div>

      <LanguageToggle />

      <div
        className="sklyvo-auth"
        data-mode={mode}
        data-animating={animating ? "true" : undefined}
      >
        <section
          ref={formCardRef}
          className="sklyvo-card sklyvo-card--form"
          style={{ height: cardHeight }}
        >
          <div className="sklyvo-card__crest">
            <span className="sklyvo-crest">
              <Crest mode={mode} />
            </span>
          </div>
          <div key={mode} className="sklyvo-card__body sklyvo-auth-panel">
            {children}
          </div>
        </section>

        <aside
          ref={globeCardRef}
          className="sklyvo-card sklyvo-card--globe"
          style={{ height: cardHeight }}
        >
          <div className="globe-card__head">
            <h2 className="globe-card__title">{copy.globeTitle}</h2>
            <p className="globe-card__body">{copy.globeBody}</p>
          </div>
          <div className="globe-card__stage">
            <Globe size={500} className="globe-card__canvas" />
          </div>
        </aside>
      </div>
    </main>
  );
}
