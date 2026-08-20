"use client";

import { useEffect, type RefObject } from "react";

/**
 * Keeps a block inside its parent's content box by scaling it down, so a page
 * that must never scroll can still show everything. It only ever shrinks, so at
 * comfortable window sizes the layout renders at its designed scale.
 *
 * The measurement is synchronous on purpose. Deferring it to an animation frame
 * would leave the page unscaled whenever it loads in a background tab, because
 * browsers suspend those frames until the tab is shown.
 *
 * Pass `enabled: false` while another animation owns `transform` on a parent
 * (e.g. landing → login rise) — otherwise scale + translate fight and stutter.
 */
export function useFitToViewport(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const frame =
      element.closest(".l2-page") ??
      element.closest(".sklyvo-login") ??
      element.parentElement;
    if (!frame) return;

    if (!enabled) {
      element.style.transform = "";
      return;
    }

    const fit = () => {
      // offsetWidth/Height are the untransformed layout size, so reading them
      // back after scaling cannot feed into itself
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (!width || !height) return;

      const style = getComputedStyle(frame);
      const availableWidth =
        frame.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const availableHeight =
        frame.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);

      const scale = Math.min(
        1,
        availableWidth / width,
        availableHeight / height,
      );
      const transform = scale < 1 ? `scale(${scale.toFixed(4)})` : "";

      if (element.style.transform !== transform) {
        element.style.transform = transform;
      }
    };

    fit();

    // catches the window resizing, fonts landing, and the copy changing length
    // when the language is switched
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    observer.observe(frame);
    window.addEventListener("resize", fit);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      element.style.transform = "";
    };
  }, [ref, enabled]);
}
