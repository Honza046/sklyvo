"use client";

import { useEffect, useRef } from "react";
import { getLandMask, type LandMask } from "@/components/sklyvo/globe";

/** Approximate country centroids — decorative hotspots, not surveying-grade. */
const COUNTRY_CENTROID: Record<string, { lon: number; lat: number }> = {
  CZ: { lon: 15.47, lat: 49.82 },
  SK: { lon: 19.7, lat: 48.67 },
  DE: { lon: 10.45, lat: 51.16 },
  AT: { lon: 14.55, lat: 47.52 },
  PL: { lon: 19.15, lat: 51.92 },
  GB: { lon: -1.5, lat: 52.36 },
  US: { lon: -98.35, lat: 39.5 },
  IE: { lon: -8.0, lat: 53.4 },
  FR: { lon: 2.5, lat: 46.6 },
  ES: { lon: -3.7, lat: 40.4 },
  IT: { lon: 12.5, lat: 42.5 },
  NL: { lon: 5.3, lat: 52.2 },
  BE: { lon: 4.5, lat: 50.6 },
  CH: { lon: 8.2, lat: 46.8 },
};

type HotPoint = { lon: number; lat: number; w: number };

function fitView(points: HotPoint[]) {
  const lons = points.map((h) => h.lon);
  const lats = points.map((h) => h.lat);
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const spanLon = Math.max(3.2, (Math.max(...lons) - Math.min(...lons)) * 2.6);
  const spanLat = Math.max(2.4, (Math.max(...lats) - Math.min(...lats)) * 3.2);
  const zoom = Math.min(
    5.6,
    Math.max(2.2, Math.min(360 / spanLon, 180 / spanLat)),
  );
  return { lon, lat, zoom };
}

export type GeoHeatMapStat = { countryCode: string; count: number };

/**
 * Dotted land from the world atlas with a gaussian heat field over the
 * workspace's real geo stats — ported from the 2.0 design's HeatMap,
 * driven by actual country counts instead of hardcoded hotspots.
 */
export function GeoHeatMap({ stats }: { stats: GeoHeatMapStat[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resolvedHot: HotPoint[] =
      stats.length > 0
        ? stats
            .map((s) => {
              const centroid = COUNTRY_CENTROID[s.countryCode.toUpperCase()];
              return centroid ? { ...centroid, w: s.count } : null;
            })
            .filter((p): p is HotPoint => p !== null)
        : [
            { lon: 15.47, lat: 49.82, w: 1 },
            { lon: 17.0, lat: 49.0, w: 0.6 },
          ];

    const hot = resolvedHot.map((p) => ({ ...p }));
    const maxCount = Math.max(1, ...hot.map((p) => p.w));
    for (const p of hot) p.w = p.w / maxCount;

    let land: LandMask | null = null;
    let cancelled = false;
    let rafId = 0;
    const startTime = performance.now();
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (timeSec = 0) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || !land) return;

      // Field breathe (subtle) + stronger core blink.
      const fieldPulse = prefersReducedMotion
        ? 1
        : 0.9 + 0.1 * (0.5 + 0.5 * Math.sin(timeSec * 1.55));
      const corePulse = prefersReducedMotion
        ? 1
        : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(timeSec * 2.8));
      const ringPulse = prefersReducedMotion
        ? 0
        : (0.5 + 0.5 * Math.sin(timeSec * 2.8 - 0.55));

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const v = fitView(hot);
      const step = 3.2;
      const spanLon = 360 / v.zoom;
      const spanLat = spanLon * (rect.height / rect.width);
      const lonMin = v.lon - spanLon / 2;
      const latMax = v.lat + spanLat / 2;
      const toXY = (lon: number, lat: number) => ({
        x: ((lon - lonMin) / spanLon) * rect.width,
        y: ((latMax - lat) / spanLat) * rect.height,
      });

      const hotXY = hot.map((h) => ({ p: toXY(h.lon, h.lat), w: h.w }));
      // One wider sigma → soft continuous falloff (no stepped bands).
      const sigma =
        Math.max(16, rect.width * 0.038) *
        Math.min(3.6, Math.max(0.7, v.zoom / 6));

      for (let y = 0; y < rect.height; y += step) {
        for (let x = 0; x < rect.width; x += step) {
          const lon = lonMin + (x / rect.width) * spanLon;
          const lat = latMax - (y / rect.height) * spanLat;
          if (lon < -180 || lon > 180 || lat > 90 || lat < -90) continue;

          const mx = Math.min(
            land.w - 1,
            Math.max(0, Math.round(((lon + 180) / 360) * land.w)),
          );
          const my = Math.min(
            land.h - 1,
            Math.max(0, Math.round(((90 - lat) / 180) * land.h)),
          );
          if (!land.mask[my * land.w + mx]) continue;

          let heat = 0;
          for (const h of hotXY) {
            const d = Math.hypot(x - h.p.x, y - h.p.y);
            heat = Math.max(
              heat,
              h.w * Math.exp(-(d * d) / (2 * sigma * sigma)),
            );
          }

          const live = Math.min(1, heat * fieldPulse);
          // Smoothstep — continuous grey → blue, no hard edge.
          const t = live * live * (3 - 2 * live);

          const r = Math.round(255 + (2 - 255) * t);
          const g = Math.round(255 + (167 - 255) * t);
          const b = Math.round(255 + (255 - 255) * t);
          const a = 0.13 + t * 0.82;
          const radius = 0.9 + t * 0.85;

          ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 6.2832);
          ctx.fill();
        }
      }

      // Pulsing core — soft halo + blinking center (no hard rings).
      for (const h of hotXY) {
        if (h.w < 0.12) continue;
        const { x, y } = h.p;
        if (x < -8 || y < -8 || x > rect.width + 8 || y > rect.height + 8) {
          continue;
        }

        const strength = Math.min(1, 0.5 + h.w * 0.5);
        const glowR = Math.max(18, sigma * 1.15) * (0.9 + 0.12 * corePulse);

        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(
          0,
          `rgba(2,167,255,${(0.28 * strength * corePulse).toFixed(3)})`,
        );
        glow.addColorStop(
          0.22,
          `rgba(2,167,255,${(0.14 * strength * corePulse).toFixed(3)})`,
        );
        glow.addColorStop(
          0.55,
          `rgba(2,167,255,${(0.055 * strength).toFixed(3)})`,
        );
        glow.addColorStop(1, "rgba(2,167,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, 6.2832);
        ctx.fill();

        // Soft expanding blink ring.
        if (ringPulse > 0.05) {
          const ringR = 4 + ringPulse * Math.max(10, sigma * 0.55);
          const ringAlpha = (1 - ringPulse) * 0.35 * strength;
          ctx.beginPath();
          ctx.arc(x, y, ringR, 0, 6.2832);
          ctx.strokeStyle = `rgba(2,167,255,${ringAlpha.toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }

        const coreR = (2.2 + h.w * 1.2) * (0.82 + 0.28 * corePulse);
        ctx.fillStyle = `rgba(2,167,255,${(0.75 + 0.25 * corePulse).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, coreR, 0, 6.2832);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${(0.55 + 0.4 * corePulse).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.9, coreR * 0.4), 0, 6.2832);
        ctx.fill();
      }
    };

    const tick = (now: number) => {
      if (cancelled) return;
      draw((now - startTime) / 1000);
      rafId = requestAnimationFrame(tick);
    };

    void getLandMask().then((m) => {
      if (cancelled) return;
      land = m;
      if (prefersReducedMotion) {
        draw();
      } else {
        rafId = requestAnimationFrame(tick);
      }
    });

    const observer = new ResizeObserver(() => {
      if (prefersReducedMotion) draw();
    });
    observer.observe(canvas);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [stats]);

  return <canvas ref={ref} className="sk-geo-map-canvas" aria-hidden />;
}
