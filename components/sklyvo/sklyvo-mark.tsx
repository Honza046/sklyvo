"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

/** the exported logo with its eyes removed, so live ones can sit on top */
export const EYELESS_ARTWORK = "/brand/sklyvo-mark-eyeless.png";
/** the untouched logo, eyes painted in */
export const STATIC_ARTWORK = "/brand/sklyvo-mark.png";

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
  /** extra eye scale a scripted pose can ask for, on top of startle and hover */
  boost: number;
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
  boost: 0,
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

/** the product mark is blue, Skly Bot is the same shape in grey */
export type MarkTone = "brand" | "grey";

const TONE = {
  brand: {
    plate: "var(--sk-brand, #02a7ff)",
    sky: "#00B0FB 14%, #61BBF8 51%, #8BCDFA 65%, #BEE3FC 82%, #FFFFFF 100%",
    eye: "linear-gradient(180deg, #FFFFFF 0%, #BBE2FC 100%)",
    shadow: "rgba(0,110,190,0.5)",
  },
  grey: {
    plate: "#4A5058",
    sky: "#646A74 14%, #939AA4 51%, #AEB4BE 65%, #D0D5DC 82%, #FFFFFF 100%",
    eye: "linear-gradient(180deg, #FFFFFF 0%, #DDE1E6 100%)",
    shadow: "rgba(0,0,0,0.45)",
  },
} as const;

function orbBackground(g: Gaze, tone: MarkTone) {
  const pulse = 1 + Math.sin(g.t * 0.62 + 1.1) * 0.024;
  const x = 50 - g.gx * 1.4;
  const y = 74 - g.gy * 1.1;
  return (
    `radial-gradient(${(54 * pulse).toFixed(1)}% ${(64 * pulse).toFixed(1)}% ` +
    `at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${TONE[tone].sky})`
  );
}

/**
 * A scripted pose. While one is set the cursor is ignored, so an owner can pose
 * the eyes deliberately: `gy` is not clamped, so a pose may look further than a
 * mouse ever could, and `pop` swells the eyes.
 */
export type MarkGaze = { gx: number; gy: number; pop?: number };

/** the landing draws the eyes with a shallower vertical reach than the app does */
const REACH_Y_DEFAULT = 1.05;

function eyeTransform(spec: EyeSpec, size: number, g: Gaze, reachY = REACH_Y_DEFAULT) {
  const range = size * 0.03;
  const gx = spec.trailing ? g.gx2 : g.gx;
  const gy = spec.trailing ? g.gy2 : g.gy;
  const lid = spec.trailing ? g.lid2 : g.lid;
  const pop = 1 + g.startle * 0.11 + g.hover * 0.07 + g.boost;
  // Don't collapse to a sub-pixel slit — at ~30px that reads as a flash.
  const scaleY = Math.max(0.16, 1 - lid * 0.84);
  return (
    "translate(-50%, -50%) " +
    `translate(${(gx * range).toFixed(2)}px, ${(gy * range * reachY).toFixed(2)}px) ` +
    `rotate(${EYE_ROT}deg) ` +
    `scaleX(${pop.toFixed(3)}) scaleY(${(scaleY * pop).toFixed(3)})`
  );
}

/** the mark's own corner radius, measured from the 450px artwork */
function defaultRadius(size: number) {
  return (size * 100) / 450;
}

function tileStyle(
  size: number,
  radius: number,
  shadow: boolean,
  tone: MarkTone,
): CSSProperties {
  return {
    position: "relative",
    display: "block",
    width: size,
    height: size,
    flex: "none",
    overflow: "hidden",
    borderRadius: radius,
    boxShadow: shadow
      ? `0 ${(size * 0.09).toFixed(1)}px ${(size * 0.16).toFixed(1)}px ` +
        `-${(size * 0.07).toFixed(1)}px ${TONE[tone].shadow}`
      : undefined,
  };
}

/** only the blue plate fades out over the bottom fifth of the tile */
function plateStyle(radius: number, tone: MarkTone): CSSProperties {
  const mask =
    "linear-gradient(180deg, #000 0%, #000 80%, transparent 80%, transparent 100%)";
  return {
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    background: TONE[tone].plate,
    pointerEvents: "none",
    WebkitMaskImage: mask,
    maskImage: mask,
  };
}

/**
 * `round` swaps the flat-bottomed dome for a true circle, which is what the
 * bare mark wants when it rises out of a surface. `glow` dims the white halo —
 * at 300px the default reads as a floodlight.
 */
function orbStyle(
  size: number,
  tone: MarkTone,
  round = false,
  glow = 1,
): CSSProperties {
  const w = size * 1.06;
  const h = round ? w : size * 0.8;
  const blur = (size * 0.1).toFixed(1);
  const inner = (size * 0.05).toFixed(1);
  return {
    position: "absolute",
    left: (size - w) / 2,
    top: size * 0.24,
    width: w,
    height: h,
    borderRadius: round ? "50%" : "50% 50% 0 0 / 62% 62% 0 0",
    transformOrigin: "50% 100%",
    transform: orbTransform(size, REST),
    background: orbBackground(REST, tone),
    boxShadow:
      `0 0 ${blur}px rgba(0,0,0,0.10), ` +
      `0 0 ${blur}px rgba(255,255,255,${glow}), ` +
      `inset 0 0 ${inner}px rgba(0,0,0,0.05)`,
    pointerEvents: "none",
  };
}

function eyeStyle(spec: EyeSpec, size: number, tone: MarkTone): CSSProperties {
  const k = size / 500;
  const blur = Math.max(1, 5 * k * 2.2).toFixed(1);
  const offset = (4 * k * 2.2).toFixed(1);
  const inner = Math.max(1, 5 * k * 2.2).toFixed(1);
  // Skly Bot (grey) peeks a bit wider — reads as “kukate” in the sidebar.
  const eyeScale = tone === "grey" ? 1.22 : 1;
  return {
    position: "absolute",
    left: `${spec.cx}%`,
    top: `${spec.cy}%`,
    width: (size * EYE_W * eyeScale) / 100,
    height: (size * EYE_H * eyeScale) / 100,
    borderRadius: "50%",
    background: TONE[tone].eye,
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

/**
 * Peek mode drives the eyes from a short script instead of the cursor: the mark
 * rises from behind its strip, looks right, looks left, centres, blinks once and
 * ducks back down. The orb keeps tracking the cursor throughout.
 */
type Peek = { gaze: number; lid: number };

/** the peek's resting pose, and the two transforms the wrapper toggles between */
const PEEK_DOWN = "translateY(105%)";
const PEEK_UP = "translateY(14%)";

function peekEyeTransform(size: number, p: Peek) {
  const dx = p.gaze * size * 0.034;
  const scaleY = Math.max(0.04, 1 - p.lid);
  return (
    "translate(-50%, -50%) " +
    `translate(${dx.toFixed(2)}px, 0) ` +
    `rotate(${EYE_ROT}deg) scaleY(${scaleY.toFixed(3)})`
  );
}

function peekEyeStyle(spec: EyeSpec, size: number, tone: MarkTone): CSSProperties {
  return {
    ...eyeStyle(spec, size, tone),
    transform: peekEyeTransform(size, { gaze: 0, lid: 0 }),
    // the peek eyes ease between poses; the cursor-tracking ones do not
    transition: "transform 0.5s cubic-bezier(0.34,0.9,0.3,1)",
    willChange: "transform",
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

/**
 * `css` draws the whole mark in CSS, `artwork` lays the live eyes over the
 * exported logo with its eyes removed. Both share the same eye behaviour.
 */
export type MarkVariant = "css" | "artwork";

export function SklyvoMark({
  size = 30,
  variant = "css",
  radius,
  shadow = true,
  tone = "brand",
  className,
  peek = false,
  bare = false,
  embed = false,
  blend = false,
  interactive = true,
  round = false,
  glow = 1,
  gaze = null,
  reachY = REACH_Y_DEFAULT,
}: {
  size?: number;
  variant?: MarkVariant;
  radius?: number;
  tone?: MarkTone;
  /** the blue drop shadow the mark normally casts */
  shadow?: boolean;
  className?: string;
  /** Sidebar / chrome — skip rAF + global mousemove. */
  interactive?: boolean;
  /** Alias for bare — strip / banner without a plate. */
  embed?: boolean;
  /** Softer orb glow for gradient banners. */
  blend?: boolean;
  /**
   * Drop the tile and plate and run the peek script: the bare orb and eyes rise
   * from behind whatever the mark is positioned against, look around, then hide.
   */
  peek?: boolean;
  /**
   * Drop the tile and plate but keep the cursor tracking: the dome and eyes sit
   * straight on whatever is behind them, with no card of their own.
   */
  bare?: boolean;
  /** make the dome a full circle instead of the flat-bottomed arch */
  round?: boolean;
  /** dial the white halo down: 1 is the default, 0 turns it off */
  glow?: number;
  /** hold a scripted pose instead of following the cursor */
  gaze?: MarkGaze | null;
  /** vertical gaze reach as a multiple of the horizontal one */
  reachY?: number;
}) {
  const tileRef = useRef<HTMLSpanElement>(null);
  const orbRef = useRef<HTMLSpanElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const useBare = bare || embed;
  const useGlow = blend ? Math.min(glow, 0.45) : glow;
  // mirrored in an effect, not during render: the rAF loop reads it every frame
  // and must not tear down when the pose changes
  const gazeRef = useRef<MarkGaze | null>(null);
  useEffect(() => {
    gazeRef.current = gaze;
  }, [gaze]);

  useEffect(() => {
    if (!interactive) return;
    const tile = tileRef.current;
    const orb = orbRef.current; // the artwork variant has no orb to drive
    const left = leftRef.current;
    const right = rightRef.current;
    if (!tile || !left || !right) return;

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

      // a scripted pose wins over both the cursor and the idle wander
      const pose = gazeRef.current;
      if (pose) {
        target.gx = pose.gx;
        target.gy = pose.gy;
        lastMove = now;
        nextWander = now + 1600;
      }
      g.boost += ((pose?.pop ?? 0) - g.boost) * 0.12;
      if (Math.abs(g.boost - (pose?.pop ?? 0)) < 0.001) g.boost = pose?.pop ?? 0;

      // let the gaze drift on its own once the cursor goes quiet
      if (!pose && now - lastMove > 2200 && now > nextWander) {
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

      if (orb) {
        orb.style.transform = orbTransform(size, g);
        orb.style.background = orbBackground(g, tone);
      }
      // in peek mode the script owns the eyes; the orb still follows the cursor
      if (!peek) {
        left.style.transform = eyeTransform(EYE_LEFT, size, g, reachY);
        right.style.transform = eyeTransform(EYE_RIGHT, size, g, reachY);
      }

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
  }, [size, variant, tone, peek, reachY, interactive]);

  // the peek script: wait, rise, look right, look left, centre, blink, duck
  useEffect(() => {
    if (!peek) return;
    const tile = tileRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!tile || !left || !right) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // no cycle — just rest in the visible pose
      tile.style.transform = PEEK_UP;
      return;
    }

    const p: Peek = { gaze: 0, lid: 0 };
    let timer: ReturnType<typeof setTimeout> | undefined;

    const paint = () => {
      left.style.transform = peekEyeTransform(size, p);
      right.style.transform = peekEyeTransform(size, p);
    };

    // [delay before the step, what the step does]
    const script: [number, () => void][] = [
      [9000, () => { tile.style.transform = PEEK_UP; }],
      [1600, () => { p.gaze = 1; paint(); }],
      [1400, () => { p.gaze = -1; paint(); }],
      [1300, () => { p.gaze = 0; paint(); }],
      [900, () => { p.lid = 1; paint(); }],
      [110, () => { p.lid = 0; paint(); }],
      [1100, () => { tile.style.transform = PEEK_DOWN; }],
    ];

    const run = (i: number) => {
      if (i === script.length) {
        timer = setTimeout(() => run(0), 1200);
        return;
      }
      const [wait, step] = script[i];
      timer = setTimeout(() => {
        step();
        run(i + 1);
      }, wait);
    };
    run(0);

    return () => clearTimeout(timer);
  }, [peek, size]);

  const corner = radius ?? defaultRadius(size);

  return (
    <span
      ref={tileRef}
      className={className}
      style={
        peek
          ? {
              // No tile, no plate — just the dome and the eyes rising into view.
              // Absolute so the mark costs the strip no layout space; the caller
              // supplies right/bottom.
              position: "absolute",
              display: "block",
              width: size,
              height: size,
              flex: "none",
              pointerEvents: "none",
              transform: PEEK_DOWN,
              transition: "transform 1.05s cubic-bezier(0.22,1.08,0.3,1)",
            }
          : useBare
            ? {
                // no card of its own: the dome and eyes sit on whatever is behind
                position: "relative",
                display: "block",
                width: size,
                height: size,
                flex: "none",
                pointerEvents: "none",
              }
            : tileStyle(size, corner, shadow, tone)
      }
      aria-hidden
    >
      {peek || bare ? (
        <span ref={orbRef} style={orbStyle(size, tone, round, useGlow)} />
      ) : variant === "css" ? (
        <>
          <span style={plateStyle(corner, tone)} />
          <span ref={orbRef} style={orbStyle(size, tone)} />
        </>
      ) : (
        <Image
          src={EYELESS_ARTWORK}
          alt=""
          width={size}
          height={size}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <span
        ref={leftRef}
        style={peek ? peekEyeStyle(EYE_LEFT, size, tone) : eyeStyle(EYE_LEFT, size, tone)}
      />
      <span
        ref={rightRef}
        style={peek ? peekEyeStyle(EYE_RIGHT, size, tone) : eyeStyle(EYE_RIGHT, size, tone)}
      />
    </span>
  );
}
