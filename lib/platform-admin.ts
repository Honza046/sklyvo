import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";
import { readSessionUserId } from "@/lib/session-cookie";

export const ADMIN_RETURN_COOKIE = "sklyvo_admin_return";

/** Comma-separated allowlist — production: set only Jan's email in Vercel env. */
export function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS?.trim() ?? "";
  if (!raw) {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      console.warn(
        "[platform-admin] PLATFORM_ADMIN_EMAILS is empty — admin console locked.",
      );
    }
    return [];
  }
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const allow = getPlatformAdminEmails();
  if (allow.length === 0) return false;
  return allow.includes(email.trim().toLowerCase());
}

export type PlatformAdminActor = {
  id: string;
  email: string;
  name: string | null;
};

export async function getPlatformAdminActor(): Promise<PlatformAdminActor | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      disabledAt: true,
    },
  });
  if (!user || user.disabledAt) return null;
  if (!isPlatformAdminEmail(user.email)) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/** Hard gate for /admin console — redirects to Admin login when needed. */
export async function requirePlatformAdmin(): Promise<PlatformAdminActor> {
  const userId = await readSessionUserId();
  if (!userId) {
    redirect("/admin/login");
  }

  const actor = await getPlatformAdminActor();
  if (!actor) {
    redirect("/admin/forbidden");
  }
  return actor;
}

export async function writeAdminAuditLog(input: {
  actorUserId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metaJson: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}

/** Signed return cookie so impersonation can restore the admin session. */
export async function createAdminReturnToken(actorUserId: string): Promise<string> {
  return createSessionToken(actorUserId);
}

export async function verifyAdminReturnToken(
  token: string | undefined | null,
): Promise<string | null> {
  return verifySessionToken(token);
}

export function adminReturnCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 60 * 60 * 8,
  };
}
