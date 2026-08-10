import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await getSessionUser();
    if (!session.user?.workspaceId) {
      return NextResponse.json(
        { error: "Nejste přihlášeni." },
        { status: 401 },
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: session.user.workspaceId },
      select: { stripeCustomerId: true },
    });

    if (!workspace?.stripeCustomerId) {
      return NextResponse.json(
        { error: "K workspace není připojen Stripe zákazník." },
        { status: 400 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe create-portal error:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit zákaznický portál." },
      { status: 500 },
    );
  }
}
