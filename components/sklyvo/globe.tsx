"use client";

import { useEffect, useRef } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

/**
 * Slowly turning dot globe. Land is picked out of an equirectangular mask that
 * we rasterise once from the world atlas in `public/geo`, then every point of
 * the sphere is tagged land or ocean and drawn with depth shading.
 */

const MASK_W = 1440;
const MASK_H = 720;

export type LandMask = { mask: Uint8Array; w: number; h: number };

let maskRequest: Promise<LandMask | null> | null = null;

async function loadLandMask(): Promise<LandMask | null> {
  const response = await fetch("/geo/countries-110m.json");
  if (!response.ok) return null;

  const topology = (await response.json()) as Topology<{
    countries: GeometryCollection;
  }>;
  const land = feature(topology, topology.objects.countries);

  const canvas = document.createElement("canvas");
  canvas.width = MASK_W;
  canvas.height = MASK_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const projection = geoEquirectangular()
    .scale(MASK_W / (2 * Math.PI))
    .translate([MASK_W / 2, MASK_H / 2]);

  ctx.fillStyle = "#000";
  ctx.beginPath();
  geoPath(projection, ctx)(land);
  ctx.fill();

  const pixels = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
  const mask = new Uint8Array(MASK_W * MASK_H);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = pixels[i * 4 + 3] > 40 ? 1 : 0;
  }

  return { mask, w: MASK_W, h: MASK_H };
}

export function getLandMask() {
  maskRequest ??= loadLandMask().catch(() => null);
  return maskRequest;
}

export type GlobeTheme = "ink" | "night";

type DotRamp = { rgb: string; base: number; shade: number };

const THEMES: Record<GlobeTheme, { land: DotRamp; ocean: DotRamp }> = {
  ink: {
    land: { rgb: "22,32,46", base: 0.2, shade: 0.72 },
    ocean: { rgb: "22,32,46", base: 0.05, shade: 0.18 },
  },
  night: {
    land: { rgb: "255,255,255", base: 0.62, shade: 0.38 },
    ocean: { rgb: "155,220,255", base: 0.1, shade: 0.3 },
  },
};

type Point = {
  cosLat: number;
  sinLat: number;
  sinLon: number;
  cosLon: number;
  lat: number;
  lon: number;
  land: number;
};

function buildPoints(): Point[] {
  const points: Point[] = [];
  for (let deg = -86; deg <= 86; deg += 3.6) {
    const lat = (deg * Math.PI) / 180;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    const count = Math.max(6, Math.round(cosLat * 108));
    for (let i = 0; i < count; i++) {
      const lon = (i / count) * Math.PI * 2;
      points.push({
        cosLat,
        sinLat,
        sinLon: Math.sin(lon),
        cosLon: Math.cos(lon),
        lat,
        lon,
        land: 0,
      });
    }
  }
  return points;
}

function tagLand(points: Point[], land: LandMask) {
  for (const point of points) {
    const lonDeg =
      (((((point.lon * 180) / Math.PI + 180) % 360) + 360) % 360) - 180;
    const x = Math.min(
      land.w - 1,
      Math.max(0, Math.round(((lonDeg + 180) / 360) * land.w)),
    );
    const y = Math.min(
      land.h - 1,
      Math.max(
        0,
        Math.round(((90 - (point.lat * 180) / Math.PI) / 180) * land.h),
      ),
    );
    point.land = land.mask[y * land.w + x];
  }
}

export function Globe({
  size = 500,
  theme = "night",
  className,
}: {
  size?: number;
  theme?: GlobeTheme;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const radius = size * 0.44;
    const cx = size / 2;
    const cy = size / 2;
    const tilt = -0.24;
    const cosTilt = Math.cos(tilt);
    const sinTilt = Math.sin(tilt);

    const points = buildPoints();
    let cancelled = false;
    let frameId = 0;
    let spin = 0;

    const ramp = THEMES[theme];

    // dots are bucketed by land flag + rounded radius + alpha
    const buckets = new Map<
      number,
      { rgb: string; r: number; alpha: number; xy: number[] }
    >();

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      buckets.clear();

      const cosSpin = Math.cos(spin);
      const sinSpin = Math.sin(spin);

      for (const point of points) {
        const sinLon = point.sinLon * cosSpin + point.cosLon * sinSpin;
        const cosLon = point.cosLon * cosSpin - point.sinLon * sinSpin;
        const x = point.cosLat * sinLon;
        const depth = point.cosLat * cosLon;
        const y = point.sinLat * cosTilt - depth * sinTilt;
        const z = point.sinLat * sinTilt + depth * cosTilt;
        if (z < 0.02) continue;

        const shade = 0.18 + 0.72 * Math.max(0, x * 0.45 + y * 0.35 + z * 0.7);
        const isLand = point.land === 1;
        const dot = isLand ? ramp.land : ramp.ocean;
        const rKey = Math.round((isLand ? 0.9 + z * 0.95 : 0.6 + z * 0.6) * 8);
        const aKey = Math.round((dot.base + shade * dot.shade) * 60);
        const key = ((isLand ? 1 : 0) << 12) | (aKey << 6) | rKey;

        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { rgb: dot.rgb, r: rKey / 8, alpha: aKey / 60, xy: [] };
          buckets.set(key, bucket);
        }
        bucket.xy.push(cx + x * radius, cy - y * radius);
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      for (const { rgb, r, alpha, xy } of buckets.values()) {
        ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
        for (let i = 0; i < xy.length; i += 2) {
          ctx.beginPath();
          ctx.arc(xy[i], xy[i + 1], r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    // Hold the globe hidden until the land mask has been folded in, otherwise a
    // refresh shows a bare ocean sphere for a beat and the continents pop on.
    const reveal = () => {
      if (!cancelled) canvas.style.opacity = "1";
    };

    void getLandMask()
      .then((land) => {
        if (cancelled) return;
        if (land) {
          tagLand(points, land);
          if (still) draw();
        }
        reveal();
      })
      .catch(reveal);

    if (still) {
      draw();
      return () => {
        cancelled = true;
      };
    }

    const loop = () => {
      spin += 0.0022;
      draw();
      frameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [size, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: size,
        height: size,
        opacity: 0,
        transition: "opacity 0.45s ease",
      }}
      aria-hidden
    />
  );
}
