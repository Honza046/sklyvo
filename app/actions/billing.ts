"use server";

import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export type WorkspaceInvoiceRow = {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  currency: string;
  createdAt: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

export async function listWorkspaceInvoices(): Promise<
  { invoices: WorkspaceInvoiceRow[] } | { error: string }
> {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { stripeCustomerId: true },
  });

  const customerId = workspace?.stripeCustomerId?.trim();
  if (!customerId) {
    return { invoices: [] };
  }

  try {
    const result = await stripe.invoices.list({
      customer: customerId,
      limit: 24,
    });

    const invoices: WorkspaceInvoiceRow[] = result.data
      .filter((inv) => inv.status !== "draft" && inv.status !== "void")
      .map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountPaid: inv.amount_paid ?? inv.amount_due ?? 0,
        currency: (inv.currency || "czk").toUpperCase(),
        createdAt: new Date((inv.created ?? 0) * 1000).toISOString(),
        pdfUrl: inv.invoice_pdf ?? null,
        hostedUrl: inv.hosted_invoice_url ?? null,
      }));

    return { invoices };
  } catch (error) {
    console.error("listWorkspaceInvoices:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Nepodařilo se načíst faktury ze Stripe.",
    };
  }
}

export async function startTrialCheckout(planTier: string, priceId: string) {
  const auth = await getSessionUser();
  if (!auth.user?.workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  const normalizedTier = (planTier || "NONE").toUpperCase();
  const workspaceId = auth.user.workspaceId;
  const userId = auth.user.id;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: auth.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          userId,
          workspaceId,
          planTier: normalizedTier,
        },
      },
      metadata: {
        userId,
        workspaceId,
        planTier: normalizedTier,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings?canceled=true`,
    });

    if (!session.url) {
      return { error: "Nepodařilo se vytvořit platební bránu." };
    }

    return { url: session.url };
  } catch (error: unknown) {
    console.error("Stripe error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Chyba při komunikaci se Stripe.";
    return { error: message };
  }
}
