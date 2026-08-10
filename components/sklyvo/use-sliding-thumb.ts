"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

type ThumbState = {
  x: number;
  y: number;
  w: number;
  h: number;
  ready: boolean;
};

type SlidingThumbOptions = {
  /** Horizontal segment controls (default) or vertical sidebar list */
  axis?: "x" | "y";
};

/**
 * Measures the active [data-slide-item] inside a track and returns
 * style for an absolutely positioned sliding thumb.
 * Uses getBoundingClientRect so nested scroll regions stay correct.
 */
export function useSlidingThumb(
  activeIndex: number,
  extraDeps: unknown[] = [],
  options: SlidingThumbOptions = {},
): {
  trackRef: RefObject<HTMLElement | null>;
  thumbStyle: CSSProperties;
} {
  const axis = options.axis ?? "x";
  const trackRef = useRef<HTMLElement | null>(null);
  const [thumb, setThumb] = useState<ThumbState>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    ready: false,
  });

  /**
   * Never spread variable-length arrays into effect deps — React requires
   * a constant dependency count between renders.
   */
  const layoutEpoch = extraDeps.map(String).join("\u0001");

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    if (activeIndex < 0) {
      setThumb((prev) => ({ ...prev, ready: false }));
      return;
    }
    const items = track.querySelectorAll<HTMLElement>("[data-slide-item]");
    const el = items[activeIndex];
    if (!el) {
      setThumb((prev) => ({ ...prev, ready: false }));
      return;
    }
    const trackRect = track.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setThumb({
      x: elRect.left - trackRect.left,
      y: elRect.top - trackRect.top,
      w: elRect.width,
      h: elRect.height,
      ready: true,
    });
  }, [activeIndex]);

  useLayoutEffect(() => {
    update();
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => update();
    track.addEventListener("scroll", onScroll, { passive: true });
    const scrollables = track.querySelectorAll("[data-nav-scroll]");
    for (const node of scrollables) {
      node.addEventListener("scroll", onScroll, { passive: true });
    }

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(track);
      for (const item of track.querySelectorAll("[data-slide-item]")) {
        ro.observe(item);
      }
      for (const node of scrollables) {
        ro.observe(node);
      }
    }

    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", onScroll);
      for (const node of scrollables) {
        node.removeEventListener("scroll", onScroll);
      }
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update, layoutEpoch, axis]);

  const thumbStyle: CSSProperties =
    axis === "y"
      ? {
          height: thumb.h || undefined,
          transform: `translateY(${thumb.y}px)`,
          opacity: thumb.ready ? 1 : 0,
        }
      : {
          width: thumb.w || undefined,
          transform: `translateX(${thumb.x}px)`,
          opacity: thumb.ready ? 1 : 0,
        };

  return {
    trackRef,
    thumbStyle,
  };
}
