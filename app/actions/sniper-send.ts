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
import { buildLeadFaviconUrl, hostnameFromWebsite } from "@/lib/lead-favicon";
import { authorFromSessionUser } from "@/lib/lead-provenance";
import { inferLeadTags } from "@/lib/lead-tags";
import { nextOutreachAfterSend } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function companyNameFromTarget(host: string | null, email: string): string {
  if (host) return host;
  const at = email.indexOf("@");
  if (at > 0) return email.slice(at + 1).toLowerCase();
  return email;
}

/**
 * Odešle už upravený Sniper e-mail přes napojený firemní účet (SMTP / Google).
 * Neúčtuje kredit znovu — kredit padl při generování.
 * Po odeslání vždy nastaví / založí lead v CRM jako CONTACTED (kontaktováno).
 */
export async function sendSniperEmailNow(input: {
  to: string;
  subject: string;
  body: string;
  targetUrl?: string;
}): Promise<{ success: true; leadId: string } | { error: string; needsEmailSetup?: boolean }> {
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
  const next = nextOutreachAfterSend("INITIAL", now);
  const targetHost = hostnameFromWebsite(input.targetUrl);
  const companyName = companyNameFromTarget(targetHost, to);
  const author = authorFromSessionUser(session.user);
  const tags = inferLeadTags({
    companyName,
    domain: targetHost ?? undefined,
  });
  const faviconUrl = buildLeadFaviconUrl(targetHost);

  let lead = await prisma.lead.findFirst({
    where: {
      workspaceId,
      OR: [
        { email: { equals: to, mode: "insensitive" } },
        { contactEmail: { equals: to, mode: "insensitive" } },
        ...(targetHost
          ? [{ domain: { equals: targetHost, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: { id: true, companyName: true, source: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        companyName,
        domain: targetHost,
        faviconUrl,
        email: to,
        contactEmail: to,
        status: "CONTACTED",
        source: "SNIPER",
        contactedVia: "SNIPER",
        lastContactedAt: now,
        nextOutreachAt: next.nextOutreachAt,
        nextOutreachKind: next.nextOutreachKind,
        author,
        tags,
        workspaceId,
      },
      select: { id: true, companyName: true, source: true },
    });
  } else {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "CONTACTED",
        lastContactedAt: now,
        nextOutreachAt: next.nextOutreachAt,
        nextOutreachKind: next.nextOutreachKind,
        email: to,
        contactEmail: to,
        contactedVia: "SNIPER",
        ...(targetHost
          ? {
              domain: targetHost,
              faviconUrl: faviconUrl ?? undefined,
            }
          : {}),
      },
    });
  }

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
  revalidatePath("/crm");
  revalidatePath("/autopilot");
  revalidatePath("/sniper");
  revalidatePath("/");

  return { success: true, leadId: lead.id };
}
