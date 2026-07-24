"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { sendEmail } from "@/app/actions/email";
import { generateEmailForLead } from "@/app/actions/generate";
import {
  OUTREACH_KIND_LABELS,
  nextOutreachAfterSend,
  type OutreachKindValue,
} from "@/lib/outreach";
import { scheduleCrmSheetsSync } from "@/lib/google-sheets-sync";
import { prisma } from "@/lib/prisma";

export type DueOutreachLead = {
  id: string;
  company: string;
  email: string;
  kind: OutreachKindValue;
  dueAt: string;
  overdueDays: number;
};

export async function getDueOutreachLeads(): Promise<{
  leads: DueOutreachLead[];
  error?: string;
}> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { leads: [], error: "Nejste přihlášen." };
  }

  const now = new Date();
  const rows = await prisma.lead.findMany({
    where: {
      workspaceId,
      nextOutreachAt: { lte: now },
      nextOutreachKind: { in: ["FOLLOW_UP", "BREAKUP"] },
      status: { notIn: ["CLOSED_WON", "BREAK_UP", "CLOSED_LOST"] },
    },
    orderBy: { nextOutreachAt: "asc" },
    take: 50,
    select: {
      id: true,
      companyName: true,
      email: true,
      contactEmail: true,
      nextOutreachAt: true,
      nextOutreachKind: true,
    },
  });

  return {
    leads: rows
      .filter((r) => r.nextOutreachAt && r.nextOutreachKind)
      .map((r) => {
        const dueAt = r.nextOutreachAt!;
        const overdueDays = Math.max(
          0,
          Math.floor((now.getTime() - dueAt.getTime()) / 86_400_000),
        );
        return {
          id: r.id,
          company: r.companyName,
          email: (r.contactEmail ?? r.email ?? "").trim(),
          kind: r.nextOutreachKind as OutreachKindValue,
          dueAt: dueAt.toISOString(),
          overdueDays,
        };
      }),
  };
}

/**
 * Vygeneruje a ihned odešle follow-up / breakup (nebo první kontakt) z CRM.
 */
export async function sendOutreachEmailNow(input: {
  leadId: string;
  kind: OutreachKindValue;
}): Promise<
  | { success: true; subject: string; kind: OutreachKindValue; nextDueLabel: string | null }
  | { error: string }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const kind = input.kind;
  if (kind !== "INITIAL" && kind !== "FOLLOW_UP" && kind !== "BREAKUP") {
    return { error: "Neplatný typ e-mailu." };
  }

  const leadId = input.leadId?.trim();
  if (!leadId) {
    return { error: "Chybí ID leadu." };
  }

  const existingPending = await prisma.emailQueue.findFirst({
    where: { leadId, status: "PENDING" },
    select: { id: true },
  });
  if (existingPending) {
    return { error: "Lead už má e-mail ve frontě Autopilota — nejdřív ho vyřeš." };
  }

  const generated = await generateEmailForLead(leadId, { workspaceId, kind });
  if ("error" in generated) {
    return { error: generated.error };
  }

  const sendResult = await sendEmail({
    to: generated.recipient,
    subject: generated.subject,
    html: generated.htmlBody,
    text: generated.textBody,
    workspaceId,
  });
  if (!sendResult.success) {
    return { error: sendResult.error };
  }

  const now = new Date();
  const next = nextOutreachAfterSend(kind, now);

  await prisma.$transaction([
    prisma.emailQueue.create({
      data: {
        leadId: generated.leadId,
        subject: generated.subject,
        htmlBody: generated.htmlBody,
        scheduledAt: now,
        status: "SENT",
        kind,
        sentAt: now,
      },
    }),
    prisma.lead.update({
      where: { id: generated.leadId },
      data: {
        status: next.leadStatus as "CONTACTED" | "BREAK_UP",
        lastContactedAt: now,
        nextOutreachAt: next.nextOutreachAt,
        nextOutreachKind: next.nextOutreachKind,
      },
    }),
    prisma.activityLog.create({
      data: {
        workspaceId,
        actionType: "EMAIL_SENT",
        title: `${OUTREACH_KIND_LABELS[kind]}: ${generated.companyName}`,
        description: generated.subject,
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
  revalidatePath("/");

  const nextDueLabel =
    next.nextOutreachAt && next.nextOutreachKind
      ? `${OUTREACH_KIND_LABELS[next.nextOutreachKind]} ${next.nextOutreachAt.toLocaleDateString("cs-CZ")}`
      : null;

  return {
    success: true,
    subject: generated.subject,
    kind,
    nextDueLabel,
  };
}

export async function sendOutreachEmailBulk(input: {
  leadIds: string[];
  kind: OutreachKindValue;
}): Promise<{ ok: true; sent: number; failed: number; errors: string[] } | { error: string }> {
  const session = await getSessionUser();
  if (!session.workspace?.id) {
    return { error: "Nejste přihlášen." };
  }

  const ids = Array.from(new Set((input.leadIds ?? []).filter(Boolean))).slice(0, 20);
  if (ids.length === 0) {
    return { error: "Vyber alespoň jeden lead." };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const leadId of ids) {
    const result = await sendOutreachEmailNow({ leadId, kind: input.kind });
    if ("error" in result) {
      failed += 1;
      errors.push(`${leadId}: ${result.error}`);
    } else {
      sent += 1;
    }
  }

  return { ok: true, sent, failed, errors };
}
