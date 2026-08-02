"use client";

import Link from "next/link";
import { type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SubscriptionBillingButton({
  showChoosePlan,
}: {
  showChoosePlan: boolean;
}) {
  const handleBillingPortal = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const toastId = toast.loading("Přesměrovávám do zabezpečeného portálu...");
    try {
      const response = await fetch("/api/stripe/create-portal", { method: "POST" });
      if (!response.ok) {
        throw new Error("Nepodařilo se vytvořit Stripe Portal Session.");
      }
      const { url } = (await response.json()) as { url?: string };
      if (!url) {
        throw new Error("V odpovědi chybí URL zákaznického portálu.");
      }
      window.location.href = url;
    } catch {
      toast.error("Zatím nemáte aktivní platební profil. Přesměrovávám na výběr tarifu...", {
        id: toastId,
      });
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 2000);
    }
  };

  if (showChoosePlan) {
    return (
      <Button
        asChild
        className="h-10 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
      >
        <Link href="/settings/billing">Vybrat tarif</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      className="h-10 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:w-auto"
      onClick={(e) => void handleBillingPortal(e)}
    >
      Spravovat billing
    </Button>
  );
}
