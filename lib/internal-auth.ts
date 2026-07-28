import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s =
    process.env.CRON_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "";
  if (!s && process.env.NODE_ENV === "production") {
    console.error("[internal-auth] CRON_SECRET / SESSION_SECRET missing");
  }
  return s || "dev-only-internal-secret";
}

function hmac(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Token pro trusted server-side volání s konkrétním workspace (cron / interní). */
export function createInternalWorkspaceToken(workspaceId: string): string {
  return hmac(`workspace:${workspaceId.trim()}`);
}

export function verifyInternalWorkspaceToken(
  workspaceId: string | undefined,
  token: string | undefined,
): boolean {
  if (!workspaceId?.trim() || !token?.trim()) return false;
  return safeEqualHex(createInternalWorkspaceToken(workspaceId), token.trim());
}

/** Token pro globální cron job (všechny workspace). */
export function createInternalCronToken(job: string): string {
  return hmac(`cron:${job}`);
}

export function verifyInternalCronToken(
  job: string,
  token: string | undefined,
): boolean {
  if (!token?.trim()) return false;
  return safeEqualHex(createInternalCronToken(job), token.trim());
}
