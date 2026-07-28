import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { decryptEmailSecret } from "@/lib/email-connection-crypto";
import type { SendEmailResult } from "@/lib/email-types";
import { htmlToPlainText } from "@/lib/email-format";
import { prisma } from "@/lib/prisma";
import {
  appendMessageToSeznamSentFolder,
  buildRawMailMessage,
  isSeznamSmtpConnection,
  type SmtpTransportBundle,
} from "@/lib/seznam-imap-sent";

type EmailConnectionRecord = {
  provider: "GOOGLE" | "OUTLOOK_SMTP" | "CUSTOM_SMTP" | null;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  senderName: string | null;
  senderEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecret: string | null;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiresAt: Date | null;
};

type ConnectionOwner =
  | { kind: "user"; userId: string }
  | { kind: "workspace"; workspaceId: string };

export type WorkspaceSendEmailInput = {
  workspaceId: string;
  /** Preferovaná osobní schránka odesílatele. */
  userId?: string | null;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const connectionSelect = {
  provider: true,
  status: true,
  senderName: true,
  senderEmail: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecret: true,
  googleAccessToken: true,
  googleRefreshToken: true,
  googleTokenExpiresAt: true,
} as const;

function formatFromAddress(senderName: string | null | undefined, senderEmail: string): string {
  const email = senderEmail.trim();
  const name = senderName?.trim().replace(/"/g, "'");
  if (name) {
    return `"${name}" <${email}>`;
  }
  return email;
}

function isValidRecipient(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isConnected(record: EmailConnectionRecord | null): record is EmailConnectionRecord {
  return Boolean(record && record.status === "CONNECTED" && record.provider);
}

async function loadUserConnection(userId: string): Promise<EmailConnectionRecord | null> {
  return prisma.userEmailConnection.findUnique({
    where: { userId },
    select: connectionSelect,
  });
}

async function loadWorkspaceConnection(
  workspaceId: string,
): Promise<EmailConnectionRecord | null> {
  return prisma.workspaceEmailConnection.findUnique({
    where: { workspaceId },
    select: connectionSelect,
  });
}

async function resolveOutboundConnection(
  workspaceId: string,
  userId?: string | null,
): Promise<{ connection: EmailConnectionRecord; owner: ConnectionOwner } | null> {
  if (userId?.trim()) {
    const userConnection = await loadUserConnection(userId.trim());
    if (isConnected(userConnection)) {
      return { connection: userConnection, owner: { kind: "user", userId: userId.trim() } };
    }
  }

  const workspaceConnection = await loadWorkspaceConnection(workspaceId);
  if (isConnected(workspaceConnection)) {
    return {
      connection: workspaceConnection,
      owner: { kind: "workspace", workspaceId },
    };
  }

  return null;
}

async function persistConnectionUpdate(
  owner: ConnectionOwner,
  data: {
    googleAccessToken?: string;
    googleTokenExpiresAt?: Date | null;
    lastError?: string | null;
    status?: "CONNECTED" | "ERROR" | "DISCONNECTED";
  },
) {
  if (owner.kind === "user") {
    await prisma.userEmailConnection.update({
      where: { userId: owner.userId },
      data,
    });
    return;
  }
  await prisma.workspaceEmailConnection.update({
    where: { workspaceId: owner.workspaceId },
    data,
  });
}

async function refreshGoogleAccessToken(
  owner: ConnectionOwner,
  connection: EmailConnectionRecord,
): Promise<string | null> {
  const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_EMAIL_CLIENT_SECRET?.trim();
  const refreshToken = connection.googleRefreshToken?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    return connection.googleAccessToken;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    console.error("Google token refresh failed:", json.error_description);
    return null;
  }

  const expiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000)
      : null;

  await persistConnectionUpdate(owner, {
    googleAccessToken: json.access_token,
    googleTokenExpiresAt: expiresAt,
    lastError: null,
  });

  return json.access_token;
}

async function resolveGoogleAccessToken(
  owner: ConnectionOwner,
  connection: EmailConnectionRecord,
): Promise<string | null> {
  const expiresAt = connection.googleTokenExpiresAt;
  const stillValid =
    connection.googleAccessToken &&
    expiresAt &&
    expiresAt.getTime() > Date.now() + 60_000;

  if (stillValid) {
    return connection.googleAccessToken;
  }

  return refreshGoogleAccessToken(owner, connection);
}

async function createOutboundTransporter(
  owner: ConnectionOwner,
  connection: EmailConnectionRecord,
): Promise<SmtpTransportBundle | { transporter: Transporter; from: string } | { error: string }> {
  const senderEmail = connection.senderEmail?.trim() ?? "";
  if (!senderEmail || !isValidRecipient(senderEmail)) {
    return { error: "Chybí platná adresa odesílatele v nastavení e-mailu." };
  }

  const from = formatFromAddress(connection.senderName, senderEmail);

  if (connection.provider === "OUTLOOK_SMTP" || connection.provider === "CUSTOM_SMTP") {
    const host = connection.smtpHost?.trim();
    const port = connection.smtpPort;
    const secret = connection.smtpSecret ? decryptEmailSecret(connection.smtpSecret) : null;

    if (!host || !port) {
      return { error: "SMTP server není kompletně nakonfigurován." };
    }
    if (!secret) {
      return { error: "Chybí uložené SMTP heslo. Znovu uložte připojení e-mailu." };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: {
        user: senderEmail,
        pass: secret,
      },
    });

    return {
      transporter,
      from,
      senderEmail,
      appPassword: secret,
      smtpHost: host,
    };
  }

  if (connection.provider === "GOOGLE") {
    const accessToken = await resolveGoogleAccessToken(owner, connection);
    if (!accessToken) {
      return {
        error: "Google přístup vypršel. Znovu propojte svůj e-mail v Pracovním prostoru.",
      };
    }

    const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_EMAIL_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      return { error: "Google OAuth není na serveru nakonfigurován." };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: senderEmail,
        clientId,
        clientSecret,
        refreshToken: connection.googleRefreshToken ?? undefined,
        accessToken,
      },
    });

    return { transporter, from };
  }

  return { error: "Neznámý poskytovatel e-mailového připojení." };
}

function isSmtpTransportBundle(
  result: SmtpTransportBundle | { transporter: Transporter; from: string },
): result is SmtpTransportBundle {
  return "smtpHost" in result && "appPassword" in result;
}

async function syncSeznamSentFolder(
  bundle: SmtpTransportBundle,
  mailOptions: nodemailer.SendMailOptions,
): Promise<void> {
  if (!isSeznamSmtpConnection(bundle.smtpHost, bundle.senderEmail)) {
    return;
  }

  const rawMessage = await buildRawMailMessage(mailOptions);

  await appendMessageToSeznamSentFolder({
    user: bundle.senderEmail,
    pass: bundle.appPassword,
    rawMessage,
    sentAt: new Date(),
  });
}

export async function sendWorkspaceEmail({
  workspaceId,
  userId,
  to,
  subject,
  html,
  text,
}: WorkspaceSendEmailInput): Promise<SendEmailResult> {
  const recipient = to?.trim();
  if (!recipient || !isValidRecipient(recipient)) {
    return { success: false, error: "Neplatná e-mailová adresa příjemce." };
  }

  const resolved = await resolveOutboundConnection(workspaceId, userId);
  if (!resolved) {
    return {
      success: false,
      error:
        "E-mail není propojen. Každý člen si v Pracovním prostoru připojí svůj venegard e-mail (Google nebo SMTP).",
    };
  }

  const { connection, owner } = resolved;
  const transportResult = await createOutboundTransporter(owner, connection);
  if ("error" in transportResult) {
    console.error(`[workspace-mailer] ${workspaceId}: ${transportResult.error}`);
    return { success: false, error: transportResult.error };
  }

  const { transporter, from } = transportResult;
  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: recipient,
    subject,
    html,
    text: text ?? htmlToPlainText(html),
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    if (isSmtpTransportBundle(transportResult)) {
      try {
        await syncSeznamSentFolder(transportResult, mailOptions);
      } catch (imapError) {
        const imapMessage =
          imapError instanceof Error
            ? imapError.message
            : "Nepodařilo se uložit kopii do Seznam Odeslané přes IMAP.";

        console.error(`[workspace-mailer] Seznam IMAP sync failed for ${workspaceId}:`, imapMessage);

        await persistConnectionUpdate(owner, {
          lastError: `E-mail odeslán, ale kopie v Odeslané se nepodařila uložit: ${imapMessage}`,
        }).catch(() => undefined);
      }
    }

    await persistConnectionUpdate(owner, { lastError: null, status: "CONNECTED" });

    return { success: true, id: info.messageId ?? null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Neznámá chyba při odesílání přes firemní e-mail.";

    console.error(`[workspace-mailer] send failed for ${workspaceId}:`, message);

    await persistConnectionUpdate(owner, { lastError: message, status: "ERROR" }).catch(
      () => undefined,
    );

    return { success: false, error: message };
  } finally {
    transporter.close();
  }
}
