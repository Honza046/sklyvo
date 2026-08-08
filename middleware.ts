import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Keep auth helpers inline — Vercel Edge rejects some shared `@/` modules. */
const SESSION_COOKIE = "session_user_id";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/recovery",
  "/obnova-hesla",
  "/update-password",
  "/auth/callback",
  "/api/access-state",
  "/api/geo-locale",
]);

function sessionSecretBytes(): Uint8Array {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }
  const fallback =
    process.env.SESSION_SECRET?.trim() ||
    "dev-only-session-secret-change-me-32b";
  return new TextEncoder().encode(fallback.padEnd(32, "0").slice(0, 64));
}

function b64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token?.trim()) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];
  try {
    const secret = sessionSecretBytes();
    const keyData = secret.buffer.slice(
      secret.byteOffset,
      secret.byteOffset + secret.byteLength,
    ) as ArrayBuffer;
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sig = b64urlDecode(signature);
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
      new TextDecoder().decode(b64urlDecode(payload)),
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

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/integrations/google-sheets/callback") ||
    pathname.startsWith("/api/email/google/callback")
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) {
    const response = NextResponse.redirect(new URL("/login", origin));
    if (token) {
      response.cookies.delete(SESSION_COOKIE);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
