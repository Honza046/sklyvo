/**
 * One-off: wipe all business data for every workspace.
 * Keeps User + Workspace shells (login still works), resets billing/credits/profile to bare FREE.
 *
 * Usage: npx tsx scripts/reset-all-workspaces.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import Stripe from "stripe";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" })
  : null;

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function cancelStripeSubscriptions() {
  if (!stripe) {
    console.warn("No STRIPE_SECRET_KEY — skipping Stripe cancellations");
    return { canceled: 0, errors: 0 };
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { stripeSubscriptionId: { not: null } },
        { stripeCustomerId: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
    },
  });

  let canceled = 0;
  let errors = 0;

  for (const ws of workspaces) {
    if (ws.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(ws.stripeSubscriptionId);
        console.log(`Canceled subscription ${ws.stripeSubscriptionId} (${ws.name})`);
        canceled += 1;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        // Already canceled / missing is fine
        if (
          message.includes("No such subscription") ||
          message.includes("canceled") ||
          message.includes("resource_missing")
        ) {
          console.log(`Subscription already gone: ${ws.stripeSubscriptionId}`);
        } else {
          console.error(`Failed cancel ${ws.stripeSubscriptionId}:`, message);
          errors += 1;
        }
      }
    }
  }

  return { canceled, errors };
}

async function main() {
  console.log("=== Sklyvo full workspace wipe ===");

  const before = {
    users: await prisma.user.count(),
    workspaces: await prisma.workspace.count(),
    leads: await prisma.lead.count(),
    emailQueue: await prisma.emailQueue.count(),
    activityLogs: await prisma.activityLog.count(),
    services: await prisma.service.count(),
    templates: await prisma.template.count(),
    radarSettings: await prisma.radarSettings.count(),
    emailConnections: await prisma.workspaceEmailConnection.count(),
  };
  console.log("Before:", before);

  console.log("\n1) Canceling Stripe subscriptions…");
  const stripeResult = await cancelStripeSubscriptions();
  console.log("Stripe:", stripeResult);

  console.log("\n2) Deleting dependent records…");
  const deleted = {
    emailQueue: (await prisma.emailQueue.deleteMany({})).count,
    leads: (await prisma.lead.deleteMany({})).count,
    activityLogs: (await prisma.activityLog.deleteMany({})).count,
    services: (await prisma.service.deleteMany({})).count,
    templates: (await prisma.template.deleteMany({})).count,
    radarSettings: (await prisma.radarSettings.deleteMany({})).count,
    emailConnections: (await prisma.workspaceEmailConnection.deleteMany({})).count,
  };
  console.log("Deleted:", deleted);

  console.log("\n3) Resetting workspaces to bare FREE…");
  const workspacesUpdated = await prisma.workspace.updateMany({
    data: {
      companyName: null,
      industry: null,
      targetAudience: null,
      defaultTone: null,
      offeredServices: [],
      subscriptionStatus: "FREE",
      trialEndsAt: null,
      subscriptionPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planTier: "NONE",
      creditsUsed: 0,
      creditsTotal: 10,
      leadsCount: 0,
      emailsSent: 0,
      activeDeals: 0,
      pipelineValue: 0,
      emailSignature: null,
      systemPrompt: null,
      forbiddenWords: null,
      companyContext: null,
      companyServices: null,
      webhookUrl: null,
      crmApiKey: null,
    },
  });
  console.log("Workspaces reset:", workspacesUpdated.count);

  console.log("\n4) Resetting user onboarding / pending tokens…");
  const usersUpdated = await prisma.user.updateMany({
    data: {
      onboardingTourCompleted: false,
      pendingEmail: null,
      emailVerificationCode: null,
      emailVerificationCodeExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      // keep email, passwordHash, name, avatarUrl, workspaceId
    },
  });
  console.log("Users reset:", usersUpdated.count);

  const after = {
    users: await prisma.user.count(),
    workspaces: await prisma.workspace.count(),
    leads: await prisma.lead.count(),
    emailQueue: await prisma.emailQueue.count(),
    activityLogs: await prisma.activityLog.count(),
    services: await prisma.service.count(),
    templates: await prisma.template.count(),
    radarSettings: await prisma.radarSettings.count(),
    emailConnections: await prisma.workspaceEmailConnection.count(),
  };
  console.log("\nAfter:", after);
  console.log("=== Done: profiles kept, all business data wiped ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
