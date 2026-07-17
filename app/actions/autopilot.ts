"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { sendEmail } from "@/app/actions/email";
import { generateEmailForLead } from "@/app/actions/generate";
import {
  computeScheduledTimes,
  formatSchedulePreview,
  type ScheduleTimeWindow,
} from "@/lib/email-scheduling";
import { prisma } from "@/lib/prisma";
import { plainTextToHtml } from "@/lib/email-format";

export type AutopilotScheduleWindow = ScheduleTimeWindow;

export type QueueAutopilotLeadInput = {
  leadId: string;
  scheduledAt: string;
};

export type QueueAutopilotLeadResult =
  | {
      success: true;
      leadId: string;
      queueId: string;
      subject: string;
      htmlBody: string;
      scheduledAt: string;
      scheduledLabel: string;
    }
  | { error: string };

export type QueueAutopilotCampaignInput = {
  leadIds: string[];
  windows: AutopilotScheduleWindow[];
  maxEmailsPerBatch: number;
};

export type QueueAutopilotCampaignResult =
  | {
      ok: true;
      queuedCount: number;
      errorCount: number;
      results: QueueAutopilotLeadResult[];
    }
  | { error: string };

export type ProcessEmailQueueResult = {
  ok: true;
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
};

export type AutopilotEmailQueueRow = {
  queueId: string;
  leadId: string;
  company: string;
  url: string;
  email: string;
  subject: string;
  htmlBody: string;
  scheduledAt: string;
  status: "PENDING" | "SENT" | "FAILED";
  errorMessage: string | null;
};

export type FullAutoAutomationStatus = "found" | "generating" | "queued" | "sent" | "failed";

export type FullAutoProcessHistoryRow = {
  id: string;
  company: string;
  url: string;
  email: string;
  processedAt: string;
  automationStatus: FullAutoAutomationStatus;
};

function deriveFullAutoAutomationStatus(
  leadStatus: string,
  queueStatus: "PENDING" | "SENT" | "FAILED" | null,
): FullAutoAutomationStatus {
  if (queueStatus === "PENDING") return "queued";
  if (queueStatus === "SENT") return "sent";
  if (queueStatus === "FAILED") return "failed";
  if (leadStatus === "CONTACTED" || leadStatus === "REPLIED" || leadStatus === "MEETING_SET") {
    return "sent";
  }
  return "found";
}

export async function getFullAutoProcessHistory(): Promise<
  { rows: FullAutoProcessHistoryRow[] } | { error: string; rows: FullAutoProcessHistoryRow[] }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen.", rows: [] };
  }

  const leads = await prisma.lead.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 250,
    select: {
      id: true,
      companyName: true,
      domain: true,
      email: true,
      contactEmail: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      emailQueue: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, createdAt: true },
      },
    },
  });

  const rows: FullAutoProcessHistoryRow[] = leads
    .map((lead) => {
      const latestQueue = lead.emailQueue[0] ?? null;
      const processedAt = (latestQueue?.createdAt ?? lead.updatedAt ?? lead.createdAt).toISOString();

      return {
        id: lead.id,
        company: lead.companyName,
        url: lead.domain ?? "",
        email: (lead.contactEmail ?? lead.email ?? "").trim(),
        processedAt,
        automationStatus: deriveFullAutoAutomationStatus(
          lead.status,
          latestQueue?.status ?? null,
        ),
      };
    })
    .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());

  return { rows };
}

export async function queueAutopilotLead(
  input: QueueAutopilotLeadInput,
): Promise<QueueAutopilotLeadResult> {
  const session = await getSessionUser();
  const workspaceId = session.user?.workspaceId;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const leadId = input.leadId?.trim();
  if (!leadId) {
    return { error: "Chybí ID leadu." };
  }

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "Neplatný čas odeslání." };
  }

  const existingPending = await prisma.emailQueue.findFirst({
    where: { leadId, status: "PENDING" },
    select: { id: true },
  });
  if (existingPending) {
    return { error: "Lead už má e-mail ve frontě." };
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId },
    select: { id: true },
  });
  if (!lead) {
    return { error: "Lead nebyl nalezen." };
  }

  const generated = await generateEmailForLead(leadId);
  if ("error" in generated) {
    return { error: generated.error };
  }

  const created = await prisma.emailQueue.create({
    data: {
      leadId: generated.leadId,
      subject: generated.subject,
      htmlBody: generated.htmlBody,
      scheduledAt,
      status: "PENDING",
    },
  });

  revalidatePath("/autopilot");
  revalidatePath("/crm");

  return {
    success: true,
    leadId: generated.leadId,
    queueId: created.id,
    subject: generated.subject,
    htmlBody: generated.htmlBody,
    scheduledAt: scheduledAt.toISOString(),
    scheduledLabel: formatSchedulePreview(scheduledAt),
  };
}

export async function queueAutopilotCampaign(
  input: QueueAutopilotCampaignInput,
): Promise<QueueAutopilotCampaignResult> {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const leadIds = Array.from(new Set((input.leadIds ?? []).filter(Boolean)));
  if (leadIds.length === 0) {
    return { error: "Vyberte alespoň jednu firmu." };
  }

  let scheduledTimes: Date[];
  try {
    scheduledTimes = computeScheduledTimes(
      leadIds.length,
      input.windows,
      input.maxEmailsPerBatch,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neplatná nastavení plánování.";
    return { error: message };
  }

  const results: QueueAutopilotLeadResult[] = [];
  let queuedCount = 0;
  let errorCount = 0;

  for (let index = 0; index < leadIds.length; index += 1) {
    const result = await queueAutopilotLead({
      leadId: leadIds[index],
      scheduledAt: scheduledTimes[index].toISOString(),
    });
    results.push(result);
    if ("success" in result && result.success) {
      queuedCount += 1;
    } else {
      errorCount += 1;
    }
  }

  return {
    ok: true,
    queuedCount,
    errorCount,
    results,
  };
}

export type ProcessEmailQueueOptions = {
  workspaceId?: string;
  ignoreSchedule?: boolean;
};

export async function processEmailQueue(
  limit = 50,
  options?: ProcessEmailQueueOptions,
): Promise<ProcessEmailQueueResult> {
  const now = new Date();

  const pending = await prisma.emailQueue.findMany({
    where: {
      status: "PENDING",
      ...(options?.ignoreSchedule ? {} : { scheduledAt: { lte: now } }),
      ...(options?.workspaceId ? { lead: { workspaceId: options.workspaceId } } : {}),
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    include: {
      lead: {
        select: {
          id: true,
          companyName: true,
          workspaceId: true,
          email: true,
          contactEmail: true,
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of pending) {
    const recipient = (item.lead.contactEmail ?? item.lead.email ?? "").trim();
    if (!recipient) {
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          errorMessage: "Lead nemá kontaktní e-mail.",
        },
      });
      failed += 1;
      errors.push(`${item.lead.companyName}: chybí e-mail`);
      continue;
    }

    const sendResult = await sendEmail({
      to: recipient,
      subject: item.subject,
      html: item.htmlBody,
      workspaceId: item.lead.workspaceId,
    });

    if (!sendResult.success) {
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          errorMessage: sendResult.error,
        },
      });
      failed += 1;
      errors.push(`${item.lead.companyName}: ${sendResult.error}`);
      continue;
    }

    await prisma.$transaction([
      prisma.emailQueue.update({
        where: { id: item.id },
        data: { status: "SENT", errorMessage: null },
      }),
      prisma.lead.update({
        where: { id: item.lead.id },
        data: { status: "CONTACTED" },
      }),
      prisma.activityLog.create({
        data: {
          workspaceId: item.lead.workspaceId,
          actionType: "EMAIL_SENT",
          title: `E-mail odeslán: ${item.lead.companyName}`,
          description: item.subject,
        },
      }),
      prisma.workspace.update({
        where: { id: item.lead.workspaceId },
        data: { emailsSent: { increment: 1 } },
      }),
    ]);

    sent += 1;
  }

  if (sent > 0 || failed > 0) {
    revalidatePath("/crm");
    revalidatePath("/autopilot");
    revalidatePath("/");
  }

  return {
    ok: true,
    processed: pending.length,
    sent,
    failed,
    errors,
  };
}

export async function forceSendAutopilotEmailQueue(): Promise<
  ProcessEmailQueueResult | { error: string }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const pendingCount = await prisma.emailQueue.count({
    where: {
      status: "PENDING",
      lead: { workspaceId },
    },
  });

  if (pendingCount === 0) {
    return { error: "Ve frontě nejsou žádné e-maily k okamžitému odeslání." };
  }

  return processEmailQueue(Math.max(pendingCount, 50), {
    workspaceId,
    ignoreSchedule: true,
  });
}

export async function clearAutopilotEmailQueue(): Promise<
  { ok: true; deletedCount: number } | { error: string }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const result = await prisma.emailQueue.deleteMany({
    where: {
      status: "PENDING",
      lead: { workspaceId },
    },
  });

  revalidatePath("/autopilot");
  revalidatePath("/crm");

  return { ok: true, deletedCount: result.count };
}

export async function getAutopilotEmailQueue(): Promise<
  { rows: AutopilotEmailQueueRow[] } | { error: string; rows: AutopilotEmailQueueRow[] }
> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen.", rows: [] };
  }

  const items = await prisma.emailQueue.findMany({
    where: {
      lead: { workspaceId },
      status: { in: ["PENDING", "FAILED"] },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    include: {
      lead: {
        select: {
          id: true,
          companyName: true,
          domain: true,
          email: true,
          contactEmail: true,
        },
      },
    },
  });

  return {
    rows: items.map((item) => ({
      queueId: item.id,
      leadId: item.lead.id,
      company: item.lead.companyName,
      url: item.lead.domain ?? "",
      email: (item.lead.contactEmail ?? item.lead.email ?? "").trim(),
      subject: item.subject,
      htmlBody: item.htmlBody,
      scheduledAt: item.scheduledAt.toISOString(),
      status: item.status,
      errorMessage: item.errorMessage,
    })),
  };
}

export type UpdateAutopilotEmailQueueInput = {
  queueId: string;
  subject: string;
  body: string;
};

export async function updateAutopilotEmailQueueItem(
  input: UpdateAutopilotEmailQueueInput,
): Promise<{ ok: true; subject: string; htmlBody: string } | { error: string }> {
  const session = await getSessionUser();
  const workspaceId = session.workspace?.id;
  if (!workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const queueId = input.queueId?.trim();
  const subject = input.subject?.trim();
  const body = input.body?.trim();

  if (!queueId) {
    return { error: "Chybí ID položky ve frontě." };
  }
  if (!subject) {
    return { error: "Předmět e-mailu nemůže být prázdný." };
  }
  if (!body) {
    return { error: "Tělo e-mailu nemůže být prázdné." };
  }

  const item = await prisma.emailQueue.findFirst({
    where: {
      id: queueId,
      status: "PENDING",
      lead: { workspaceId },
    },
    select: { id: true },
  });

  if (!item) {
    return { error: "Položka ve frontě nebyla nalezena nebo již byla odeslána." };
  }

  const htmlBody = plainTextToHtml(body);

  await prisma.emailQueue.update({
    where: { id: queueId },
    data: { subject, htmlBody },
  });

  revalidatePath("/autopilot");
  revalidatePath("/crm");

  return { ok: true, subject, htmlBody };
}
