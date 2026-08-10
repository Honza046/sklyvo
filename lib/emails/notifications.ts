import { prisma } from "@/lib/prisma";
import type { SendEmailResult } from "@/lib/email-types";
import {
 emailMuted,
 emailParagraph,
 renderSystemEmail,
} from "@/lib/emails/layout";
import { sendSystemEmail } from "@/lib/emails/send-system";
import { getAppBaseUrl } from "@/lib/sklyvo-brand";
import type {
 NotificationPrefKey,
 NotificationPreferences,
} from "@/lib/emails/notification-prefs";

export type {
 NotificationPrefKey,
 NotificationPreferences,
} from "@/lib/emails/notification-prefs";
export { DEFAULT_NOTIFICATION_PREFS } from "@/lib/emails/notification-prefs";

const DAY_MS = 24 * 60 * 60 * 1000;

async function getWorkspaceMembersWithPref(
 workspaceId: string,
 pref: NotificationPrefKey,
) {
 return prisma.user.findMany({
 where: {
 workspaceId,
 [pref]: true,
 },
 select: {
 id: true,
 email: true,
 name: true,
 },
 });
}

async function sendBrandedNotification(input: {
 to: string;
 subject: string;
 title: string;
 bodyHtml: string;
 cta?: { label: string; href: string };
 preview?: string;
}): Promise<SendEmailResult> {
 const html = renderSystemEmail({
 preview: input.preview ?? input.subject,
 title: input.title,
 bodyHtml: input.bodyHtml,
 cta: input.cta,
 showPrefsLink: true,
 });
 return sendSystemEmail({
 to: input.to,
 subject: input.subject,
 html,
 });
}

/** Nová odpověď / stav REPLIED u leadu. */
export async function notifyCampaignReply(input: {
 workspaceId: string;
 companyName: string;
 leadId?: string;
}): Promise<void> {
 const members = await getWorkspaceMembersWithPref(
 input.workspaceId,
 "notifyCampaignReply",
 );
 if (members.length === 0) return;

 const href = input.leadId
 ? `${getAppBaseUrl()}/crm?lead=${encodeURIComponent(input.leadId)}`
 : `${getAppBaseUrl()}/crm`;

 await Promise.allSettled(
 members.map((member) =>
 sendBrandedNotification({
 to: member.email,
 subject: `Nová odpověď: ${input.companyName}`,
 title: "Nová odpověď z kampaně",
 preview: `${input.companyName} odpověděli na váš outreach.`,
 bodyHtml: [
 emailParagraph(
 `Dobrý den${member.name ? ` ${member.name.split(/\s+/)[0]}` : ""},`,
 ),
 emailParagraph(
 `Lead <strong>${escapeHtml(input.companyName)}</strong> má nový stav <strong>Odpověď / Follow up</strong>.`,
 ),
 emailMuted("Otevřete CRM a navážte, dokud je konverzace čerstvá."),
 ].join(""),
 cta: { label: "Otevřít CRM", href },
 }),
 ),
 );
}

/** Obecná změna stavu dealu v CRM (kromě REPLIED, to řeší výše). */
export async function notifyCrmActivity(input: {
 workspaceId: string;
 companyName: string;
 statusLabel: string;
 leadId?: string;
}): Promise<void> {
 const members = await getWorkspaceMembersWithPref(
 input.workspaceId,
 "notifyCrmActivity",
 );
 if (members.length === 0) return;

 const href = input.leadId
 ? `${getAppBaseUrl()}/crm?lead=${encodeURIComponent(input.leadId)}`
 : `${getAppBaseUrl()}/crm`;

 await Promise.allSettled(
 members.map((member) =>
 sendBrandedNotification({
 to: member.email,
 subject: `CRM: ${input.companyName} → ${input.statusLabel}`,
 title: "Nová aktivita v CRM",
 bodyHtml: [
 emailParagraph(
 `Dobrý den${member.name ? ` ${member.name.split(/\s+/)[0]}` : ""},`,
 ),
 emailParagraph(
 `U dealu <strong>${escapeHtml(input.companyName)}</strong> se změnil stav na <strong>${escapeHtml(input.statusLabel)}</strong>.`,
 ),
 ].join(""),
 cta: { label: "Zobrazit deal", href },
 }),
 ),
 );
}

export async function notifyLowCredits(input: {
 workspaceId: string;
 creditsLeft: number;
 creditsTotal: number;
}): Promise<boolean> {
 const workspace = await prisma.workspace.findUnique({
 where: { id: input.workspaceId },
 select: { lastLowCreditsEmailAt: true },
 });
 if (!workspace) return false;

 const last = workspace.lastLowCreditsEmailAt?.getTime() ?? 0;
 if (Date.now() - last < 3 * DAY_MS) return false;

 const members = await getWorkspaceMembersWithPref(
 input.workspaceId,
 "notifyLowCredits",
 );
 if (members.length === 0) return false;

 const pct = Math.round((input.creditsLeft / Math.max(1, input.creditsTotal)) * 100);

 await Promise.allSettled(
 members.map((member) =>
 sendBrandedNotification({
 to: member.email,
 subject: `Nízký stav kreditů (${input.creditsLeft} zbývá)`,
 title: "Docházejí vám kredity",
 bodyHtml: [
 emailParagraph(
 `Dobrý den${member.name ? ` ${member.name.split(/\s+/)[0]}` : ""},`,
 ),
 emailParagraph(
 `Ve workspace zbývá <strong>${input.creditsLeft}</strong> z <strong>${input.creditsTotal}</strong> kreditů (${pct} %).`,
 ),
 emailMuted(
 "Až dojdou, Autopilot a Sniper nebudou moci generovat další zprávy.",
 ),
 ].join(""),
 cta: {
 label: "Doplnit tarif",
 href: `${getAppBaseUrl()}/pricing`,
 },
 }),
 ),
 );

 await prisma.workspace.update({
 where: { id: input.workspaceId },
 data: { lastLowCreditsEmailAt: new Date() },
 });
 return true;
}

export async function notifyBillingTrial(input: {
 workspaceId: string;
 kind: "trial_ending" | "renewal_soon";
 endsAt: Date;
}): Promise<boolean> {
 const workspace = await prisma.workspace.findUnique({
 where: { id: input.workspaceId },
 select: { lastBillingReminderEmailAt: true, planTier: true },
 });
 if (!workspace) return false;

 const last = workspace.lastBillingReminderEmailAt?.getTime() ?? 0;
 if (Date.now() - last < 2 * DAY_MS) return false;

 const members = await getWorkspaceMembersWithPref(
 input.workspaceId,
 "notifyBillingTrial",
 );
 if (members.length === 0) return false;

 const dateLabel = input.endsAt.toLocaleDateString("cs-CZ", {
 day: "numeric",
 month: "long",
 year: "numeric",
 });

 const isTrial = input.kind === "trial_ending";
 const title = isTrial ? "Končí zkušební období" : "Blíží se obnova tarifu";
 const subject = isTrial
 ? `Trial končí ${dateLabel}`
 : `Obnova tarifu ${dateLabel}`;

 await Promise.allSettled(
 members.map((member) =>
 sendBrandedNotification({
 to: member.email,
 subject,
 title,
 bodyHtml: [
 emailParagraph(
 `Dobrý den${member.name ? ` ${member.name.split(/\s+/)[0]}` : ""},`,
 ),
 emailParagraph(
 isTrial
 ? `Vaše zkušební období ve Sklyvo končí <strong>${dateLabel}</strong>.`
 : `Obnova tarifu <strong>${escapeHtml(workspace.planTier)}</strong> je naplánovaná na <strong>${dateLabel}</strong>.`,
 ),
 emailMuted(
 isTrial
 ? "Vyberte tarif včas, ať nepřijdete o Autopilot, Sniper a Radar."
 : "Pokud chcete tarif změnit nebo zrušit, spravujte předplatné v profilu.",
 ),
 ].join(""),
 cta: {
 label: isTrial ? "Vybrat tarif" : "Spravovat předplatné",
 href: isTrial
 ? `${getAppBaseUrl()}/pricing`
 : `${getAppBaseUrl()}/account`,
 },
 }),
 ),
 );

 await prisma.workspace.update({
 where: { id: input.workspaceId },
 data: { lastBillingReminderEmailAt: new Date() },
 });
 return true;
}

export async function notifyWeeklyRadarReport(input: {
 workspaceId: string;
 newLeadsCount: number;
 weekLabel: string;
}): Promise<boolean> {
 const workspace = await prisma.workspace.findUnique({
 where: { id: input.workspaceId },
 select: { lastWeeklyRadarEmailAt: true, name: true },
 });
 if (!workspace) return false;

 const last = workspace.lastWeeklyRadarEmailAt?.getTime() ?? 0;
 if (Date.now() - last < 6 * DAY_MS) return false;

 const members = await getWorkspaceMembersWithPref(
 input.workspaceId,
 "notifyWeeklyRadarReport",
 );
 if (members.length === 0) return false;

 await Promise.allSettled(
 members.map((member) =>
 sendBrandedNotification({
 to: member.email,
 subject: `Týdenní Radar: ${input.newLeadsCount} nových leadů`,
 title: "Týdenní report z Radaru",
 bodyHtml: [
 emailParagraph(
 `Dobrý den${member.name ? ` ${member.name.split(/\s+/)[0]}` : ""},`,
 ),
 emailParagraph(
 `Za období <strong>${escapeHtml(input.weekLabel)}</strong> Radar našel <strong>${input.newLeadsCount}</strong> nových leadů ve workspace <strong>${escapeHtml(workspace.name)}</strong>.`,
 ),
 emailMuted("Projděte si je ve Sniperu nebo CRM a naplánujte outreach."),
 ].join(""),
 cta: {
 label: "Otevřít Radar",
 href: `${getAppBaseUrl()}/radar`,
 },
 }),
 ),
 );

 await prisma.workspace.update({
 where: { id: input.workspaceId },
 data: { lastWeeklyRadarEmailAt: new Date() },
 });
 return true;
}

function escapeHtml(value: string): string {
 return value
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;");
}

const STATUS_LABELS: Record<string, string> = {
 NEW: "Nový lead",
 CONTACTED: "Kontaktováno",
 REPLIED: "Odpověď / Follow up",
 MEETING_SET: "Schůzka",
 CLOSED_WON: "Vyhráno",
 CLOSED_LOST: "Prohráno",
 BREAK_UP: "Break-up",
};

export function leadStatusLabel(status: string): string {
 return STATUS_LABELS[status] ?? status;
}
