import { SignJWT, jwtVerify } from "jose";
import { getAppBaseUrl } from "@/lib/sklyvo-brand";

const PENDING_2FA_MAX_AGE_SEC = 60 * 10;
export const PENDING_2FA_COOKIE = "pending_2fa";
export const WEBAUTHN_CHALLENGE_COOKIE = "webauthn_challenge";

function getSecretKey(): Uint8Array {
 const secret = process.env.SESSION_SECRET?.trim();
 if (!secret || secret.length < 32) {
 if (process.env.NODE_ENV === "production") {
 throw new Error("[two-factor] SESSION_SECRET missing or too short");
 }
 return new TextEncoder().encode(
 (secret || "dev-only-session-secret-change-me-32b").padEnd(32, "0").slice(0, 64),
 );
 }
 return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 64));
}

export async function createPending2faToken(userId: string): Promise<string> {
 return new SignJWT({ sub: userId, purpose: "2fa" })
 .setProtectedHeader({ alg: "HS256" })
 .setIssuedAt()
 .setExpirationTime(`${PENDING_2FA_MAX_AGE_SEC}s`)
 .sign(getSecretKey());
}

export async function verifyPending2faToken(
 token: string | undefined | null,
): Promise<string | null> {
 if (!token?.trim()) return null;
 try {
 const { payload } = await jwtVerify(token, getSecretKey(), {
 algorithms: ["HS256"],
 });
 if (payload.purpose !== "2fa") return null;
 const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
 return sub || null;
 } catch {
 return null;
 }
}

export function pending2faCookieOptions() {
 return {
 httpOnly: true,
 sameSite: "lax" as const,
 secure: process.env.NODE_ENV === "production",
 path: "/",
 maxAge: PENDING_2FA_MAX_AGE_SEC,
 };
}

export function webauthnChallengeCookieOptions() {
 return {
 httpOnly: true,
 sameSite: "lax" as const,
 secure: process.env.NODE_ENV === "production",
 path: "/",
 maxAge: 60 * 5,
 };
}

export function getWebAuthnConfig() {
 const origin = getAppBaseUrl();
 let rpID = "localhost";
 try {
 rpID = new URL(origin).hostname;
 } catch {
 /* keep localhost */
 }
 return {
 rpName: "Sklyvo",
 rpID,
 origin,
 };
}
