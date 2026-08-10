"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * The Sklyvo mark: a blue tile with a glowing dome and two eyes that track the
 * cursor, blink on a human cadence, and flinch when you click.
 *
 * Everything is CSS, no bitmap. The eye geometry below is measured from the
 * original 500px artwork and expressed as a percentage of the tile, so the mark
 * scales to any size.
 */

type EyeSpec = {
  /** horizontal centre, % of tile */
  cx: number;
  /** vertical centre, % of tile */
  cy: number;
  /** this eye follows the gaze on the second, slightly lagging channel */
  trailing: boolean;
};

const EYE_LEFT: EyeSpec = { cx: 42.4, cy: 60.5, trailing: false };
const EYE_RIGHT: EyeSpec = { cx: 68.4, cy: 54.8, trailing: true };

const EYE_W = (85.33 / 500) * 100;
const EYE_H = (112.88 / 500) * 100;
const EYE_ROT = -11.05;

/** the right eye closes a beat after the left one */
const BLINK_LAG = 14;

type Gaze = {
  gx: number;
  gy: number;
  gx2: number;
  gy2: number;
  lid: number;
  lid2: number;
  startle: number;
  hover: number;
  t: number;
};

const REST: Gaze = {
  gx: 0,
  gy: 0,
  gx2: 0,
  gy2: 0,
  lid: 0,
  lid2: 0,
  startle: 0,
  hover: 0,
  t: 0,
};

function orbTransform(size: number, g: Gaze) {
  const breathe = 1 + Math.sin(g.t * 0.9) * 0.008;
  const dx = -g.gx * size * 0.005;
  const dy = -g.gy * size * 0.004;
  return (
    `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) ` +
    `scale(${breathe.toFixed(4)}, ${(breathe * 0.996).toFixed(4)})`
  );
}

function orbBackground(g: Gaze) {
  const pulse = 1 + Math.sin(g.t * 0.62 + 1.1) * 0.024;
  const x = 50 - g.gx * 1.4;
  const y = 74 - g.gy * 1.1;
  return (
    `radial-gradient(${(54 * pulse).toFixed(1)}% ${(64 * pulse).toFixed(1)}% ` +
    `at ${x.toFixed(1)}% ${y.toFixed(1)}%, ` +
    "#00B0FB 14%, #61BBF8 51%, #8BCDFA 65%, #BEE3FC 82%, #FFFFFF 100%)"
  );
}

function eyeTransform(spec: EyeSpec, size: number, g: Gaze) {
  const range = size * 0.03;
  const gx = spec.trailing ? g.gx2 : g.gx;
  const gy = spec.trailing ? g.gy2 : g.gy;
  const lid = spec.trailing ? g.lid2 : g.lid;
  const pop = 1 + g.startle * 0.11 + g.hover * 0.07;
  // Don't collapse to a sub-pixel slit — at ~30px that reads as a flash.
  const scaleY = Math.max(0.16, 1 - lid * 0.84);
  return (
    "translate(-50%, -50%) " +
    `translate(${(gx * range).toFixed(2)}px, ${(gy * range * 1.05).toFixed(2)}px) ` +
    `rotate(${EYE_ROT}deg) ` +
    `scaleX(${pop.toFixed(3)}) scaleY(${(scaleY * pop).toFixed(3)})`
  );
}

function tileStyle(size: number): CSSProperties {
  const radius = (size * 100) / 450;
  return {
    position: "relative",
    display: "block",
    width: size,
    height: size,
    flex: "none",
    overflow: "hidden",
    borderRadius: radius,
    boxShadow:
      `0 ${(size * 0.09).toFixed(1)}px ${(size * 0.16).toFixed(1)}px ` +
      `-${(size * 0.07).toFixed(1)}px rgba(0,110,190,0.5)`,
  };
}

/** only the blue plate fades out over the bottom fifth of the tile */
function plateStyle(size: number): CSSProperties {
  const mask =
    "linear-gradient(180deg, #000 0%, #000 80%, transparent 80%, transparent 100%)";
  return {
    position: "absolute",
    inset: 0,
    borderRadius: (size * 100) / 450,
    background: "var(--sk-brand, #02a7ff)",
    pointerEvents: "none",
    WebkitMaskImage: mask,
    maskImage: mask,
  };
}

function orbStyle(size: number): CSSProperties {
  const w = size * 1.06;
  const h = size * 0.8;
  const glow = (size * 0.1).toFixed(1);
  const inner = (size * 0.05).toFixed(1);
  return {
    position: "absolute",
    left: (size - w) / 2,
    top: size * 0.24,
    width: w,
    height: h,
    borderRadius: "50% 50% 0 0 / 62% 62% 0 0",
    transformOrigin: "50% 100%",
    transform: orbTransform(size, REST),
    background: orbBackground(REST),
    boxShadow:
      `0 0 ${glow}px rgba(0,0,0,0.10), ` +
      `0 0 ${glow}px rgba(255,255,255,1), ` +
      `inset 0 0 ${inner}px rgba(0,0,0,0.05)`,
    pointerEvents: "none",
  };
}

function eyeStyle(spec: EyeSpec, size: number): CSSProperties {
  const k = size / 500;
  const blur = Math.max(1, 5 * k * 2.2).toFixed(1);
  const offset = (4 * k * 2.2).toFixed(1);
  const inner = Math.max(1, 5 * k * 2.2).toFixed(1);
  return {
    position: "absolute",
    left: `${spec.cx}%`,
    top: `${spec.cy}%`,
    width: (size * EYE_W) / 100,
    height: (size * EYE_H) / 100,
    borderRadius: "50%",
    background: "linear-gradient(180deg, #FFFFFF 0%, #BBE2FC 100%)",
    boxShadow:
      `0 0 ${blur}px rgba(0,0,0,0.10), ` +
      `0 ${offset}px ${blur}px rgba(0,0,0,0.10), ` +
      `inset 0 0 ${inner}px rgba(0,0,0,0.30)`,
    transform: eyeTransform(spec, size, REST),
    // No CSS transition — rAF owns transform every frame; easing here fights
    // the blink and causes the odd flicker.
    willChange: "transform",
    pointerEvents: "none",
  };
}

/** Smooth close → brief hold → reopen. No overshoot (reads as a flash at small sizes). */
function lidCurve(dt: number, close: number, hold: number, open: number) {
  if (dt <= 0) return 0;
  if (dt < close) {
    const u = dt / close;
    return u * u * (3 - 2 * u);
  }
  if (dt < close + hold) return 1;
  const u = Math.min(1, (dt - close - hold) / open);
  return Math.pow(1 - u, 2.4);
}

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function SklyvoMark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const tileRef = useRef<HTMLSpanElement>(null);
  const orbRef = useRef<HTMLSpanElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tile = tileRef.current;
    const orb = orbRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!tile || !orb || !left || !right) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const g: Gaze = { ...REST };
    const target = { gx: 0, gy: 0 };

    let frameId = 0;
    let blinkTimer: ReturnType<typeof setTimeout> | undefined;
    let startleTimer: ReturnType<typeof setTimeout> | undefined;

    let lastMove = performance.now();
    let nextWander = lastMove + 1800;
    let nextLag = 0;
    let lagK = 0.07;
    let lagSwap = false;
    let lastBlink = 0;
    let startleTarget = 0;
    let hoverTarget = 0;
    let blink: {
      t0: number;
      close: number;
      hold: number;
      open: number;
      total: number;
    } | null = null;

    const startBlink = (sleepy: boolean) => {
      const now = performance.now();
      if (blink || now - lastBlink < 2800) return;
      const [close, hold, open] = sleepy ? [140, 90, 280] : [90, 36, 200];
      blink = {
        t0: now,
        close,
        hold,
        open,
        total: close + hold + open + BLINK_LAG,
      };
      lastBlink = now;
    };

    const scheduleBlink = () => {
      blinkTimer = setTimeout(
        () => {
          startBlink(Math.random() < 0.1);
          scheduleBlink();
        },
        3800 + Math.random() * 5600,
      );
    };

    const frame = () => {
      const now = performance.now();
      g.t = now / 1000;

      // let the gaze drift on its own once the cursor goes quiet
      if (now - lastMove > 2200 && now > nextWander) {
        target.gx = (Math.random() * 2 - 1) * 0.8;
        target.gy = (Math.random() * 2 - 1) * 0.55;
        nextWander = now + 1600 + Math.random() * 2200;
      }

      // every few seconds one eye starts trailing the other
      if (now > nextLag) {
        lagK = 0.062 + Math.random() * 0.02;
        lagSwap = Math.random() < 0.5;
        nextLag = now + 3000 + Math.random() * 4000;
      }

      const kA = lagSwap ? lagK : 0.09;
      const kB = lagSwap ? 0.09 : lagK;

      g.gx += (target.gx - g.gx) * kA;
      g.gy += (target.gy - g.gy) * kA;
      g.gx2 += (target.gx - g.gx2) * kB;
      g.gy2 += (target.gy - g.gy2) * kB;

      g.startle += (startleTarget - g.startle) * 0.22;
      g.hover += (hoverTarget - g.hover) * 0.14;
      if (Math.abs(g.startle) < 0.001) g.startle = 0;
      if (Math.abs(g.hover - hoverTarget) < 0.001) g.hover = hoverTarget;

      if (blink) {
        const dt = now - blink.t0;
        g.lid = lidCurve(dt, blink.close, blink.hold, blink.open);
        g.lid2 = lidCurve(dt - BLINK_LAG, blink.close, blink.hold, blink.open);
        if (dt >= blink.total) {
          g.lid = 0;
          g.lid2 = 0;
          blink = null;
          lastBlink = now;
        }
      }

      orb.style.transform = orbTransform(size, g);
      orb.style.background = orbBackground(g);
      left.style.transform = eyeTransform(EYE_LEFT, size, g);
      right.style.transform = eyeTransform(EYE_RIGHT, size, g);

      frameId = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      target.gx = clamp((e.clientX / window.innerWidth - 0.5) * 2.2);
      target.gy = clamp((e.clientY / window.innerHeight - 0.5) * 2.2);
      lastMove = performance.now();
    };

    const onDown = () => {
      clearTimeout(startleTimer);
      startleTarget = 1;
      startleTimer = setTimeout(() => {
        startleTarget = 0;
      }, 180);
      lastMove = performance.now();
    };

    const onEnter = () => {
      hoverTarget = 1;
    };
    const onLeave = () => {
      hoverTarget = 0;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    tile.addEventListener("mouseenter", onEnter);
    tile.addEventListener("mouseleave", onLeave);

    scheduleBlink();
    frame();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(blinkTimer);
      clearTimeout(startleTimer);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      tile.removeEventListener("mouseenter", onEnter);
      tile.removeEventListener("mouseleave", onLeave);
    };
  }, [size]);

  return (
    <span
      ref={tileRef}
      className={className}
      style={tileStyle(size)}
      aria-hidden
    >
      <span style={plateStyle(size)} />
      <span ref={orbRef} style={orbStyle(size)} />
      <span ref={leftRef} style={eyeStyle(EYE_LEFT, size)} />
      <span ref={rightRef} style={eyeStyle(EYE_RIGHT, size)} />
    </span>
  );
}
