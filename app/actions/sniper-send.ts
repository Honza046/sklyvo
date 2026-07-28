"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { sendEmail } from "@/app/actions/email";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import {
  htmlToPlainText,
  plainTextToHtml,
  plainTextToMimeText,
  richHtmlToEmailHtml,
  sanitizeEmailRichHtml,
} from "@/lib/email-format";
import { scheduleCrmSheetsSync } from "@/lib/google-sheets-sync";
import { prisma } from "@/lib/prisma";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Odešle už upravený Sniper e-mail přes napojený firemní účet (SMTP / Google).
 * Neúčtuje kredit znovu — kredit padl při generování.
 */
export async function sendSniperEmailNow(input: {
  to: string;
  subject: string;
  body: string;
  targetUrl?: string;
}): Promise<{ success: true } | { error: string; needsEmailSetup?: boolean }> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const to = input.to.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!to || !isValidEmail(to)) {
    return { error: "Zadejte platný kontaktní e-mail příjemce." };
  }
  if (!subject) {
    return { error: "Chybí předmět e-mailu." };
  }
  if (!body) {
    return { error: "Chybí text e-mailu." };
  }

  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(body);
  if (looksLikeHtml && !htmlToPlainText(body).trim()) {
    return { error: "Chybí text e-mailu." };
  }

  const connection = await getEmailConnectionState();
  if (!connection.connected) {
    return {
      error: "Nejdřív napojte firemní e-mail v nastavení.",
      needsEmailSetup: true,
    };
  }

  const html = looksLikeHtml
    ? richHtmlToEmailHtml(sanitizeEmailRichHtml(body))
    : plainTextToHtml(body);
  const text = looksLikeHtml
    ? plainTextToMimeText(htmlToPlainText(body))
    : plainTextToMimeText(body);

  const sendResult = await sendEmail({
    to,
    subject,
    html,
    text,
  });
  if (!sendResult.success) {
    return { error: sendResult.error || "Odeslání selhalo." };
  }

  const now = new Date();
  const targetHost = (() => {
    const raw = (input.targetUrl ?? "").trim();
    if (!raw) return null;
    try {
      const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(withProto).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      return null;
    }
  })();

  const lead = await prisma.lead.findFirst({
    where: {
      workspaceId,
      OR: [
        { email: { equals: to, mode: "insensitive" } },
        { contactEmail: { equals: to, mode: "insensitive" } },
        ...(targetHost
          ? [{ domain: { contains: targetHost, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: { id: true, companyName: true },
    orderBy: { updatedAt: "desc" },
  });

  if (lead) {
    await prisma.$transaction([
      prisma.emailQueue.create({
        data: {
          leadId: lead.id,
          subject,
          htmlBody: html,
          scheduledAt: now,
          status: "SENT",
          kind: "INITIAL",
          sentAt: now,
        },
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "CONTACTED",
          lastContactedAt: now,
          email: to,
          contactEmail: to,
          contactedVia: "SNIPER",
        },
      }),
      prisma.activityLog.create({
        data: {
          workspaceId,
          actionType: "EMAIL_SENT",
          title: `Sniper: ${lead.companyName}`,
          description: subject,
        },
      }),
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { emailsSent: { increment: 1 } },
      }),
    ]);
    scheduleCrmSheetsSync(workspaceId);
  } else {
    await prisma.$transaction([
      prisma.activityLog.create({
        data: {
          workspaceId,
          actionType: "EMAIL_SENT",
          title: `Sniper: ${to}`,
          description: subject,
        },
      }),
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { emailsSent: { increment: 1 } },
      }),
    ]);
  }

  revalidatePath("/crm");
  revalidatePath("/autopilot");
  revalidatePath("/sniper");
  revalidatePath("/");

  return { success: true };
}
