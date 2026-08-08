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

type LandMask = { mask: Uint8Array; w: number; h: number };

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

function getLandMask() {
  maskRequest ??= loadLandMask().catch(() => null);
  return maskRequest;
}

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
    const lonDeg = ((((point.lon * 180) / Math.PI + 180) % 360) + 360) % 360 - 180;
    const x = Math.min(
      land.w - 1,
      Math.max(0, Math.round(((lonDeg + 180) / 360) * land.w)),
    );
    const y = Math.min(
      land.h - 1,
      Math.max(0, Math.round(((90 - (point.lat * 180) / Math.PI) / 180) * land.h)),
    );
    point.land = land.mask[y * land.w + x];
  }
}

export function Globe({
  size = 500,
  className,
}: {
  size?: number;
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

    // dots are bucketed by rounded radius + alpha, so the whole globe draws in
    // a couple of dozen fill() calls instead of one per dot
    const buckets = new Map<number, { r: number; alpha: number; xy: number[] }>();

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
        const rKey = Math.round((isLand ? 0.9 + z * 0.95 : 0.6 + z * 0.6) * 8);
        const aKey = Math.round(
          (isLand ? 0.2 + shade * 0.72 : 0.05 + shade * 0.18) * 60,
        );
        const key = (aKey << 6) | rKey;

        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = { r: rKey / 8, alpha: aKey / 60, xy: [] };
          buckets.set(key, bucket);
        }
        bucket.xy.push(cx + x * radius, cy - y * radius);
      }

      for (const { r, alpha, xy } of buckets.values()) {
        ctx.fillStyle = `rgba(22,32,46,${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let i = 0; i < xy.length; i += 2) {
          ctx.moveTo(xy[i] + r, xy[i + 1]);
          ctx.arc(xy[i], xy[i + 1], r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    void getLandMask().then((land) => {
      if (cancelled || !land) return;
      tagLand(points, land);
      if (still) draw();
    });

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
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
