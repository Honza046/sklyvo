"use client";

import Link from "next/link";
import { type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SubscriptionBillingButton({
  showChoosePlan,
  isAgency = false,
}: {
  showChoosePlan: boolean;
  isAgency?: boolean;
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
      toast.error("Zatím nemáte aktivní platební profil. Přesměrovávám na výběr tarifu...", { id: toastId });
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 2000);
    }
  };

  if (showChoosePlan) {
    return (
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <Button asChild className="rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700">
          <Link href="/settings/billing">Vybrat tarif</Link>
        </Button>
        {isAgency && (
          <p className="max-w-[16rem] text-right text-[11px] leading-snug text-muted-foreground">
            U Agency účtu billing spravuje jeden profil (vlastník workspace).
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        type="button"
        className="rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
        onClick={(e) => void handleBillingPortal(e)}
      >
        Spravovat billing
      </Button>
      {isAgency && (
        <p className="max-w-[16rem] text-right text-[11px] leading-snug text-muted-foreground">
          U Agency účtu billing spravuje jeden profil (vlastník workspace).
        </p>
      )}
    </div>
  );
}
