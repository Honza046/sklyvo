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

      const pulse = prefersReducedMotion
        ? 1
        : 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(timeSec * 2.2));
      const breathe = prefersReducedMotion
        ? 1
        : 0.94 + 0.06 * Math.sin(timeSec * 1.65 + 0.8);
      const liveSigmaScale = prefersReducedMotion
        ? 1
        : 0.96 + 0.04 * Math.sin(timeSec * 1.35);

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
      const sigma =
        Math.max(13, rect.width * 0.032) *
        Math.min(4, Math.max(0.6, v.zoom / 6)) *
        liveSigmaScale;

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
            heat = Math.max(heat, h.w * Math.exp(-(d * d) / (2 * sigma * sigma)));
          }

          const liveHeat = heat * pulse * breathe;

          if (liveHeat > 0.06) {
            ctx.fillStyle = `rgba(2,167,255,${Math.min(1, 0.34 + liveHeat * 0.72).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + liveHeat * 1.4, 0, 6.2832);
            ctx.fill();
          } else {
            ctx.fillStyle = "rgba(255,255,255,0.13)";
            ctx.beginPath();
            ctx.arc(x, y, 0.9, 0, 6.2832);
            ctx.fill();
          }
        }
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
