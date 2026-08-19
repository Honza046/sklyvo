import { decryptSecret, encryptSecret } from "@/lib/email-connection-crypto";
import { notifyCampaignReply } from "@/lib/emails/notifications";
import {
  findImapRepliesBatch,
  resolveImapEndpoint,
} from "@/lib/imap-reply-sync";
import { prisma } from "@/lib/prisma";

type ConnectionOwner =
  | { kind: "user"; userId: string }
  | { kind: "workspace"; workspaceId: string };

type EmailConnection = {
  provider: "GOOGLE" | "OUTLOOK_SMTP" | "CUSTOM_SMTP" | null;
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  senderEmail: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecret: string | null;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiresAt: Date | null;
};

const SMTP_PROVIDERS = ["OUTLOOK_SMTP", "CUSTOM_SMTP"] as const;
const REPLY_PROVIDERS = ["GOOGLE", ...SMTP_PROVIDERS] as const;

export async function workspaceHasEmailReplySync(
  workspaceId: string,
): Promise<boolean> {
  const providerFilter = { in: [...REPLY_PROVIDERS] };

  const [workspaceConn, userConn] = await Promise.all([
    prisma.workspaceEmailConnection.findFirst({
      where: { workspaceId, provider: providerFilter, status: "CONNECTED" },
      select: { id: true },
    }),
    prisma.userEmailConnection.findFirst({
      where: {
        provider: providerFilter,
        status: "CONNECTED",
        user: { workspaceId },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(workspaceConn || userConn);
}

const connectionSelect = {
  provider: true,
  status: true,
  senderEmail: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecret: true,
  googleAccessToken: true,
  googleRefreshToken: true,
  googleTokenExpiresAt: true,
} as const;

const syncThrottle = new Map<string, number>();
const THROTTLE_MS = 90_000;
const MAX_LEADS_PER_RUN = 80;
const MAX_SYNC_DURATION_MS = 20_000;

function logReplySyncDebug(message: string, detail?: Record<string, unknown>) {
  if (process.env.EMAIL_REPLY_SYNC_DEBUG === "1") {
    console.info(`[email-reply-sync] ${message}`, detail ?? "");
  }
}

function scheduleWorkspaceEmailReplySync(workspaceId: string) {
  void syncWorkspaceEmailReplies(workspaceId).catch((err) => {
    logReplySyncDebug("background sync failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
  });
}

function gmailAfterDate(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function leadReplyEmail(contactEmail: string | null, email: string | null) {
  const value = (contactEmail ?? email ?? "").trim().toLowerCase();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

async function persistConnectionUpdate(
  owner: ConnectionOwner,
  data: {
    googleAccessToken?: string;
    googleTokenExpiresAt?: Date | null;
    lastError?: string | null;
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

async function resolveGoogleAccessToken(
  owner: ConnectionOwner,
  connection: EmailConnection,
): Promise<string | null> {
  const expiresAt = connection.googleTokenExpiresAt;
  const stillValid =
    connection.googleAccessToken &&
    expiresAt &&
    expiresAt.getTime() > Date.now() + 60_000;

  if (stillValid) {
    return decryptSecret(connection.googleAccessToken);
  }

  const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_EMAIL_CLIENT_SECRET?.trim();
  const refreshToken = decryptSecret(connection.googleRefreshToken);

  if (!clientId || !clientSecret || !refreshToken) {
    return decryptSecret(connection.googleAccessToken);
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
  };

  if (!response.ok || !json.access_token) {
    return null;
  }

  const nextExpiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000)
      : null;

  await persistConnectionUpdate(owner, {
    googleAccessToken: encryptSecret(json.access_token),
    googleTokenExpiresAt: nextExpiresAt,
    lastError: null,
  });

  return json.access_token;
}

async function findGmailReplyMessage(
  accessToken: string,
  fromEmail: string,
  after: Date,
): Promise<Date | null> {
  const query = `from:${fromEmail} in:inbox after:${gmailAfterDate(after)}`;
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=3`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!listResponse.ok) {
    return null;
  }

  const listJson = (await listResponse.json()) as {
    messages?: Array<{ id: string }>;
  };

  const messageId = listJson.messages?.[0]?.id;
  if (!messageId) {
    return null;
  }

  const messageResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!messageResponse.ok) {
    return new Date();
  }

  const messageJson = (await messageResponse.json()) as {
    internalDate?: string;
  };

  if (messageJson.internalDate) {
    const repliedAt = new Date(Number(messageJson.internalDate));
    if (!Number.isNaN(repliedAt.getTime()) && repliedAt >= after) {
      return repliedAt;
    }
  }

  return new Date();
}

async function findReplyViaConnection(
  owner: ConnectionOwner,
  connection: EmailConnection,
  fromEmail: string,
  after: Date,
): Promise<Date | null> {
  if (connection.provider !== "GOOGLE") {
    return null;
  }

  const accessToken = await resolveGoogleAccessToken(owner, connection);
  if (!accessToken) return null;
  return findGmailReplyMessage(accessToken, fromEmail, after);
}

async function markLeadReplied(input: {
  workspaceId: string;
  leadId: string;
  companyName: string;
  repliedAt: Date;
}): Promise<boolean> {
  const updated = await prisma.lead.updateMany({
    where: {
      id: input.leadId,
      workspaceId: input.workspaceId,
      status: "CONTACTED",
      repliedAt: null,
    },
    data: {
      status: "REPLIED",
      repliedAt: input.repliedAt,
    },
  });

  if (updated.count > 0) {
    void notifyCampaignReply({
      workspaceId: input.workspaceId,
      companyName: input.companyName,
      leadId: input.leadId,
    }).catch((err) => {
      logReplySyncDebug("notify failed", {
        message: err instanceof Error ? err.message : "unknown",
      });
    });
    return true;
  }

  return false;
}

/** Na dashboardu spouštět na pozadí — neblokuje vykreslení stránky. */
export function triggerWorkspaceEmailReplySync(workspaceId: string) {
  scheduleWorkspaceEmailReplySync(workspaceId);
}

/** Sync inboxu — Gmail API nebo IMAP (Outlook / SMTP). */
export async function syncWorkspaceEmailReplies(
  workspaceId: string,
  options?: { force?: boolean },
): Promise<{ detected: number; skipped?: boolean }> {
  const startedAt = Date.now();
  const deadline = startedAt + MAX_SYNC_DURATION_MS;
  const isPastDeadline = () => Date.now() >= deadline;

  const now = Date.now();
  const last = syncThrottle.get(workspaceId) ?? 0;
  if (!options?.force && now - last < THROTTLE_MS) {
    return { detected: 0, skipped: true };
  }
  syncThrottle.set(workspaceId, now);

  const providerFilter = { in: [...REPLY_PROVIDERS] };

  const [workspaceConn, userConns, leads] = await Promise.all([
    prisma.workspaceEmailConnection.findFirst({
      where: { workspaceId, provider: providerFilter, status: "CONNECTED" },
      select: connectionSelect,
    }),
    prisma.userEmailConnection.findMany({
      where: {
        provider: providerFilter,
        status: "CONNECTED",
        user: { workspaceId },
      },
      select: { ...connectionSelect, userId: true },
    }),
    prisma.lead.findMany({
      where: {
        workspaceId,
        status: "CONTACTED",
        lastContactedAt: { not: null },
        OR: [{ contactEmail: { not: null } }, { email: { not: null } }],
      },
      select: {
        id: true,
        companyName: true,
        contactEmail: true,
        email: true,
        lastContactedAt: true,
      },
      orderBy: { lastContactedAt: "desc" },
      take: MAX_LEADS_PER_RUN,
    }),
  ]);

  const connections: Array<{
    owner: ConnectionOwner;
    connection: EmailConnection;
  }> = [];

  if (workspaceConn) {
    connections.push({
      owner: { kind: "workspace", workspaceId },
      connection: workspaceConn,
    });
  }

  for (const row of userConns) {
    connections.push({
      owner: { kind: "user", userId: row.userId },
      connection: row,
    });
  }

  if (connections.length === 0 || leads.length === 0) {
    return { detected: 0 };
  }

  let detected = 0;
  const pendingLeadIds = new Set(leads.map((lead) => lead.id));

  for (const { owner, connection } of connections) {
    if (pendingLeadIds.size === 0 || isPastDeadline()) {
      break;
    }

    const pendingLeads = leads.filter((lead) => pendingLeadIds.has(lead.id));

    if (connection.provider === "GOOGLE") {
      for (const lead of pendingLeads) {
        if (isPastDeadline()) break;

        const fromEmail = leadReplyEmail(lead.contactEmail, lead.email);
        const after = lead.lastContactedAt;
        if (!fromEmail || !after) continue;

        const repliedAt = await findReplyViaConnection(
          owner,
          connection,
          fromEmail,
          after,
        );
        if (!repliedAt) continue;

        const marked = await markLeadReplied({
          workspaceId,
          leadId: lead.id,
          companyName: lead.companyName,
          repliedAt,
        });

        if (marked) {
          detected += 1;
          pendingLeadIds.delete(lead.id);
        }
      }
      continue;
    }

    if (
      connection.provider === "OUTLOOK_SMTP" ||
      connection.provider === "CUSTOM_SMTP"
    ) {
      const senderEmail = connection.senderEmail?.trim();
      const smtpHost = connection.smtpHost?.trim();
      const secret = connection.smtpSecret
        ? decryptSecret(connection.smtpSecret)
        : null;

      if (!senderEmail || !smtpHost || !secret) {
        continue;
      }

      const imap = resolveImapEndpoint(smtpHost, senderEmail);
      if (!imap) {
        continue;
      }

      const queries: Array<{
        lead: (typeof pendingLeads)[number];
        fromEmail: string;
        after: Date;
      }> = [];

      for (const lead of pendingLeads) {
        const fromEmail = leadReplyEmail(lead.contactEmail, lead.email);
        const after = lead.lastContactedAt;
        if (!fromEmail || !after) continue;
        queries.push({ lead, fromEmail, after });
      }

      if (queries.length === 0) {
        continue;
      }

      let results: Array<Date | null>;
      try {
        results = await findImapRepliesBatch({
          imap,
          user: senderEmail,
          pass: secret,
          queries: queries.map((query) => ({
            fromEmail: query.fromEmail,
            after: query.after,
          })),
        });
      } catch (err) {
        logReplySyncDebug("IMAP batch failed", {
          provider: connection.provider,
          host: imap.host,
          message: err instanceof Error ? err.message : "IMAP sync failed",
        });
        continue;
      }

      for (let i = 0; i < queries.length; i += 1) {
        if (isPastDeadline()) break;

        const repliedAt = results[i];
        if (!repliedAt) continue;

        const { lead } = queries[i];
        const marked = await markLeadReplied({
          workspaceId,
          leadId: lead.id,
          companyName: lead.companyName,
          repliedAt,
        });

        if (marked) {
          detected += 1;
          pendingLeadIds.delete(lead.id);
        }
      }
    }
  }

  return { detected };
}

/** Cron — projde všechny workspace s připojeným e-mailem (Google i SMTP). */
export async function syncAllWorkspaceEmailReplies(): Promise<{
  workspaces: number;
  detected: number;
}> {
  const workspaceIds = new Set<string>();
  const providerFilter = { in: [...REPLY_PROVIDERS] };

  const [workspaceRows, userRows] = await Promise.all([
    prisma.workspaceEmailConnection.findMany({
      where: { provider: providerFilter, status: "CONNECTED" },
      select: { workspaceId: true },
    }),
    prisma.userEmailConnection.findMany({
      where: { provider: providerFilter, status: "CONNECTED" },
      select: { user: { select: { workspaceId: true } } },
    }),
  ]);

  for (const row of workspaceRows) workspaceIds.add(row.workspaceId);
  for (const row of userRows) workspaceIds.add(row.user.workspaceId);

  let detected = 0;
  for (const workspaceId of workspaceIds) {
    const result = await syncWorkspaceEmailReplies(workspaceId, { force: true });
    detected += result.detected;
  }

  return { workspaces: workspaceIds.size, detected };
}
