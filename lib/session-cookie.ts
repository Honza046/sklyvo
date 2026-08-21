import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionClaims,
  type VerifiedSession,
} from "@/lib/session";

/** Mint a cookie that embeds the user's current sessionVersion. */
export async function mintSessionCookie(userId: string): Promise<void> {
  const token = await createSessionTokenForUser(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
}

/** Signed JWT for a user with their current sessionVersion claim. */
export async function createSessionTokenForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });
  return createSessionToken(userId, user?.sessionVersion ?? 0);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Invalidate every existing session JWT for this user (stolen tokens included). */
export async function revokeAllSessions(userId: string): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return updated.sessionVersion;
}

/**
 * Read + crypto-verify the session cookie, then confirm sessionVersion still
 * matches the user row (password change / revoke-all bumps it).
 */
export async function readVerifiedSession(): Promise<VerifiedSession | null> {
  const cookieStore = await cookies();
  const claims = await verifySessionClaims(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { sessionVersion: true, disabledAt: true },
  });
  if (!user || user.disabledAt) {
    await clearSessionCookie();
    return null;
  }
  if (user.sessionVersion !== claims.sessionVersion) {
    await clearSessionCookie();
    return null;
  }
  return claims;
}

export async function readSessionUserId(): Promise<string | null> {
  const session = await readVerifiedSession();
  return session?.userId ?? null;
}
