"use server";

import Stripe from "stripe";
import { getSessionUser } from "@/app/actions/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-04-22.dahlia",
});

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
      error instanceof Error ? error.message : "Chyba při komunikaci se Stripe.";
    return { error: message };
  }
}
