import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type Stripe from "stripe";
import {
  creditsForPlanTier,
  resolvePlanTierFromSubscription,
  resolvePlanTierFromInvoiceLines,
  resolvePlanTierFromStripePriceIds,
} from "@/lib/stripe-plan-tiers";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function mapSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "trialing") return "TRIAL";
  if (status === "active") return "ACTIVE";
  if (status === "canceled") return "CANCELED";
  return status.toUpperCase();
}

function extractCheckoutSessionPriceIds(
  session: Stripe.Checkout.Session,
): string[] {
  const li = session.line_items as unknown;
  if (!li || typeof li !== "object" || !("data" in (li as object))) return [];
  const data = (li as { data: unknown[] }).data ?? [];
  const ids: string[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const price = (raw as { price?: string | { id: string } | null }).price;
    if (!price) continue;
    ids.push(typeof price === "string" ? price : price.id);
  }
  return ids;
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
  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid <= 0) {
    console.log(
      "[stripe webhook] invoice.paid — přeskočeno (žádná skutečná platba, amount_paid <= 0)",
      JSON.stringify({ invoiceId: invoice.id, amountPaid }),
    );
    return;
  }

  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const customerId = getInvoiceCustomerId(invoice);
  if (!customerId && !subscriptionId) {
    console.error("invoice.paid: chybí customer i subscription na faktuře", {
      invoiceId: invoice.id,
    });
    return;
  }

  let workspace =
    customerId != null
      ? await prisma.workspace.findFirst({
          where: { stripeCustomerId: customerId },
        })
      : null;

  if (!workspace && subscriptionId) {
    workspace = await prisma.workspace.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });
  }

  if (!workspace) {
    console.error("invoice.paid: workspace nenalezen", {
      customerId,
      subscriptionId,
      invoiceId: invoice.id,
    });
    return;
  }

  const lines = invoice.lines?.data ?? [];
  let tier = resolvePlanTierFromInvoiceLines(lines)?.toUpperCase() ?? null;

  if ((!tier || tier === "NONE") && subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      tier = resolvePlanTierFromSubscription(sub) ?? tier;
    } catch (e) {
      console.error("invoice.paid: retrieve subscription", e);
    }
  }

  if (!tier || tier === "NONE") {
    tier = "STARTER";
  }

  const creditsTotal = creditsForPlanTier(tier);
  const periodEndUnix = invoiceLinePeriodEndSeconds(invoice);
  const subscriptionPeriodEnd =
    periodEndUnix !== null ? new Date(periodEndUnix * 1000) : undefined;

  const data: Prisma.WorkspaceUpdateInput = {
    stripeCustomerId: customerId ?? workspace.stripeCustomerId ?? undefined,
    stripeSubscriptionId:
      subscriptionId ?? workspace.stripeSubscriptionId ?? undefined,
    planTier: tier,
    creditsTotal,
    subscriptionStatus: "ACTIVE",
    trialEndsAt: null,
    ...(subscriptionPeriodEnd ? { subscriptionPeriodEnd } : {}),
  };

  await prisma.workspace.update({
    where: { id: workspace.id },
    data,
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");

  console.log(
    "[stripe webhook] invoice.paid OK — ostrá platba, tvrdý update workspace",
    JSON.stringify(
      {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        stripeCustomerId: customerId ?? workspace.stripeCustomerId,
        stripeSubscriptionId: subscriptionId ?? workspace.stripeSubscriptionId,
        invoiceId: invoice.id,
        amountPaid,
        currency: invoice.currency,
        firstLinePriceId: lines[0]
          ? getInvoiceLinePriceIdForLog(lines[0])
          : null,
        planTier: tier,
        creditsTotal,
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
        subscriptionPeriodEnd: subscriptionPeriodEnd?.toISOString() ?? null,
      },
      null,
      0,
    ),
  );
}

function getInvoiceLinePriceIdForLog(
  line: Stripe.InvoiceLineItem,
): string | null {
  const pd = line.pricing?.price_details?.price;
  if (pd) return typeof pd === "string" ? pd : pd.id;
  const legacy = (line as unknown as { price?: string | { id: string } }).price;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  return null;
}

function getCheckoutSubscriptionId(
  session: Stripe.Checkout.Session,
): string | null {
  const sub = session.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub)
    return (sub as Stripe.Subscription).id;
  return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object" && "id" in parentSub) {
    return (parentSub as Stripe.Subscription).id;
  }
  const legacy = (invoice as unknown as { subscription?: unknown })
    .subscription;
  if (typeof legacy === "string") return legacy;

  const lines = invoice.lines?.data ?? [];
  for (const line of lines) {
    const ls = line.subscription;
    if (typeof ls === "string") return ls;
    if (ls && typeof ls === "object" && "id" in ls) {
      return (ls as Stripe.Subscription).id;
    }
  }
  return null;
}

async function resolveWorkspaceId(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  const fromMeta = session.metadata?.workspaceId;
  if (fromMeta) return fromMeta;

  const email =
    session.customer_email ?? session.customer_details?.email ?? null;
  if (!email?.trim()) return null;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { workspaceId: true },
  });
  return user?.workspaceId ?? null;
}

async function handleCheckoutSessionCompleted(
  rawSession: Stripe.Checkout.Session,
) {
  let session: Stripe.Checkout.Session = rawSession;
  try {
    session = await stripe.checkout.sessions.retrieve(rawSession.id, {
      expand: ["line_items.data.price", "subscription"],
    });
  } catch (e) {
    console.error("checkout.session.completed: retrieve expanded session", e);
  }

  let sub: Stripe.Subscription | null = null;
  const subField = session.subscription;
  if (subField && typeof subField === "object" && "status" in subField) {
    sub = subField as Stripe.Subscription;
  } else if (typeof subField === "string") {
    try {
      sub = await stripe.subscriptions.retrieve(subField);
    } catch (e) {
      console.error("checkout.session.completed: retrieve subscription", e);
    }
  }

  const isTrialStart = sub?.status === "trialing";

  let planTier = (session.metadata?.planTier ?? "").toUpperCase().trim();
  if (!planTier || planTier === "NONE") {
    const sm = sub?.metadata?.planTier?.trim();
    if (sm) planTier = sm.toUpperCase();
  }
  if (!planTier || planTier === "NONE") {
    const fromPrices = resolvePlanTierFromStripePriceIds(
      extractCheckoutSessionPriceIds(session),
    );
    if (fromPrices) planTier = fromPrices;
  }
  if (!planTier || planTier === "NONE") {
    planTier = "STARTER";
  }

  const subscriptionStatus = sub ? mapSubscriptionStatus(sub.status) : "TRIAL";

  /** Trial: vždy 60 kreditů; bez trialu (okamžitě active): plný pool z `creditsForPlanTier`. */
  const creditsTotal = isTrialStart ? 60 : creditsForPlanTier(planTier);

  const subscriptionId = getCheckoutSubscriptionId(session);

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer &&
          typeof session.customer === "object" &&
          "id" in session.customer
        ? (session.customer as Stripe.Customer).id
        : null;

  const trialPatch: Prisma.WorkspaceUpdateInput = isTrialStart
    ? sub?.trial_end != null
      ? { trialEndsAt: new Date(sub.trial_end * 1000) }
      : {}
    : { trialEndsAt: null };

  const userId = session.metadata?.userId ?? null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });
    if (!user) {
      console.error("checkout.session.completed: uživatel nenalezen", {
        userId,
      });
      return;
    }

    await prisma.workspace.update({
      where: { id: user.workspaceId },
      data: {
        stripeCustomerId: customerId ?? undefined,
        stripeSubscriptionId: subscriptionId ?? undefined,
        subscriptionStatus,
        planTier,
        creditsTotal,
        ...trialPatch,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/settings");

    console.log(
      "[stripe webhook] checkout.session.completed OK",
      JSON.stringify(
        {
          phase: isTrialStart
            ? "trial_start"
            : "checkout_no_trial_or_post_trial",
          workspaceId: user.workspaceId,
          userId,
          sessionId: session.id,
          subscriptionId,
          planTier,
          creditsTotal,
          subscriptionStatus,
          trialEndsAt:
            isTrialStart && sub?.trial_end != null
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
          stripeSubscriptionStatus: sub?.status ?? null,
        },
        null,
        0,
      ),
    );
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

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId ?? undefined,
      subscriptionStatus,
      planTier,
      creditsTotal,
      ...trialPatch,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");

  console.log(
    "[stripe webhook] checkout.session.completed OK (fallback workspace)",
    JSON.stringify(
      {
        phase: isTrialStart ? "trial_start" : "checkout_no_trial_or_post_trial",
        workspaceId,
        sessionId: session.id,
        subscriptionId,
        planTier,
        creditsTotal,
        subscriptionStatus,
        trialEndsAt:
          isTrialStart && sub?.trial_end != null
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        stripeSubscriptionStatus: sub?.status ?? null,
      },
      null,
      0,
    ),
  );
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
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer && "id" in subscription.customer
            ? (subscription.customer as Stripe.Customer).id
            : null;

      const metaWs = subscription.metadata?.workspaceId?.trim();
      let workspace = metaWs
        ? await prisma.workspace.findUnique({ where: { id: metaWs } })
        : null;

      if (!workspace) {
        workspace = await prisma.workspace.findFirst({
          where: {
            OR: [
              { stripeSubscriptionId: subscription.id },
              ...(customerId ? [{ stripeCustomerId: customerId }] : []),
            ],
          },
        });
      }

      if (!workspace) {
        console.error("customer.subscription.updated: workspace nenalezen", {
          subscriptionId: subscription.id,
          workspaceIdMeta: metaWs,
        });
      } else {
        const resolvedTier =
          resolvePlanTierFromSubscription(subscription) || workspace.planTier;
        const tier = (resolvedTier || "STARTER").toUpperCase();
        const newStatus = mapSubscriptionStatus(subscription.status);

        const trialEndsAt =
          newStatus === "ACTIVE"
            ? null
            : subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : null;

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            stripeCustomerId:
              customerId ?? workspace.stripeCustomerId ?? undefined,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: newStatus,
            planTier: tier,
            trialEndsAt,
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
