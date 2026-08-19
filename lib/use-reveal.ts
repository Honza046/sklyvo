"use client";

import { useEffect } from "react";

/**
 * Fades every `[data-reveal]` block up as it scrolls into view, once. Blocks
 * that share a row are staggered slightly so they do not all land together.
 */
export function useReveal() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (!elements.length) return;

    // never leave the page invisible: without an observer, or when the reader
    // asked for less motion, show everything straight away
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      for (const element of elements) element.classList.add("in");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "-6% 0px -6% 0px" },
    );

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${(index % 3) * 0.08}s`;
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);
}
