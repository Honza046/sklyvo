// Subpath imports stay Edge-compatible (main `jose` entry pulls JWE/deflate).
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE = "session_user_id";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }
  // Dev fallback — production must set SESSION_SECRET
  if (process.env.NODE_ENV === "production") {
    console.error("[session] SESSION_SECRET missing or too short (min 32 chars)");
  }
  const fallback =
    process.env.SESSION_SECRET?.trim() ||
    "dev-only-session-secret-change-me-32b";
  return new TextEncoder().encode(fallback.padEnd(32, "0").slice(0, 64));
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSessionSecretKey());
}

/** Returns user id from a signed session cookie, or null if invalid. */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token?.trim()) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey(), {
      algorithms: ["HS256"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
    return sub || null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
