"use client";

import Link from "next/link";
import { type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";

export function SubscriptionBillingButton({
  showChoosePlan,
}: {
  showChoosePlan: boolean;
}) {
  const { t } = useLanguage();

  const handleBillingPortal = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const toastId = toast.loading(t("settings.portalRedirect"));
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Stripe portal session failed");
      }
      const { url } = (await response.json()) as { url?: string };
      if (!url) {
        throw new Error("Missing portal URL");
      }
      window.location.href = url;
    } catch {
      toast.error(t("settings.noBillingProfile"), { id: toastId });
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 2000);
    }
  };

  if (showChoosePlan) {
    return (
      <Button
        asChild
        className="h-10 w-full rounded-xl bg-[color:var(--sk-brand)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[color:var(--sk-brand)]/90 sm:w-auto"
      >
        <Link href="/settings/billing">{t("settings.choosePlan")}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      className="h-10 w-full rounded-xl bg-[color:var(--sk-brand)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[color:var(--sk-brand)]/90 sm:w-auto"
      onClick={(e) => void handleBillingPortal(e)}
    >
      {t("settings.manageBilling")}
    </Button>
  );
}
