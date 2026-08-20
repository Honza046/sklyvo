"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

const EXIT_MS = 520;
const REVEAL_MS = 680;
export const FROM_LANDING_KEY = "sklyvo-auth-from-landing";
const CURTAIN_ID = "sk-auth-curtain";

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

function ensureAuthCurtain() {
  let curtain = document.getElementById(CURTAIN_ID);
  if (!curtain) {
    curtain = document.createElement("div");
    curtain.id = CURTAIN_ID;
    curtain.className = "sk-auth-curtain";
    curtain.setAttribute("aria-hidden", "true");
    document.body.appendChild(curtain);
  }
  curtain.classList.remove("is-exiting");
  return curtain;
}

export function revealAuthCurtain() {
  const curtain = document.getElementById(CURTAIN_ID);
  if (!curtain) return;
  curtain.classList.remove("is-entering");
  curtain.classList.add("is-exiting");
  window.setTimeout(() => {
    curtain.remove();
  }, REVEAL_MS + 40);
}

type LandingAuthLinkProps = {
  href: "/login" | "/register";
  className?: string;
  children: React.ReactNode;
};

export function LandingAuthLink({
  href,
  className,
  children,
}: LandingAuthLinkProps) {
  const router = useRouter();
  const busyRef = useRef(false);

  const navigate = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (busyRef.current) return;
      busyRef.current = true;

      markAuthFromLanding();

      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }

      const curtain = ensureAuthCurtain();
      const page = document.querySelector(".lp-page");

      requestAnimationFrame(() => {
        curtain.classList.add("is-entering");
        if (page instanceof HTMLElement) {
          page.classList.add("lp-page--exit");
        }
      });

      window.setTimeout(() => router.push(href), EXIT_MS);
    },
    [href, router],
  );

  return (
    <Link className={className} href={href} onClick={navigate}>
      {children}
    </Link>
  );
}
