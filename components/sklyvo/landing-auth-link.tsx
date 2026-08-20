"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, type AnchorHTMLAttributes } from "react";

/** Chrome spread duration — GPU transform only (no top/left layout thrash). */
export const AUTH_HANDOFF_MS = 820;
export const AUTH_HANDOFF_EASE = "cubic-bezier(0.22, 0.8, 0.2, 1)";

/** Let the spread run on the compositor before the route swap hits the main thread. */
const NAVIGATE_AFTER_MS = 420;

export const FROM_LANDING_KEY = "sklyvo-auth-from-landing";

const BRIDGE_ID = "sk-auth-chrome-bridge";

/** Survives React Strict Mode remount (sessionStorage alone gets cleared too early). */
let authLandingTransitionPending = false;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function markAuthFromLanding() {
  authLandingTransitionPending = true;
  sessionStorage.setItem(FROM_LANDING_KEY, "1");
}

export function peekAuthFromLanding() {
  return (
    authLandingTransitionPending ||
    sessionStorage.getItem(FROM_LANDING_KEY) === "1"
  );
}

export function clearAuthFromLanding() {
  authLandingTransitionPending = false;
  sessionStorage.removeItem(FROM_LANDING_KEY);
}

/** @deprecated curtain removed — kept so older callers don't break */
export function revealAuthCurtain() {
  /* no-op */
}

export function releaseChromeBridge() {
  document.getElementById(BRIDGE_ID)?.remove();
}

function loginChromeTargets() {
  const narrow = window.matchMedia("(max-width: 860px)").matches;
  return {
    brandTop: narrow ? 20 : 26,
    brandLeft: narrow ? 20 : 28,
    langTop: narrow ? 18 : 26,
    langRight: narrow ? 20 : 28,
  };
}

function freezeClone(el: HTMLElement) {
  el.removeAttribute("href");
  el.querySelectorAll("a, button").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.removeAttribute("href");
    node.setAttribute("tabindex", "-1");
    node.style.pointerEvents = "none";
  });
}

function pinFixed(el: HTMLElement, rect: DOMRect) {
  Object.assign(el.style, {
    position: "fixed",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    right: "auto",
    margin: "0",
    zIndex: "100002",
    transition: "none",
    transform: "translate3d(0, 0, 0)",
    willChange: "transform",
    pointerEvents: "none",
    backfaceVisibility: "hidden",
  });
}

/**
 * Lift logo + lang into a body-level bridge so they survive the route change,
 * then slide them with transform (compositor-friendly) to login edge positions.
 */
function mountChromeBridge(page: HTMLElement) {
  releaseChromeBridge();

  const brand = page.querySelector(".lp2-brand");
  const lang =
    page.querySelector(".lp2-headend .lp2-lang") ??
    page.querySelector(".lp2-menu .lp2-lang") ??
    page.querySelector(".lp2-lang");
  if (!(brand instanceof HTMLElement) || !(lang instanceof HTMLElement)) {
    return () => {};
  }

  const brandRect = brand.getBoundingClientRect();
  const langRect = lang.getBoundingClientRect();
  const targets = loginChromeTargets();

  const bridge = document.createElement("div");
  bridge.id = BRIDGE_ID;
  bridge.className = "sk-auth-chrome-bridge";
  bridge.setAttribute("aria-hidden", "true");

  const brandClone = brand.cloneNode(true) as HTMLElement;
  const langClone = lang.cloneNode(true) as HTMLElement;
  freezeClone(brandClone);
  freezeClone(langClone);
  pinFixed(brandClone, brandRect);
  pinFixed(langClone, langRect);

  bridge.append(brandClone, langClone);
  document.body.append(bridge);

  brand.style.visibility = "hidden";
  lang.style.visibility = "hidden";

  const brandDx = targets.brandLeft - brandRect.left;
  const brandDy = targets.brandTop - brandRect.top;
  const langLeft = Math.max(
    0,
    window.innerWidth - targets.langRight - langRect.width,
  );
  const langDx = langLeft - langRect.left;
  const langDy = targets.langTop - langRect.top;

  const transition = `transform ${AUTH_HANDOFF_MS}ms ${AUTH_HANDOFF_EASE}`;

  return () => {
    brandClone.style.transition = transition;
    langClone.style.transition = transition;
    brandClone.style.transform = `translate3d(${brandDx}px, ${brandDy}px, 0)`;
    langClone.style.transform = `translate3d(${langDx}px, ${langDy}px, 0)`;
  };
}

type LandingAuthLinkProps = {
  href: "/login" | "/register";
  className?: string;
  children: React.ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">;

export function LandingAuthLink({
  href,
  className,
  children,
  onClick,
  ...rest
}: LandingAuthLinkProps) {
  const router = useRouter();
  const busyRef = useRef(false);

  const navigate = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      if (busyRef.current) return;
      busyRef.current = true;

      markAuthFromLanding();
      router.prefetch(href);

      if (prefersReducedMotion()) {
        releaseChromeBridge();
        router.push(href);
        return;
      }

      const page =
        document.querySelector(".lp2-page") ?? document.querySelector(".lp-page");

      const slideChrome =
        page instanceof HTMLElement ? mountChromeBridge(page) : () => {};

      // Double rAF so the pinned layer paints before the transform transition.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          slideChrome();
          if (page instanceof HTMLElement) {
            page.classList.add("lp2-page--exit");
            page.classList.add("lp-page--exit");
          }
          window.setTimeout(() => router.push(href), NAVIGATE_AFTER_MS);
        });
      });
    },
    [href, onClick, router],
  );

  return (
    <Link className={className} href={href} onClick={navigate} {...rest}>
      {children}
    </Link>
  );
}
