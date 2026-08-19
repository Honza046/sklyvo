"use client";

import Link from "next/link";
import { type MouseEvent, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { getSessionUser } from "@/app/actions/auth";
import { AccountInvoiceHistory } from "@/components/account-invoice-history";
import { AccountPanel } from "@/components/account/account-panel";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

function formatPlanDisplayName(planTier: string) {
  const tier = planTier.toUpperCase();
  if (tier === "AGENCY_GROWTH") return "AGENCY PRO";
  if (tier === "AGENCY_STARTER") return "AGENCY STANDARD";
  if (tier === "AGENCY_SCALE") return "AGENCY SCALE";
  return tier.replace(/_/g, " ");
}

export function AccountBillingPanel() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState(t("account.freePlan"));
  const [hasPaidPlan, setHasPaidPlan] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getSessionUser();
        const tier = session.workspace?.planTier;
        const paid = Boolean(tier && tier !== "NONE");
        setHasPaidPlan(paid);
        setPlanName(
          !tier || tier === "NONE"
            ? t("account.freePlan")
            : formatPlanDisplayName(tier),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  async function handleBillingPortal(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const toastId = toast.loading(t("account.toast.portalRedirect"));
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Portal error");
      const { url } = (await response.json()) as { url?: string };
      if (!url) throw new Error("No URL");
      window.location.href = url;
    } catch {
      toast.error(t("account.toast.noBillingProfile"), { id: toastId });
      setTimeout(() => {
        window.location.href = "/pricing";
      }, 2000);
    }
  }

  if (loading) {
    return (
      <AccountPanel loading loadingLabel={t("account.billingLoading")} />
    );
  }

  return (
    <div className="sk-account-sub__stack">
      <AccountPanel
        title={t("account.currentPlan")}
        titleId="account-billing-plan-title"
        description={t("account.paymentMethodHint")}
        badge={
          <span className="sk-profile-plan__badge">
            {planName.toUpperCase()}
            <Sparkles className="h-3 w-3" strokeWidth={1.9} aria-hidden />
          </span>
        }
        hint={!hasPaidPlan ? t("account.billingLocked") : undefined}
        footer={
          <div className="sk-account-sub__actions">
            {hasPaidPlan ? (
              <button
                type="button"
                className="sk-btn sk-btn--white"
                onClick={(e) => void handleBillingPortal(e)}
              >
                {t("account.manageSubscription")}
              </button>
            ) : (
              <Link href="/pricing" className="sk-btn sk-btn--white">
                {t("account.choosePlan")}
              </Link>
            )}
            <button
              type="button"
              className="sk-btn sk-btn--secondary"
              onClick={(e) => void handleBillingPortal(e)}
            >
              {t("account.changeCard")}
            </button>
          </div>
        }
      />

      <AccountPanel
        title={t("account.invoiceHistory")}
        titleId="account-invoices-title"
      >
        <AccountInvoiceHistory />
      </AccountPanel>
    </div>
  );
}
