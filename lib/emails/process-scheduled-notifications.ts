import { prisma } from "@/lib/prisma";
import {
 notifyBillingTrial,
 notifyLowCredits,
 notifyWeeklyRadarReport,
} from "@/lib/emails/notifications";

/**
 * Daily cron: low credits, trial/renewal reminders, weekly Radar digest (Mondays).
 */
export async function processScheduledNotifications() {
 const now = new Date();
 let lowCredits = 0;
 let billing = 0;
 let weekly = 0;

 const workspaces = await prisma.workspace.findMany({
 select: {
 id: true,
 creditsUsed: true,
 creditsTotal: true,
 trialEndsAt: true,
 subscriptionPeriodEnd: true,
 subscriptionStatus: true,
 lastWeeklyRadarEmailAt: true,
 },
 });

 for (const ws of workspaces) {
 const total = Math.max(0, ws.creditsTotal ?? 0);
 const used = Math.max(0, ws.creditsUsed ?? 0);
 const left = Math.max(0, total - used);
 if (total > 0 && left / total <= 0.1) {
 const sent = await notifyLowCredits({
 workspaceId: ws.id,
 creditsLeft: left,
 creditsTotal: total,
 });
 if (sent) lowCredits += 1;
 }

 const status = (ws.subscriptionStatus ?? "").toUpperCase();
 const trialEnds = ws.trialEndsAt ? new Date(ws.trialEndsAt) : null;
 if (
 (status === "TRIAL" || status === "TRIALING") &&
 trialEnds &&
 trialEnds.getTime() > now.getTime() &&
 trialEnds.getTime() - now.getTime() <= 3 * 24 * 60 * 60 * 1000
 ) {
 const sent = await notifyBillingTrial({
 workspaceId: ws.id,
 kind: "trial_ending",
 endsAt: trialEnds,
 });
 if (sent) billing += 1;
 }

 const periodEnd = ws.subscriptionPeriodEnd
 ? new Date(ws.subscriptionPeriodEnd)
 : null;
 if (
 status === "ACTIVE" &&
 periodEnd &&
 periodEnd.getTime() > now.getTime() &&
 periodEnd.getTime() - now.getTime() <= 5 * 24 * 60 * 60 * 1000
 ) {
 const sent = await notifyBillingTrial({
 workspaceId: ws.id,
 kind: "renewal_soon",
 endsAt: periodEnd,
 });
 if (sent) billing += 1;
 }
 }

 // Weekly Radar digest — Mondays (UTC)
 if (now.getUTCDay() === 1) {
 const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
 const weekLabel = `${weekAgo.toLocaleDateString("cs-CZ")} – ${now.toLocaleDateString("cs-CZ")}`;

 for (const ws of workspaces) {
 const newLeadsCount = await prisma.lead.count({
 where: {
 workspaceId: ws.id,
 source: "RADAR",
 createdAt: { gte: weekAgo },
 },
 });
 if (newLeadsCount <= 0) continue;

 const sent = await notifyWeeklyRadarReport({
 workspaceId: ws.id,
 newLeadsCount,
 weekLabel,
 });
 if (sent) weekly += 1;
 }
 }

 return {
 ok: true as const,
 lowCredits,
 billing,
 weekly,
 checked: workspaces.length,
 };
}
