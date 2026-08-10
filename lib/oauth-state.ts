import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type OAuthStateKind = "email_google" | "google_sheets" | "microsoft";

export type OAuthStateClaims = {
  v: 1;
  kind: OAuthStateKind;
  /** Osobní mailbox OAuth (Google e-mail). */
  userId?: string;
  /** Workspace-scoped integrace. */
  workspaceId: string;
  returnPath?: string;
  exp: number;
  nonce: string;
};

const STATE_TTL_SEC = 60 * 15;

function oauthStateSecret(): string {
  const s =
    process.env.SESSION_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET required for OAuth state signing");
  }
  return s || "dev-only-oauth-state-secret-change-me";
}

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", oauthStateSecret())
    .update(payloadB64)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function sanitizeReturnPath(path: string | undefined | null): string {
  const raw = (path || "").trim() || "/settings";
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/settings#integrations";
  }
  return raw;
}

/** Podepsaný OAuth `state` — callback odmítne podvržené userId/workspaceId. */
export function createSignedOAuthState(input: {
  kind: OAuthStateKind;
  workspaceId: string;
  userId?: string;
  returnPath?: string | null;
}): string {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) throw new Error("workspaceId required for OAuth state");

  const claims: OAuthStateClaims = {
    v: 1,
    kind: input.kind,
    workspaceId,
    userId: input.userId?.trim() || undefined,
    returnPath: sanitizeReturnPath(input.returnPath),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SEC,
    nonce: randomBytes(16).toString("hex"),
  };
  const payloadB64 = b64url(JSON.stringify(claims));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifySignedOAuthState(
  state: string | null | undefined,
  expectedKind: OAuthStateKind,
): OAuthStateClaims | null {
  const raw = (state ?? "").trim();
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payloadB64 || !sig) return null;
  if (!safeEqual(sign(payloadB64), sig)) return null;

  try {
    const claims = JSON.parse(
      fromB64url(payloadB64).toString("utf8"),
    ) as OAuthStateClaims;
    if (claims.v !== 1) return null;
    if (claims.kind !== expectedKind) return null;
    if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (!claims.workspaceId?.trim()) return null;
    if (expectedKind === "email_google" && !claims.userId?.trim()) return null;
    return {
      ...claims,
      workspaceId: claims.workspaceId.trim(),
      userId: claims.userId?.trim() || undefined,
      returnPath: sanitizeReturnPath(claims.returnPath),
    };
  } catch {
    return null;
  }
}
