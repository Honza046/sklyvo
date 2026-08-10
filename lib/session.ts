export const SESSION_COOKIE = "session_user_id";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function getSessionSecretBytes(): Uint8Array {
 const secret = process.env.SESSION_SECRET?.trim();
 if (secret && secret.length >= 32) {
 return new TextEncoder().encode(secret);
 }
 if (process.env.NODE_ENV === "production") {
 throw new Error(
 "[session] SESSION_SECRET missing or too short (min 32 chars) — refusing to mint/verify sessions",
 );
 }
 const fallback =
 process.env.SESSION_SECRET?.trim() ||
 "dev-only-session-secret-change-me-32b";
 return new TextEncoder().encode(fallback.padEnd(32, "0").slice(0, 64));
}

function base64UrlEncode(bytes: Uint8Array): string {
 let binary = "";
 for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
 return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array {
 const padded = input.replace(/-/g, "+").replace(/_/g, "/");
 const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
 const binary = atob(padded + pad);
 const out = new Uint8Array(binary.length);
 for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
 return out;
}

async function importHmacKey(usages: KeyUsage[]): Promise<CryptoKey> {
 const secret = getSessionSecretBytes();
 // Copy into a plain ArrayBuffer — TS DOM libs reject Uint8Array<ArrayBufferLike>.
 const keyData = secret.buffer.slice(
 secret.byteOffset,
 secret.byteOffset + secret.byteLength,
 ) as ArrayBuffer;
 return crypto.subtle.importKey(
 "raw",
 keyData,
 { name: "HMAC", hash: "SHA-256" },
 false,
 usages,
 );
}

/** Edge + Node safe HS256 session JWT (no `jose` / CompressionStream). */
export async function createSessionToken(userId: string): Promise<string> {
 const header = base64UrlEncode(
 new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
 );
 const now = Math.floor(Date.now() / 1000);
 const payload = base64UrlEncode(
 new TextEncoder().encode(
 JSON.stringify({
 sub: userId,
 iat: now,
 exp: now + SESSION_MAX_AGE_SEC,
 }),
 ),
 );
 const data = `${header}.${payload}`;
 const key = await importHmacKey(["sign"]);
 const signature = await crypto.subtle.sign(
 "HMAC",
 key,
 new TextEncoder().encode(data),
 );
 return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Returns user id from a signed session cookie, or null if invalid. */
export async function verifySessionToken(
 token: string | undefined | null,
): Promise<string | null> {
 if (!token?.trim()) return null;
 const parts = token.trim().split(".");
 if (parts.length !== 3) return null;
 const [header, payload, signature] = parts as [string, string, string];
 try {
 const key = await importHmacKey(["verify"]);
 const sig = base64UrlDecode(signature);
 const sigBuf = sig.buffer.slice(
 sig.byteOffset,
 sig.byteOffset + sig.byteLength,
 ) as ArrayBuffer;
 const ok = await crypto.subtle.verify(
 "HMAC",
 key,
 sigBuf,
 new TextEncoder().encode(`${header}.${payload}`),
 );
 if (!ok) return null;

 const claims = JSON.parse(
 new TextDecoder().decode(base64UrlDecode(payload)),
 ) as { sub?: unknown; exp?: unknown };
 if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000)) {
 return null;
 }
 const sub = typeof claims.sub === "string" ? claims.sub.trim() : "";
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
