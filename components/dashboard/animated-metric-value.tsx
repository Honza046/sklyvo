"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedMetricValue({
  value,
  duration = 380,
  delay = 0,
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  className?: string;
}) {
  const fromRef = useRef(0);
  const displayRef = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    let raf = 0;
    let startTime: number | null = null;
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      const tick = (now: number) => {
        if (cancelled) return;
        if (startTime === null) startTime = now;
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = easeOutCubic(progress);
        const next = Math.round(from + (to - from) * eased);
        displayRef.current = next;
        setDisplay(next);
        if (progress < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          fromRef.current = to;
          displayRef.current = to;
          setDisplay(to);
        }
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
      fromRef.current = displayRef.current;
    };
  }, [value, duration, delay]);

  return (
    <span className={className}>
      {display.toLocaleString("cs-CZ")}
      {suffix}
    </span>
  );
}

const METRIC_GHOST_WIDTHS = ["72px", "56px", "80px", "64px"] as const;

/** Pulsing placeholders for the 4 KPI cells while dashboard data loads. */
export function MetricsStripSkeleton() {
  return (
    <div className="sk-metrics-strip shrink-0" aria-hidden>
      {METRIC_GHOST_WIDTHS.map((width, i) => (
        <div key={i} className="sk-metrics-strip__cell">
          <div
            className="sk-ghost-spot h-[10.5px] rounded"
            style={{ width: `${52 + (i % 3) * 14}%`, maxWidth: 128 }}
          />
          <div
            className="sk-ghost-spot mt-[7px] h-[34px] rounded-lg"
            style={{ width, maxWidth: "100%" }}
          />
        </div>
      ))}
    </div>
  );
}
