import { prisma } from "@/lib/prisma";

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

/**
 * Fixed-window rate limit v Postgres (funguje na Vercel serverless).
 * `key` např. `copilot:userId` nebo `auth:ip:1.2.3.4`.
 *
 * Product endpoints stay fail-open on limiter outages; auth must pass
 * `failClosed: true` so a DB blip cannot disable brute-force protection.
 */
export async function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  failClosed?: boolean;
}): Promise<RateLimitResult> {
  const key = input.key.trim();
  if (!key || input.limit < 1 || input.windowMs < 1000) {
    return { ok: true, remaining: input.limit };
  }

  const now = Date.now();
  const windowStart = new Date(
    Math.floor(now / input.windowMs) * input.windowMs,
  );

  try {
    const row = await prisma.rateLimitBucket.upsert({
      where: {
        key_windowStart: { key, windowStart },
      },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    if (row.count > input.limit) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((windowStart.getTime() + input.windowMs - now) / 1000),
      );
      return { ok: false, retryAfterSec };
    }

    return { ok: true, remaining: Math.max(0, input.limit - row.count) };
  } catch (err) {
    console.error("[rate-limit]", err);
    if (input.failClosed) {
      return { ok: false, retryAfterSec: 60 };
    }
    return { ok: true, remaining: input.limit };
  }
}

export const RATE_LIMITS = {
  copilot: { limit: 20, windowMs: 10 * 60 * 1000 },
  sniperGenerate: { limit: 60, windowMs: 60 * 60 * 1000 },
  radarSearch: { limit: 30, windowMs: 60 * 60 * 1000 },
  authIp: { limit: 30, windowMs: 15 * 60 * 1000 },
  /** Per-account login attempts — slows credential stuffing across many IPs. */
  authAccount: { limit: 10, windowMs: 15 * 60 * 1000 },
  registerIp: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;
