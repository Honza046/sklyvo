/**
 * Shared auth for Vercel / external cron hitters.
 * Vercel sends: Authorization: Bearer <CRON_SECRET>
 */
import { timingSafeEqual } from "node:crypto";

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization")?.trim();
  if (!auth) return false;

  return (
    safeEqualString(auth, `Bearer ${secret}`) || safeEqualString(auth, secret)
  );
}
