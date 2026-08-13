"use server";

import { getSessionUser } from "@/app/actions/auth";
import { encryptEmailSecret } from "@/lib/email-connection-crypto";
import type {
  EmailConnectionState,
  SaveSmtpConnectionInput,
} from "@/lib/email-connection-types";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const disconnectedState = (extras?: {
  suggestedSenderName?: string | null;
  suggestedSenderEmail?: string | null;
}): EmailConnectionState => ({
  connected: false,
  provider: null,
  status: "DISCONNECTED",
  senderName: null,
  senderEmail: null,
  smtpHost: null,
  smtpPort: null,
  hasSmtpSecret: false,
  connectedAt: null,
  lastError: null,
  scope: null,
  suggestedSenderName: extras?.suggestedSenderName ?? null,
  suggestedSenderEmail: extras?.suggestedSenderEmail ?? null,
});

function mapConnectionRecord(
  record: {
    provider: "GOOGLE" | "OUTLOOK_SMTP" | "CUSTOM_SMTP" | null;
    status: "DISCONNECTED" | "CONNECTED" | "ERROR";
    senderName: string | null;
    senderEmail: string | null;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecret: string | null;
    connectedAt: Date | null;
    lastError: string | null;
  } | null,
  scope: "user" | "workspace" | null,
  suggested?: { name?: string | null; email?: string | null },
): EmailConnectionState {
  if (!record || record.status === "DISCONNECTED") {
    return disconnectedState({
      suggestedSenderName: suggested?.name ?? null,
      suggestedSenderEmail: suggested?.email ?? null,
    });
  }

  return {
    connected: record.status === "CONNECTED",
    provider: record.provider,
    status: record.status,
    senderName: record.senderName,
    senderEmail: record.senderEmail,
    smtpHost: record.smtpHost,
    smtpPort: record.smtpPort,
    hasSmtpSecret: Boolean(record.smtpSecret),
    connectedAt: record.connectedAt?.toISOString() ?? null,
    lastError: record.lastError,
    scope,
    suggestedSenderName: suggested?.name ?? null,
    suggestedSenderEmail: suggested?.email ?? null,
  };
}

const connectionSelect = {
  provider: true,
  status: true,
  senderName: true,
  senderEmail: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecret: true,
  connectedAt: true,
  lastError: true,
} as const;

/**
 * Stav e-mailu pro aktuálního uživatele (osobní schránka).
 * Workspace connection se tu nezobrazuje — každý si připojuje svůj účet.
 */
export async function getEmailConnectionState(): Promise<EmailConnectionState> {
  const session = await getSessionUser();
  const userId = session.user?.id;
  if (!userId) {
    return disconnectedState();
  }

  const suggested = {
    name: session.user?.name ?? null,
    email: session.user?.email ?? null,
  };

  const record = await prisma.userEmailConnection.findUnique({
    where: { userId },
    select: connectionSelect,
  });

  return mapConnectionRecord(record, "user", suggested);
}

export async function saveSmtpEmailConnection(input: SaveSmtpConnectionInput) {
  const session = await getSessionUser();
  const userId = session.user?.id;
  if (!userId) {
    return { error: "Nejste přihlášen." };
  }

  const senderName = input.senderName.trim();
  const senderEmail = input.senderEmail.trim();
  const smtpHost = input.smtpHost.trim();
  const smtpPort = Number(input.smtpPort);
  const appPassword = input.appPassword.trim();

  if (!senderName) return { error: "Jméno odesílatele je povinné." };
  if (!senderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    return { error: "Zadejte platný firemní e-mail." };
  }
  if (!smtpHost) return { error: "SMTP server je povinný." };
  if (!Number.isFinite(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return { error: "Zadejte platný SMTP port (1–65535)." };
  }
  if (!appPassword) return { error: "Heslo aplikace je povinné." };

  try {
    await prisma.userEmailConnection.upsert({
      where: { userId },
      create: {
        userId,
        provider: input.provider,
        status: "CONNECTED",
        senderName,
        senderEmail,
        smtpHost,
        smtpPort,
        smtpSecret: encryptEmailSecret(appPassword),
        connectedAt: new Date(),
        lastError: null,
      },
      update: {
        provider: input.provider,
        status: "CONNECTED",
        senderName,
        senderEmail,
        smtpHost,
        smtpPort,
        smtpSecret: encryptEmailSecret(appPassword),
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        connectedAt: new Date(),
        lastError: null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/autopilot", "layout");
    return { success: true as const };
  } catch (error) {
    console.error("saveSmtpEmailConnection:", error);
    return { error: "Nepodařilo se uložit SMTP připojení." };
  }
}

export async function disconnectEmailConnection() {
  const session = await getSessionUser();
  const userId = session.user?.id;
  if (!userId) {
    return { error: "Nejste přihlášen." };
  }

  try {
    await prisma.userEmailConnection.upsert({
      where: { userId },
      create: {
        userId,
        status: "DISCONNECTED",
      },
      update: {
        provider: null,
        status: "DISCONNECTED",
        senderName: null,
        senderEmail: null,
        smtpHost: null,
        smtpPort: null,
        smtpSecret: null,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        connectedAt: null,
        lastError: null,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/autopilot", "layout");
    return { success: true as const };
  } catch (error) {
    console.error("disconnectEmailConnection:", error);
    return { error: "Nepodařilo se odpojit e-mail." };
  }
}

export async function getGoogleEmailOAuthUrl() {
  const session = await getSessionUser();
  const userId = session.user?.id?.trim();
  const workspaceId =
    session.workspace?.id?.trim() || session.user?.workspaceId?.trim();
  if (!userId || !workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID?.trim();
  const redirectUri =
    process.env.GOOGLE_EMAIL_REDIRECT_URI?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/email/google/callback`;

  if (!clientId) {
    return {
      error:
        "Google OAuth zatím není nakonfigurován na serveru. Použijte prosím SMTP s heslem aplikace.",
    };
  }

  const { createSignedOAuthState } = await import("@/lib/oauth-state");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    state: createSignedOAuthState({
      kind: "email_google",
      workspaceId,
      userId,
      returnPath: "/settings/outreach",
    }),
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}
