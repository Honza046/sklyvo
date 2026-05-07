import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-04-22.dahlia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function mapSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "trialing") return "TRIAL";
  if (status === "active") return "ACTIVE";
  if (status === "canceled") return "CANCELED";
  return status.toUpperCase();
}

/** Kredity podle tarifu (soulad s app/pricing/page.tsx). */
function creditsForPlanTier(tier: string): number {
  const key = tier.toUpperCase();
  const map: Record<string, number> = {
    STARTER: 1500,
    PRO: 4500,
    PREMIUM: 12000,
    AGENCY_STARTER: 6000,
    AGENCY_GROWTH: 15000,
    AGENCY_SCALE: 36000,
  };
  return map[key] ?? 10;
}

/** Checkout s probíhajícím Stripe trialem dostane jen 60 kreditů; plný tarif přijde při invoice.paid. */
function creditsOnCheckoutCompleted(
  sub: Stripe.Subscription | null,
  normalizedPlanTier: string,
): number {
  if (sub?.status === "trialing") return 60;
  return creditsForPlanTier(normalizedPlanTier);
}

function invoiceLinePeriodEndSeconds(invoice: Stripe.Invoice): number | null {
  const lines = invoice.lines?.data ?? [];
  for (const line of lines) {
    const end = line.period?.end;
    if (typeof end === "number") return end;
  }
  return null;
}

function getInvoiceCustomerId(invoice: Stripe.Invoice): string | null {
  const c = invoice.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) return (c as Stripe.Customer).id;
  return null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if ((invoice.amount_paid ?? 0) <= 0) return;

  const customerId = getInvoiceCustomerId(invoice);
  if (!customerId) {
    console.error("invoice.paid: invoice bez customer ID");
    return;
  }

  const workspace = await prisma.workspace.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!workspace) {
    console.error("invoice.paid: workspace pro zákazníka nenalezen", {
      customerId,
    });
    return;
  }

  const periodEndUnix = invoiceLinePeriodEndSeconds(invoice);
  const subscriptionPeriodEnd =
    periodEndUnix !== null ? new Date(periodEndUnix * 1000) : undefined;

  const tier = (workspace.planTier || "NONE").toUpperCase();
  const creditsTotal = creditsForPlanTier(tier);

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      creditsTotal,
      ...(subscriptionPeriodEnd ? { subscriptionPeriodEnd } : {}),
      ...(workspace.subscriptionStatus === "TRIAL" ? { subscriptionStatus: "ACTIVE" } : {}),
    },
  });

  console.log("invoice.paid: plné kredity a období nastaveny", {
    workspaceId: workspace.id,
    creditsTotal,
    subscriptionPeriodEnd,
  });
}

function getCheckoutSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return (sub as Stripe.Subscription).id;
  return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object" && "id" in parentSub) {
    return (parentSub as Stripe.Subscription).id;
  }
  const legacy = (invoice as unknown as { subscription?: unknown }).subscription;
  return typeof legacy === "string" ? legacy : null;
}

async function resolveWorkspaceId(session: Stripe.Checkout.Session): Promise<string | null> {
  const fromMeta = session.metadata?.workspaceId;
  if (fromMeta) return fromMeta;

  const email =
    session.customer_email ??
    session.customer_details?.email ??
    null;
  if (!email?.trim()) return null;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { workspaceId: true },
  });
  return user?.workspaceId ?? null;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId ?? null;
  let planTier = (session.metadata?.planTier ?? "").toUpperCase();
  const subscriptionId = getCheckoutSubscriptionId(session);

  let sub: Stripe.Subscription | null = null;
  if (subscriptionId) {
    try {
      sub = await stripe.subscriptions.retrieve(subscriptionId);
      if ((!planTier || planTier === "NONE") && sub.metadata?.planTier) {
        planTier = String(sub.metadata.planTier).toUpperCase();
      }
    } catch (e) {
      console.error("checkout.session.completed: retrieve subscription", e);
    }
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && typeof session.customer === "object" && "id" in session.customer
        ? (session.customer as Stripe.Customer).id
        : null;

  const subscriptionStatus = sub ? mapSubscriptionStatus(sub.status) : "TRIAL";
  const trialEndsAt =
    sub?.trial_end != null ? new Date(sub.trial_end * 1000) : undefined;

  // planTier + kredity žijí na Workspace (User je vázaný přes workspaceId). isTrialExpired v DB nemáme — trial drží trialEndsAt + subscriptionStatus.
  if (userId && planTier) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });
    if (!user) {
      console.error("checkout.session.completed: uživatel nenalezen", { userId });
      return;
    }

    const checkoutCreditsTotal = creditsOnCheckoutCompleted(sub, planTier);

    await prisma.workspace.update({
      where: { id: user.workspaceId },
      data: {
        stripeCustomerId: customerId ?? undefined,
        stripeSubscriptionId: subscriptionId ?? undefined,
        subscriptionStatus,
        planTier,
        creditsTotal: checkoutCreditsTotal,
        ...(trialEndsAt !== undefined ? { trialEndsAt } : {}),
      },
    });

    console.log(`Uživatel ${userId} úspěšně aktualizován na tarif ${planTier}`);
    return;
  }

  const workspaceId = await resolveWorkspaceId(session);
  if (!workspaceId) {
    console.error("checkout.session.completed: workspace nenalezen", {
      sessionId: session.id,
      customerEmail: session.customer_email,
    });
    return;
  }

  let fallbackTier = planTier;
  if (!fallbackTier || fallbackTier === "NONE") {
    fallbackTier = "STARTER";
  }

  const checkoutCreditsTotal = creditsOnCheckoutCompleted(sub, fallbackTier);

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId ?? undefined,
      subscriptionStatus,
      planTier: fallbackTier,
      creditsTotal: checkoutCreditsTotal,
      ...(trialEndsAt !== undefined ? { trialEndsAt } : {}),
    },
  });

  console.log("checkout.session.completed (fallback workspace):", {
    workspaceId,
    customerEmail: session.customer_email,
    planTier: fallbackTier,
    creditsTotal: checkoutCreditsTotal,
  });
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return new NextResponse("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing Stripe-Signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const wsId = subscription.metadata?.workspaceId;
      if (wsId) {
        await prisma.workspace.update({
          where: { id: wsId },
          data: {
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: mapSubscriptionStatus(subscription.status),
            trialEndsAt: subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : undefined,
          },
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const wsId = subscription.metadata?.workspaceId;
      if (wsId) {
        await prisma.workspace.update({
          where: { id: wsId },
          data: {
            subscriptionStatus: "CANCELED",
            stripeSubscriptionId: subscription.id,
          },
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = getInvoiceSubscriptionId(invoice);
      if (subscriptionId) {
        await prisma.workspace.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { subscriptionStatus: "PAST_DUE" },
        });
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
    }
  } catch (error) {
    console.error("Stripe webhook handling error:", error);
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  return new NextResponse("Webhook zpracován", { status: 200 });
}
