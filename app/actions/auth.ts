"use server";

import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session_user_id";
const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);

function getFirstName(fullName: string | null | undefined) {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export async function checkIfUserExists(email: string) {
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
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "E-mail a heslo jsou povinné." };
  }

  try {
    // 1. Vytvoříme nový Pracovní prostor (Workspace) pro tohoto uživatele
    const workspace = await prisma.workspace.create({
      data: {
        name: `Prostor - ${name || email}`,
      }
    });

    // 2. Vytvoříme Uživatele a rovnou mu přiřadíme ID nového Workspace
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: password, // Pro produkci sem později přidáme bezpečné hashování (bcrypt)
        workspaceId: workspace.id,
        role: "OWNER" // Zakladatel účtu
      }
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return { success: true };
  } catch (error) {
    console.error("Chyba při registraci:", error);
    return { error: "Tento e-mail už je pravděpodobně zaregistrovaný." };
  }
}

export async function getSessionUser() {
  noStore();
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    return { user: null, workspace: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      workspaceId: true,
    },
  });

  if (!user) {
    cookieStore.delete(SESSION_COOKIE);
    return { user: null, workspace: null };
  }

  const workspaceRaw = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
  });
  if (!workspaceRaw) {
    cookieStore.delete(SESSION_COOKIE);
    return { user: null, workspace: null };
  }

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
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      firstName: getFirstName(user.name) ?? "Uživatel",
      email: user.email,
      image: user.avatarUrl ?? null,
      avatarUrl: user.avatarUrl ?? null,
      workspaceId: user.workspaceId,
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
    },
  };
}

export const getSession = getSessionUser;

export async function getWorkspaceAccessState() {
  const session = await getSessionUser();

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
  const trialEndsAt = session.workspace.trialEndsAt ? new Date(session.workspace.trialEndsAt) : null;
  const trialRemainingMs = trialEndsAt ? Math.max(0, trialEndsAt.getTime() - now) : 0;
  const isTrial = session.workspace.subscriptionStatus === "TRIAL";
  const isSubscribed = ACTIVE_STATUSES.has(session.workspace.subscriptionStatus);
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
  const email = (formData.get("email") as string | null)?.trim();
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return { error: "E-mail a heslo jsou povinné." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || user.passwordHash !== password) {
    return { error: "Neplatné přihlašovací údaje." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

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

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
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

  if (user.passwordHash !== currentPassword) {
    return { error: "Aktuální heslo není správné." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPassword },
  });

  return { success: true };
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true as const };
}