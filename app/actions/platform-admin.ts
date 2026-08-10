"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  ADMIN_RETURN_COOKIE,
  adminReturnCookieOptions,
  createAdminReturnToken,
  getPlatformAdminActor,
  isPlatformAdminEmail,
  requirePlatformAdmin,
  verifyAdminReturnToken,
  writeAdminAuditLog,
} from "@/lib/platform-admin";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  workspaceId: true,
  totpEnabled: true,
  disabledAt: true,
  createdAt: true,
  updatedAt: true,
  avatarUrl: true,
} as const;

async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
}

/** Dedicated Ops login — only platform admins (or local open). */
export async function loginPlatformAdmin(formData: FormData) {
  const { getRequestIp } = await import("@/lib/request-ip");
  const { consumeRateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");
  const ip = await getRequestIp();
  const limited = await consumeRateLimit({
    key: `admin-login:${ip}`,
    ...RATE_LIMITS.authIp,
  });
  if (!limited.ok) {
    return { error: "Příliš mnoho pokusů. Zkuste to za chvíli." };
  }

  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "E-mail a heslo jsou povinné." };
  }

  if (!isPlatformAdminEmail(email)) {
    return { error: "Tento účet nemá přístup do Sklyvo Ops." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      disabledAt: true,
    },
  });

  if (!user) {
    return { error: "Neplatné přihlašovací údaje." };
  }

  if (user.disabledAt) {
    return { error: "Tento účet byl deaktivován." };
  }

  if (!isPlatformAdminEmail(user.email)) {
    return { error: "Tento účet nemá přístup do Sklyvo Ops." };
  }

  const check = await verifyPassword(password, user.passwordHash);
  if (!check.ok) {
    return { error: "Neplatné přihlašovací údaje." };
  }

  if (check.needsRehash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  }

  const { issuePending2faIfNeeded } = await import("@/lib/two-factor-login");
  const twoFactor = await issuePending2faIfNeeded(user.id);
  if (twoFactor.requires2fa) {
    return {
      requires2fa: true as const,
      methods: twoFactor.methods,
    };
  }

  await setSessionCookie(user.id);
  await writeAdminAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "admin.login",
    targetType: "user",
    targetId: user.id,
  });

  return { success: true as const };
}

export async function getAdminLoginState(): Promise<{
  alreadyAdmin: boolean;
}> {
  const actor = await getPlatformAdminActor();
  return { alreadyAdmin: Boolean(actor) };
}

async function assertAdmin() {
  return requirePlatformAdmin();
}

export async function getAdminDashboardStats() {
  await assertAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersTotal,
    workspacesTotal,
    paidWorkspaces,
    newUsers7d,
    newWorkspaces7d,
    creditsAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.workspace.count({
      where: {
        OR: [
          { subscriptionStatus: { in: ["ACTIVE", "TRIALING", "TRIAL"] } },
          {
            AND: [
              { planTier: { not: "NONE" } },
              { planTier: { not: "FREE" } },
            ],
          },
        ],
      },
    }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.workspace.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.workspace.aggregate({
      _sum: { creditsUsed: true, creditsTotal: true },
    }),
  ]);

  return {
    usersTotal,
    workspacesTotal,
    paidWorkspaces,
    newUsers7d,
    newWorkspaces7d,
    creditsUsedSum: creditsAgg._sum.creditsUsed ?? 0,
    creditsTotalSum: creditsAgg._sum.creditsTotal ?? 0,
  };
}

export async function listAdminUsers(query?: string) {
  await assertAdmin();
  const q = query?.trim();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { id: { equals: q } },
          ],
        }
      : undefined,
    select: {
      ...USER_SAFE_SELECT,
      workspace: {
        select: {
          id: true,
          name: true,
          planTier: true,
          subscriptionStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return users;
}

export async function getAdminUser(userId: string) {
  await assertAdmin();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_SAFE_SELECT,
      workspace: {
        select: {
          id: true,
          name: true,
          planTier: true,
          subscriptionStatus: true,
          creditsUsed: true,
          creditsTotal: true,
        },
      },
    },
  });
  return user;
}

export async function listAdminWorkspaces(query?: string) {
  await assertAdmin();
  const q = query?.trim();
  const workspaces = await prisma.workspace.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { planTier: { contains: q, mode: "insensitive" } },
            { stripeCustomerId: { contains: q, mode: "insensitive" } },
            { id: { equals: q } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      companyName: true,
      planTier: true,
      subscriptionStatus: true,
      creditsUsed: true,
      creditsTotal: true,
      leadsCount: true,
      emailsSent: true,
      stripeCustomerId: true,
      createdAt: true,
      _count: { select: { members: true, leads: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return workspaces;
}

export async function getAdminWorkspace(workspaceId: string) {
  await assertAdmin();
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      companyName: true,
      industry: true,
      planTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      creditsUsed: true,
      creditsTotal: true,
      leadsCount: true,
      emailsSent: true,
      activeDeals: true,
      pipelineValue: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          disabledAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      emailConnection: {
        select: { status: true, provider: true, senderEmail: true },
      },
      googleSheetsConnection: {
        select: { status: true, spreadsheetId: true, googleAccountEmail: true },
      },
      microsoftConnection: {
        select: { status: true, msAccountEmail: true },
      },
      fakturoidConnection: {
        select: { accountSlug: true, accountEmail: true, connectedAt: true },
      },
      _count: { select: { leads: true, documents: true, activityLogs: true } },
    },
  });

  if (!workspace) return null;

  const leadStatusGroups = await prisma.lead.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { _all: true },
  });
  const leadSourceGroups = await prisma.lead.groupBy({
    by: ["source"],
    where: { workspaceId },
    _count: { _all: true },
  });

  const recentLeads = await prisma.lead.findMany({
    where: { workspaceId },
    select: {
      id: true,
      companyName: true,
      contactEmail: true,
      email: true,
      status: true,
      source: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const recentActivity = await prisma.activityLog.findMany({
    where: { workspaceId },
    select: {
      id: true,
      actionType: true,
      title: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    ...workspace,
    leadStatusGroups: leadStatusGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
    })),
    leadSourceGroups: leadSourceGroups.map((g) => ({
      source: g.source,
      count: g._count._all,
    })),
    recentLeads,
    recentActivity,
  };
}

export async function updateWorkspaceBilling(input: {
  workspaceId: string;
  planTier?: string;
  subscriptionStatus?: string;
  creditsTotal?: number;
  creditsUsed?: number;
}): Promise<{ success: true } | { error: string }> {
  const actor = await assertAdmin();
  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) return { error: "Chybí workspace." };

  const data: {
    planTier?: string;
    subscriptionStatus?: string;
    creditsTotal?: number;
    creditsUsed?: number;
  } = {};

  if (typeof input.planTier === "string" && input.planTier.trim()) {
    data.planTier = input.planTier.trim().toUpperCase();
  }
  if (
    typeof input.subscriptionStatus === "string" &&
    input.subscriptionStatus.trim()
  ) {
    data.subscriptionStatus = input.subscriptionStatus.trim().toUpperCase();
  }
  if (
    typeof input.creditsTotal === "number" &&
    Number.isFinite(input.creditsTotal) &&
    input.creditsTotal >= 0
  ) {
    data.creditsTotal = Math.floor(input.creditsTotal);
  }
  if (
    typeof input.creditsUsed === "number" &&
    Number.isFinite(input.creditsUsed) &&
    input.creditsUsed >= 0
  ) {
    data.creditsUsed = Math.floor(input.creditsUsed);
  }

  if (Object.keys(data).length === 0) {
    return { error: "Nic ke změně." };
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
    select: {
      id: true,
      planTier: true,
      subscriptionStatus: true,
      creditsTotal: true,
      creditsUsed: true,
    },
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "workspace.billing.update",
    targetType: "workspace",
    targetId: workspaceId,
    meta: data,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/workspaces");
  revalidatePath(`/admin/workspaces/${workspaceId}`);
  return { success: true };
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<{ success: true } | { error: string }> {
  const actor = await assertAdmin();
  if (!userId?.trim()) return { error: "Chybí uživatel." };
  if (userId === actor.id) {
    return { error: "Nemůžete deaktivovat vlastní admin účet." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { disabledAt: disabled ? new Date() : null },
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: disabled ? "user.disable" : "user.enable",
    targetType: "user",
    targetId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function startImpersonation(
  userId: string,
): Promise<{ success: true } | { error: string }> {
  const actor = await assertAdmin();
  if (!userId?.trim()) return { error: "Chybí uživatel." };
  if (userId === actor.id) {
    return { error: "Už jste přihlášeni jako tento uživatel." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, disabledAt: true },
  });
  if (!target) return { error: "Uživatel nenalezen." };
  if (target.disabledAt) {
    return { error: "Účet je deaktivovaný. Nejdřív ho zapněte." };
  }

  const cookieStore = await cookies();
  const returnToken = await createAdminReturnToken(actor.id);
  cookieStore.set(ADMIN_RETURN_COOKIE, returnToken, adminReturnCookieOptions());
  cookieStore.set(
    SESSION_COOKIE,
    await createSessionToken(target.id),
    sessionCookieOptions(),
  );

  await writeAdminAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "user.impersonate.start",
    targetType: "user",
    targetId: target.id,
    meta: { targetEmail: target.email },
  });

  return { success: true };
}

export async function stopImpersonation(): Promise<
  { success: true } | { error: string }
> {
  const cookieStore = await cookies();
  const actorId = await verifyAdminReturnToken(
    cookieStore.get(ADMIN_RETURN_COOKIE)?.value,
  );
  if (!actorId) {
    return { error: "Žádná aktivní impersonace." };
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, email: true, disabledAt: true },
  });
  if (!actor || actor.disabledAt) {
    cookieStore.delete(ADMIN_RETURN_COOKIE);
    return { error: "Admin účet není dostupný." };
  }

  const currentId = await verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );

  cookieStore.set(
    SESSION_COOKIE,
    await createSessionToken(actor.id),
    sessionCookieOptions(),
  );
  cookieStore.delete(ADMIN_RETURN_COOKIE);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: "user.impersonate.stop",
    targetType: "user",
    targetId: currentId ?? "unknown",
  });

  return { success: true };
}

export async function getImpersonationBannerState(): Promise<{
  active: boolean;
  targetName: string | null;
  targetEmail: string | null;
  actorEmail: string | null;
} | null> {
  const cookieStore = await cookies();
  const actorId = await verifyAdminReturnToken(
    cookieStore.get(ADMIN_RETURN_COOKIE)?.value,
  );
  if (!actorId) return { active: false, targetName: null, targetEmail: null, actorEmail: null };

  const sessionId = await verifySessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!sessionId || sessionId === actorId) {
    return { active: false, targetName: null, targetEmail: null, actorEmail: null };
  }

  const [target, actor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionId },
      select: { name: true, email: true },
    }),
    prisma.user.findUnique({
      where: { id: actorId },
      select: { email: true },
    }),
  ]);

  return {
    active: true,
    targetName: target?.name ?? null,
    targetEmail: target?.email ?? null,
    actorEmail: actor?.email ?? null,
  };
}

export async function listAdminAuditLogs(limit = 80) {
  await assertAdmin();
  return prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}
