import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/actions/auth";
import { LandingPage } from "@/components/sklyvo/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Sklyvo — outreach na autopilota" },
  description: "Sklyvo finds the clients you need and reaches them for you.",
};

export default async function LandingRoute() {
  const session = await getSessionUser();
  if (session.user?.workspaceId) redirect("/");
  return <LandingPage />;
}
