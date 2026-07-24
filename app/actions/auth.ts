"use server";

import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationCodeEmail, sendPasswordResetEmail } from "@/app/actions/email";

const SESSION_COOKIE = "session_user_id";
const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      role: true,
      workspaceId: true,
      onboardingTourCompleted: true,
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
      companyContext: workspace.companyContext ?? null,
      companyServices: workspace.companyServices ?? null,
      emailSignature: workspace.emailSignature ?? null,
      systemPrompt: workspace.systemPrompt ?? null,
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

/**
 * Krok 1 bezpečné změny e-mailu: vygeneruje 6místný kód, uloží čekající adresu + kód
 * s 15minutovou expirací a odešle kód na NOVOU adresu. Hlavní e-mail se zatím nemění.
 */
export async function requestEmailChange(
  newEmail: string,
): Promise<{ success: true } | { error: string }> {
  const email = newEmail?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return { error: "Zadejte platnou e-mailovou adresu." };
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
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
    where: { email: { equals: email, mode: "insensitive" }, NOT: { id: userId } },
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

/**
 * Krok 2 bezpečné změny e-mailu: ověří kód a jeho platnost. Při úspěchu nastaví hlavní
 * `email` na hodnotu z `pendingEmail` a vymaže všechny ověřovací sloupce.
 * Identita uživatele žije v Prisma (vlastní cookie session), takže není potřeba
 * synchronizovat externí auth provider.
 */
export async function verifyEmailChange(
  code: string,
): Promise<{ success: true; email: string } | { error: string }> {
  const trimmedCode = code?.trim();
  if (!trimmedCode) {
    return { error: "Zadejte ověřovací kód." };
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
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
    where: { email: { equals: newEmail, mode: "insensitive" }, NOT: { id: userId } },
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

/**
 * Krok 1 obnovy hesla: najde uživatele podle e-mailu, vygeneruje bezpečný unikátní token
 * s 60minutovou expirací, uloží ho a odešle odkaz pro nastavení nového hesla.
 * Z bezpečnostních důvodů (zabránění zjišťování existence účtů) vrací úspěch i tehdy,
 * když uživatel s daným e-mailem neexistuje.
 */
export async function requestPasswordReset(
  email: string,
  appOrigin?: string,
): Promise<{ success: true } | { error: string }> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    return { error: "Zadejte platnou e-mailovou adresu." };
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  // Neexistující účet: tváříme se úspěšně, ale nic neposíláme.
  if (!user) {
    return { success: true };
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

  // #region agent log
  fetch('http://127.0.0.1:7935/ingest/cd58245d-3cee-42b5-b476-9501fa947d37',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc49be'},body:JSON.stringify({sessionId:'dc49be',runId:'post-fix',hypothesisId:'A',location:'auth.ts:requestPasswordReset',message:'Prisma password reset email requested',data:{authSystem:'prisma',hasBaseUrl:Boolean(baseUrl),linkHost:baseUrl},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const sent = await sendPasswordResetEmail(user.email, resetLink);
  if (!sent.success) {
    // #region agent log
    fetch('http://127.0.0.1:7935/ingest/cd58245d-3cee-42b5-b476-9501fa947d37',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc49be'},body:JSON.stringify({sessionId:'dc49be',runId:'post-fix',hypothesisId:'A',location:'auth.ts:requestPasswordReset:send-fail',message:'Password reset email failed',data:{error:sent.error},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return { error: sent.error };
  }

  return { success: true };
}

/**
 * Krok 2 obnovy hesla: ověří platnost tokenu, nastaví nové heslo a token zneplatní.
 * Pozn.: heslo se ukládá stejným způsobem jako ve zbytku aplikace (pole passwordHash).
 * Skutečné hashování (bcrypt) je třeba zavést napříč celou autentizací (registrace, login,
 * změna hesla) v jednom kroku, jinak by se uživatel nemohl přihlásit.
 */
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
  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
    return { error: "Platnost odkazu vypršela. Vyžádejte si nový." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return { success: true };
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true as const };
}