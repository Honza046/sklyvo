import { ImapFlow } from "imapflow";
import type { Transporter } from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import type { SendMailOptions } from "nodemailer";

const SEZNAM_IMAP_HOST = "imap.seznam.cz";
const SEZNAM_SENT_FOLDER = "Odeslané";
const IMAP_CONNECT_TIMEOUT_MS = 20_000;

export function isSeznamSmtpConnection(smtpHost: string, senderEmail: string): boolean {
 const host = smtpHost.toLowerCase();
 const email = senderEmail.toLowerCase();

 return (
 host.includes("seznam.cz") ||
 host.includes("email.cz") ||
 email.endsWith("@seznam.cz") ||
 email.endsWith("@email.cz") ||
 email.endsWith("@post.cz")
 );
}

export function buildRawMailMessage(mailOptions: SendMailOptions): Promise<Buffer> {
 const composer = new MailComposer(mailOptions);

 return new Promise((resolve, reject) => {
 composer.compile().build((error, message) => {
 if (error) {
 reject(error);
 return;
 }
 resolve(message);
 });
 });
}

async function resolveSeznamSentFolder(client: ImapFlow): Promise<string> {
 const mailboxes = await client.list();

 const sentMailbox = mailboxes.find(
 (mailbox) =>
 mailbox.specialUse === "\\Sent" ||
 mailbox.path === SEZNAM_SENT_FOLDER ||
 mailbox.name === SEZNAM_SENT_FOLDER,
 );

 return sentMailbox?.path ?? SEZNAM_SENT_FOLDER;
}

export async function appendMessageToSeznamSentFolder(input: {
 user: string;
 pass: string;
 rawMessage: Buffer;
 sentAt?: Date;
}): Promise<void> {
 const client = new ImapFlow({
 host: SEZNAM_IMAP_HOST,
 port: 993,
 secure: true,
 auth: {
 user: input.user,
 pass: input.pass,
 },
 logger: false,
 connectionTimeout: IMAP_CONNECT_TIMEOUT_MS,
 greetingTimeout: IMAP_CONNECT_TIMEOUT_MS,
 socketTimeout: IMAP_CONNECT_TIMEOUT_MS,
 });

 await client.connect();

 try {
 const sentFolder = await resolveSeznamSentFolder(client);
 const appendResult = await client.append(sentFolder, input.rawMessage, ["\\Seen"], input.sentAt ?? new Date());

 if (!appendResult) {
 throw new Error(`Seznam IMAP APPEND do složky „${sentFolder}“ nevrátilo potvrzení.`);
 }

 console.info(
 `[seznam-imap-sent] Uloženo do „${sentFolder}“ (uid=${appendResult.uid ?? "n/a"}).`,
 );
 } finally {
 await client.logout().catch(() => undefined);
 }
}

export type SmtpTransportBundle = {
 transporter: Transporter;
 from: string;
 senderEmail: string;
 appPassword: string;
 smtpHost: string;
};
