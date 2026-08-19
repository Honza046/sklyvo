import { ImapFlow } from "imapflow";
import { isSeznamSmtpConnection } from "@/lib/seznam-imap-sent";

const IMAP_CONNECT_TIMEOUT_MS = 8_000;

export type ImapEndpoint = {
  host: string;
  port: number;
  secure: boolean;
};

/** Odvodí IMAP server z uloženého SMTP hostitele (Outlook, Seznam, Zoho, …). */
export function resolveImapEndpoint(
  smtpHost: string,
  senderEmail: string,
): ImapEndpoint | null {
  const host = smtpHost.trim().toLowerCase();
  const email = senderEmail.trim().toLowerCase();

  if (
    host.includes("office365") ||
    host.includes("outlook") ||
    email.endsWith("@outlook.com") ||
    email.endsWith("@outlook.cz") ||
    email.endsWith("@hotmail.com") ||
    email.endsWith("@live.com") ||
    email.endsWith("@microsoft.com")
  ) {
    return { host: "outlook.office365.com", port: 993, secure: true };
  }

  if (isSeznamSmtpConnection(smtpHost, senderEmail)) {
    return { host: "imap.seznam.cz", port: 993, secure: true };
  }

  if (host.includes("zoho")) {
    const imapHost = host.startsWith("smtp.") ? host.replace(/^smtp\./, "imap.") : `imap.${host}`;
    return { host: imapHost, port: 993, secure: true };
  }

  if (host.includes("mail.me.com") || host.includes("icloud")) {
    return { host: "imap.mail.me.com", port: 993, secure: true };
  }

  if (host.includes("gmail")) {
    return { host: "imap.gmail.com", port: 993, secure: true };
  }

  if (host.startsWith("smtp.")) {
    return {
      host: host.replace(/^smtp\./, "imap."),
      port: 993,
      secure: true,
    };
  }

  return null;
}

function createImapClient(input: {
  imap: ImapEndpoint;
  user: string;
  pass: string;
}): ImapFlow {
  const client = new ImapFlow({
    host: input.imap.host,
    port: input.imap.port,
    secure: input.imap.secure,
    auth: {
      user: input.user,
      pass: input.pass,
    },
    logger: false,
    connectionTimeout: IMAP_CONNECT_TIMEOUT_MS,
    greetingTimeout: IMAP_CONNECT_TIMEOUT_MS,
    socketTimeout: IMAP_CONNECT_TIMEOUT_MS,
  });

  client.on("error", () => {
    // ImapFlow může emitovat socket timeout po logout — nezabíjet proces.
  });

  return client;
}

async function searchInboxForReply(
  client: ImapFlow,
  fromEmail: string,
  after: Date,
): Promise<Date | null> {
  const since = new Date(after);
  since.setHours(0, 0, 0, 0);

  const uids = await client.search(
    {
      from: fromEmail,
      since,
    },
    { uid: true },
  );

  if (!uids || uids.length === 0) {
    return null;
  }

  const recentUids = uids.slice(-5);
  let best: Date | null = null;

  for await (const message of client.fetch(recentUids, {
    uid: true,
    internalDate: true,
  })) {
    const rawDate = message.internalDate;
    const repliedAt =
      rawDate instanceof Date
        ? rawDate
        : rawDate
          ? new Date(rawDate)
          : null;
    if (!repliedAt || Number.isNaN(repliedAt.getTime()) || repliedAt < after) {
      continue;
    }
    if (!best || repliedAt > best) {
      best = repliedAt;
    }
  }

  return best;
}

/** Najde nejnovější inbox zprávu od leadu po odeslání outreachu. */
export async function findImapReplyMessage(input: {
  imap: ImapEndpoint;
  user: string;
  pass: string;
  fromEmail: string;
  after: Date;
}): Promise<Date | null> {
  const client = createImapClient(input);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      return await searchInboxForReply(client, input.fromEmail, input.after);
    } finally {
      lock.release();
    }
  } catch {
    return null;
  } finally {
    await client.logout().catch(() => undefined);
  }
}

/** Jedno IMAP připojení pro více leadů — dashboard/cron nemusí otevírat desítky spojení. */
export async function findImapRepliesBatch(input: {
  imap: ImapEndpoint;
  user: string;
  pass: string;
  queries: Array<{ fromEmail: string; after: Date }>;
}): Promise<Array<Date | null>> {
  if (input.queries.length === 0) {
    return [];
  }

  const client = createImapClient(input);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const results: Array<Date | null> = [];
      for (const query of input.queries) {
        results.push(await searchInboxForReply(client, query.fromEmail, query.after));
      }
      return results;
    } finally {
      lock.release();
    }
  } catch {
    return input.queries.map(() => null);
  } finally {
    await client.logout().catch(() => undefined);
  }
}
