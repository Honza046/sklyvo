"use server";

import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  sendVerificationCodeEmail,
  sendPasswordResetEmail,
} from "@/lib/emails/auth-mail";
import { hashPassword, verifyPassword } from "@/lib/password";
import { SESSION_COOKIE } from "@/lib/session";
import {
  clearSessionCookie,
  mintSessionCookie,
  readSessionUserId,
  revokeAllSessions,
} from "@/lib/session-cookie";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AGENCY_MAX_SEATS = 5;

function maxSeatsForPlanTier(planTier: string | null | undefined) {
  const tier = (planTier ?? "NONE").toUpperCase();
  return tier.includes("AGENCY") ? AGENCY_MAX_SEATS : 1;
}

function getFirstName(fullName: string | null | undefined) {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

async function setSessionCookie(userId: string) {
  await mintSessionCookie(userId);
}

export async function checkIfUserExists(email: string) {
  const { getRequestIp } = await import("@/lib/request-ip");
  const { consumeRateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");
  const ip = await getRequestIp();
  const limited = await consumeRateLimit({
    key: `auth-exists:${ip}`,
    ...RATE_LIMITS.authIp,
    failClosed: true,
  });
  if (!limited.ok) {
    return { exists: false as const };
  }

  const trimmed = email.trim();
  if (!trimmed) {
    return { exists: false as const };
  }
  const user = await prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  return { exists: user !== null };
}

export async function registerUser(formData: FormData) {
  const { getRequestIp } = await import("@/lib/request-ip");
  const { consumeRateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");
  const ip = await getRequestIp();
  const limited = await consumeRateLimit({
    key: `register:${ip}`,
    ...RATE_LIMITS.registerIp,
    failClosed: true,
  });
  if (!limited.ok) {
    return { error: "Příliš mnoho registrací. Zkuste to později." };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "E-mail a heslo jsou povinné." };
  }

  if (password.length < 8) {
    return { error: "Heslo musí mít alespoň 8 znaků." };
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: `Prostor - ${name || email}`,
      },
    });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });

    await setSessionCookie(user.id);
    return { success: true };
  } catch (error) {
    console.error("Chyba při registraci:", error);
    return { error: "Tento e-mail už je pravděpodobně zaregistrovaný." };
  }
}

export async function getSessionUser(options?: { includeWorkspaceContent?: boolean }) {
  noStore();
  const includeWorkspaceContent = options?.includeWorkspaceContent !== false;
  const userId = await readSessionUserId();

  if (!userId) {
    return { user: null, workspace: null };
  }

  const cookieStore = await cookies();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      workspaceId: true,
      onboardingTourCompleted: true,
      disabledAt: true,
    },
  });

  if (!user || user.disabledAt) {
    cookieStore.delete(SESSION_COOKIE);
    return { user: null, workspace: null };
  }

  const workspaceRaw = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
    select: {
      id: true,
      name: true,
      companyName: true,
      industry: true,
      targetAudience: true,
      defaultTone: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      planTier: true,
      creditsUsed: true,
      creditsTotal: true,
      leadsCount: true,
      emailsSent: true,
      activeDeals: true,
      pipelineValue: true,
      offeredServices: true,
      ...(includeWorkspaceContent
        ? {
            companyContext: true,
            companyServices: true,
            emailSignature: true,
            systemPrompt: true,
          }
        : {}),
    },
  });
  if (!workspaceRaw) {
    cookieStore.delete(SESSION_COOKIE);
    return { user: null, workspace: null };
  }

  const memberCount = await prisma.user.count({
    where: { workspaceId: user.workspaceId },
  });

  const workspace = workspaceRaw as {
    id: string;
    name: string;
    companyName: string | null;
    industry: string | null;
    targetAudience: string | null;
    defaultTone: string | null;
    subscriptionStatus?: string | null;
    trialEndsAt?: Date | null;
    subscriptionPeriodEnd?: Date | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    planTier?: string | null;
    creditsUsed?: number | null;
    creditsTotal?: number | null;
    leadsCount?: number | null;
    emailsSent?: number | null;
    activeDeals?: number | null;
    pipelineValue?: number | null;
    offeredServices?: string[] | null;
    companyContext?: string | null;
    companyServices?: string | null;
    emailSignature?: string | null;
    systemPrompt?: string | null;
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      firstName: getFirstName(user.name) ?? "Uživatel",
      email: user.email,
      image: user.avatarUrl ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      workspaceId: user.workspaceId,
      onboardingTourCompleted: user.onboardingTourCompleted,
      isPlatformAdmin: isPlatformAdminEmail(user.email),
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      companyName: workspace.companyName ?? null,
      industry: workspace.industry ?? null,
      targetAudience: workspace.targetAudience ?? null,
      defaultTone: workspace.defaultTone ?? null,
      subscriptionStatus: workspace.subscriptionStatus ?? "FREE",
      trialEndsAt: workspace.trialEndsAt ?? null,
      subscriptionPeriodEnd: workspace.subscriptionPeriodEnd ?? null,
      stripeCustomerId: workspace.stripeCustomerId ?? null,
      stripeSubscriptionId: workspace.stripeSubscriptionId ?? null,
      planTier: workspace.planTier ?? "NONE",
      creditsUsed: workspace.creditsUsed ?? 0,
      creditsTotal: workspace.creditsTotal ?? 10,
      leadsCount: workspace.leadsCount ?? 0,
      emailsSent: workspace.emailsSent ?? 0,
      activeDeals: workspace.activeDeals ?? 0,
      pipelineValue: workspace.pipelineValue ?? 0,
      offeredServices: workspace.offeredServices ?? [],
      memberCount,
      maxSeats: maxSeatsForPlanTier(workspace.planTier),
      companyContext: includeWorkspaceContent
        ? (workspace.companyContext ?? null)
        : null,
      companyServices: includeWorkspaceContent
        ? (workspace.companyServices ?? null)
        : null,
      emailSignature: includeWorkspaceContent
        ? (workspace.emailSignature ?? null)
        : null,
      systemPrompt: includeWorkspaceContent
        ? (workspace.systemPrompt ?? null)
        : null,
    },
  };
}

export const getSession = getSessionUser;

export async function getWorkspaceAccessState() {
  const session = await getSessionUser({ includeWorkspaceContent: false });

  if (!session.user || !session.workspace) {
    return {
      isAuthenticated: false,
      isTrial: false,
      isSubscribed: false,
      isBlocked: true,
      trialRemainingMs: 0,
      trialRemainingDays: 0,
      trialEndsAt: null as Date | null,
      workspace: null,
      user: null,
    };
  }

  const now = Date.now();
  const trialEndsAt = session.workspace.trialEndsAt
    ? new Date(session.workspace.trialEndsAt)
    : null;
  const trialRemainingMs = trialEndsAt
    ? Math.max(0, trialEndsAt.getTime() - now)
    : 0;
  const status = (session.workspace.subscriptionStatus ?? "FREE").toUpperCase();
  const planTier = (session.workspace.planTier ?? "NONE").toUpperCase();
  const hasPaidPlanTier = planTier !== "NONE" && planTier !== "FREE";
  // Stripe uses TRIALING; legacy/manual rows may use TRIAL.
  const isTrial = status === "TRIAL" || status === "TRIALING";
  // Paid planTier (e.g. manually provisioned AGENCY) must unlock Radar/Sniper even if status is still FREE.
  const isSubscribed = ACTIVE_STATUSES.has(status) || hasPaidPlanTier;
  const isBlocked = !isSubscribed && (!isTrial || trialRemainingMs <= 0);

  return {
    isAuthenticated: true,
    isTrial,
    isSubscribed,
    isBlocked,
    trialRemainingMs,
    trialRemainingDays: Math.ceil(trialRemainingMs / (1000 * 60 * 60 * 24)),
    trialEndsAt,
    workspace: session.workspace,
    user: session.user,
  };
}

export async function loginUser(formData: FormData) {
  const { getRequestIp } = await import("@/lib/request-ip");
  const { consumeRateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");
  const ip = await getRequestIp();
  const limited = await consumeRateLimit({
    key: `login:${ip}`,
    ...RATE_LIMITS.authIp,
    failClosed: true,
  });
  if (!limited.ok) {
    return { error: "Příliš mnoho pokusů. Zkuste to za chvíli." };
  }

  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "E-mail a heslo jsou povinné." };
  }

  const accountLimited = await consumeRateLimit({
    key: `login-account:${email.toLowerCase()}`,
    ...RATE_LIMITS.authAccount,
    failClosed: true,
  });
  if (!accountLimited.ok) {
    return { error: "Příliš mnoho pokusů. Zkuste to za chvíli." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      disabledAt: true,
    },
  });

  if (!user) {
    return { error: "Neplatné přihlašovací údaje." };
  }

  if (user.disabledAt) {
    return { error: "Tento účet byl deaktivován. Kontaktujte podporu." };
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
  return { success: true as const };
}

export async function updateUserPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: true } | { error: string }> {
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;

  if (!currentPassword || !newPassword) {
    return { error: "Vyplňte všechna pole." };
  }

  if (newPassword.length < 8) {
    return { error: "Nové heslo musí mít alespoň 8 znaků." };
  }

  const userId = await readSessionUserId();
  if (!userId) {
    return { error: "Nejste přihlášeni." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    return { error: "Účet nebyl nalezen." };
  }

  const check = await verifyPassword(currentPassword, user.passwordHash);
  if (!check.ok) {
    return { error: "Aktuální heslo není správné." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  // Invalidate any stolen cookies; keep this browser signed in with a fresh token.
  await revokeAllSessions(userId);
  await setSessionCookie(userId);

  return { success: true };
}

export async function requestEmailChange(
  newEmail: string,
): Promise<{ success: true } | { error: string }> {
  const email = newEmail?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return { error: "Zadejte platnou e-mailovou adresu." };
  }

  const userId = await readSessionUserId();
  if (!userId) {
    return { error: "Nejste přihlášeni." };
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!current) {
    return { error: "Účet nebyl nalezen." };
  }
  if (current.email.trim().toLowerCase() === email) {
    return { error: "Toto je již vaše aktuální e-mailová adresa." };
  }

  const existing = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      NOT: { id: userId },
    },
    select: { id: true },
  });
  if (existing) {
    return { error: "Tento e-mail už používá jiný účet." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingEmail: email,
      emailVerificationCode: code,
      emailVerificationCodeExpiresAt: expiresAt,
    },
  });

  const sent = await sendVerificationCodeEmail(email, code);
  if (!sent.success) {
    return { error: sent.error };
  }

  return { success: true };
}

export async function verifyEmailChange(
  code: string,
): Promise<{ success: true; email: string } | { error: string }> {
  const trimmedCode = code?.trim();
  if (!trimmedCode) {
    return { error: "Zadejte ověřovací kód." };
  }

  const userId = await readSessionUserId();
  if (!userId) {
    return { error: "Nejste přihlášeni." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pendingEmail: true,
      emailVerificationCode: true,
      emailVerificationCodeExpiresAt: true,
    },
  });

  if (!user || !user.pendingEmail || !user.emailVerificationCode) {
    return { error: "Nemáte žádnou čekající změnu e-mailu." };
  }
  if (
    !user.emailVerificationCodeExpiresAt ||
    user.emailVerificationCodeExpiresAt.getTime() < Date.now()
  ) {
    return { error: "Platnost kódu vypršela. Vyžádejte si nový." };
  }
  if (user.emailVerificationCode !== trimmedCode) {
    return { error: "Ověřovací kód není správný." };
  }

  const newEmail = user.pendingEmail;

  const existing = await prisma.user.findFirst({
    where: {
      email: { equals: newEmail, mode: "insensitive" },
      NOT: { id: userId },
    },
    select: { id: true },
  });
  if (existing) {
    return { error: "Tento e-mail mezitím začal používat jiný účet." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: newEmail,
      pendingEmail: null,
      emailVerificationCode: null,
      emailVerificationCodeExpiresAt: null,
    },
  });

  return { success: true, email: newEmail };
}

export async function requestPasswordReset(
  email: string,
  appOrigin?: string,
): Promise<{ success: true } | { error: string }> {
  const { getRequestIp } = await import("@/lib/request-ip");
  const { consumeRateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");
  const ip = await getRequestIp();
  const limited = await consumeRateLimit({
    key: `reset:${ip}`,
    ...RATE_LIMITS.authIp,
    failClosed: true,
  });
  if (!limited.ok) {
    return { error: "Příliš mnoho požadavků. Zkuste to později." };
  }

  const normalized = email?.trim().toLowerCase();
  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    return { error: "Zadejte platnou e-mailovou adresu." };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  if (!user) {
    return { error: "Tento e-mail u nás není registrován." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const envBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const originBase = (appOrigin || "").replace(/\/+$/, "");
  const baseUrl = originBase || envBase || "http://localhost:3001";
  const resetLink = `${baseUrl}/obnova-hesla?token=${token}`;

  const sent = await sendPasswordResetEmail(user.email, resetLink);
  if (!sent.success) {
    // V devu necháme odkaz v logu, ať jde obnovu otestovat i bez ověřené Resend domény.
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[password-reset] Odeslání selhalo, odkaz pro test:",
        resetLink,
      );
      console.info("[password-reset] Důvod:", sent.error);
    }
    return { error: sent.error };
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[password-reset] Odesláno na", user.email, "→", resetLink);
  }

  return { success: true };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success: true } | { error: string }> {
  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    return { error: "Chybí ověřovací token." };
  }
  if (!newPassword || newPassword.length < 8) {
    return { error: "Nové heslo musí mít alespoň 8 znaků." };
  }

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: trimmedToken },
    select: { id: true, passwordResetExpiresAt: true },
  });

  if (!user) {
    return { error: "Neplatný nebo již použitý odkaz pro obnovu hesla." };
  }
  if (
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    return { error: "Platnost odkazu vypršela. Vyžádejte si nový." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      sessionVersion: { increment: 1 },
    },
  });

  await clearSessionCookie();
  return { success: true };
}

export async function clearSession() {
  await clearSessionCookie();
  return { success: true as const };
}
