"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

// Inicializace Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-04-10" as any, 
});

const PRICE_IDS: Record<string, string | undefined> = {
  STARTER: process.env.STRIPE_PRICE_STARTER,
  PRO: process.env.STRIPE_PRICE_PRO,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM,
  AGENCY_STARTER: process.env.STRIPE_PRICE_AGENCY_STARTER,
  AGENCY_GROWTH: process.env.STRIPE_PRICE_AGENCY_GROWTH,
  AGENCY_SCALE: process.env.STRIPE_PRICE_AGENCY_SCALE,
};

export async function createCheckoutSession(formData: FormData) {
  const planTier = (formData.get("planTier") as string | null)?.toUpperCase() ?? "";
  const priceId = PRICE_IDS[planTier];

  if (!priceId) {
    throw new Error("Chybí Price ID pro zvolený tarif.");
  }

  try {
    const session = await getSessionUser();
    if (!session.user?.workspaceId || !session.user.email) {
      throw new Error("Nejste přihlášen.");
    }

    const workspaceRaw = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
    });
    const workspace = workspaceRaw as { id: string; stripeCustomerId?: string | null } | null;
    if (!workspace) throw new Error("Workspace nebyl nalezen.");

    let stripeCustomerId = workspace.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name ?? undefined,
        metadata: { workspaceId: workspace.id },
      });
      stripeCustomerId = customer.id;
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId } as any,
      });
    }

    // Vytvoření platební relace ve Stripe
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription", // Nebo "payment" pro jednorázový nákup kreditů
      payment_method_collection: "always",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId, // ID ceny ze Stripe (např. price_1Oxxx...)
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          workspaceId: workspace.id,
          planTier,
        },
      },
      metadata: {
        workspaceId: workspace.id,
        planTier,
      },
      // Kam se má uživatel vrátit po úspěchu / zrušení platby
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    // Pokud Stripe úspěšně vrátil URL platební brány, přesměrujeme tam uživatele
    if (checkout.url) {
      redirect(checkout.url);
    }
  } catch (error) {
    console.error("Chyba při vytváření Stripe Checkout:", error);
    throw new Error("Nepodařilo se vytvořit platební bránu.");
  }
}