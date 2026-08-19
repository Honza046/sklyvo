"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, X } from "lucide-react";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
import { startTrialCheckout } from "@/app/actions/billing";
import { useCopilot } from "@/context/CopilotContext";
import { useLanguage } from "@/context/LanguageContext";
import { messages } from "@/lib/i18n/messages";
import type { Language } from "@/lib/i18n/types";
import {
  AGENCY_SIZE_CATALOG,
  formatCzk,
  SINGLE_PLAN_CATALOG,
  type AccountTab,
  type AgencySize,
  type BillingCycle,
  type SinglePlanKey,
} from "@/lib/pricing/plan-catalog";
import { cn } from "@/lib/utils";
import { LegalDocumentLinks } from "@/components/legal/legal-document-links";

function PricingPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn("sk-pricing-pill", active && "sk-pricing-pill--active")}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PlanFeature({
  text,
  highlighted,
}: {
  text: string;
  highlighted?: boolean;
}) {
  const off = text.startsWith("-");
  const label = off ? text.slice(1) : text;

  return (
    <div
      className={cn(
        "sk-pricing-feature",
        off && "sk-pricing-feature--off",
        highlighted && "sk-pricing-feature--hi",
      )}
    >
      <span className="sk-pricing-feature__icon" aria-hidden>
        {off ? (
          <X className="h-3.5 w-3.5" strokeWidth={2.6} />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
        )}
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function PricingPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { openWithPrompt } = useCopilot();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [accountTab, setAccountTab] = useState<AccountTab>("single");
  const [agencySize, setAgencySize] = useState<AgencySize>("small");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const yearly = billingCycle === "yearly";
  const agency = AGENCY_SIZE_CATALOG[agencySize];

  const handleActivate = async (planTier: string, priceId: string) => {
    setLoadingTier(planTier);
    const result = await startTrialCheckout(planTier, priceId);
    setLoadingTier(null);

    if ("error" in result && result.error) {
      alert(result.error);
      return;
    }

    if ("url" in result && result.url) {
      window.location.href = result.url;
    }
  };

  const handleAskBot = () => {
    openWithPrompt(t("pricing.botAskPrompt"));
    router.push("/help");
  };

  const renderPrice = (monthly: number, yearlyMonthly: number) => (
    <div className="sk-pricing-plan__price">
      {yearly ? (
        <span className="sk-pricing-plan__price-old">{formatCzk(monthly)}</span>
      ) : null}
      <span className="sk-pricing-plan__price-main">
        {formatCzk(yearly ? yearlyMonthly : monthly)}
      </span>
      <span className="sk-pricing-plan__price-unit">
        {accountTab === "team" ? t("pricing.perSeat") : t("pricing.perMonth")}
      </span>
    </div>
  );

  return (
    <div className="sk-pricing-page">
      <div className="sk-page-head shrink-0">
        <h1 className="sk-page-head__title">{t("pricing.title")}</h1>
        <p className="sk-page-head__sub">{t("pricing.subtitle")}</p>
      </div>

      <div className="sk-pricing-wrap">
        <div className="sk-pricing-switch">
          <div className="sk-pricing-billing">
            <div className="sk-pricing-tabs">
              <PricingPill active={!yearly} onClick={() => setBillingCycle("monthly")}>
                {t("pricing.monthly")}
              </PricingPill>
              <div className="sk-pricing-yearly-slot">
                <span className="sk-pricing-saveflag">{t("pricing.saveHint")}</span>
                <PricingPill active={yearly} onClick={() => setBillingCycle("yearly")}>
                  {t("pricing.yearly")}
                </PricingPill>
              </div>
            </div>
          </div>

          <div className="sk-pricing-tabs">
            <PricingPill
              active={accountTab === "single"}
              onClick={() => setAccountTab("single")}
            >
              {t("pricing.tabSingle")}
            </PricingPill>
            <PricingPill
              active={accountTab === "team"}
              onClick={() => setAccountTab("team")}
            >
              {t("pricing.tabTeam")}
            </PricingPill>
          </div>
        </div>

        {accountTab === "single" ? (
          <div className="sk-pricing-plans sk-pricing-plans--three">
            {SINGLE_PLAN_CATALOG.map((plan) => {
              const planCopy = getSinglePlanCopy(language, plan.key);
              const priceId = yearly
                ? plan.stripePriceIdYearly
                : plan.stripePriceIdMonthly;

              return (
                <div
                  key={plan.key}
                  className={cn(
                    "sk-pricing-plan",
                    plan.highlighted && "sk-pricing-plan--highlight",
                  )}
                >
                  <div className="sk-pricing-plan__head">
                    <span className="sk-pricing-plan__name">{planCopy.name}</span>
                    {planCopy.badge ? (
                      <span className="sk-pricing-plan__badge">{planCopy.badge}</span>
                    ) : null}
                  </div>

                  {renderPrice(plan.priceMonthlyCzk, plan.priceYearlyMonthlyCzk)}

                  <p className="sk-pricing-plan__tagline">{planCopy.tagline}</p>

                  <div className="sk-pricing-plan__features">
                    {planCopy.features.map((feature) => (
                      <PlanFeature
                        key={feature}
                        text={feature}
                        highlighted={plan.highlighted}
                      />
                    ))}
                  </div>

                  <span className="sk-pricing-plan__spacer" aria-hidden />

                  <button
                    type="button"
                    className={cn(
                      "sk-pricing-plan__cta",
                      plan.highlighted
                        ? "sk-pricing-plan__cta--white"
                        : "sk-pricing-plan__cta--raised",
                    )}
                    disabled={loadingTier === plan.tier}
                    onClick={() => void handleActivate(plan.tier, priceId)}
                  >
                    {loadingTier === plan.tier
                      ? t("pricing.activating")
                      : t("pricing.choosePlan")}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="sk-pricing-plans sk-pricing-plans--two">
              <div className="sk-pricing-plan">
                <div className="sk-pricing-plan__head">
                  <span className="sk-pricing-plan__name-row">
                    <span
                      className={cn(
                        "sk-pricing-plan__name",
                        agencySize === "big" && "sk-pricing-plan__name--brand",
                      )}
                    >
                      {agencySize === "big"
                        ? t("pricing.agency.proName")
                        : t("pricing.agency.standardName")}
                    </span>
                    {agencySize === "big" ? (
                      <Sparkles
                        className="h-3.5 w-3.5 text-[color:var(--sk-brand)]"
                        strokeWidth={1.9}
                        aria-hidden
                      />
                    ) : null}
                  </span>

                  <div className="sk-pricing-sizepick">
                    {(["small", "big"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={cn(
                          "sk-pricing-sizepick__btn",
                          agencySize === size && "sk-pricing-sizepick__btn--active",
                        )}
                        aria-pressed={agencySize === size}
                        onClick={() => setAgencySize(size)}
                      >
                        {size === "small"
                          ? t("pricing.sizeSmall")
                          : t("pricing.sizeBig")}
                      </button>
                    ))}
                  </div>
                </div>

                {renderPrice(agency.priceMonthlyCzk, agency.priceYearlyMonthlyCzk)}

                <p className="sk-pricing-plan__tagline">
                  {agencySize === "big"
                    ? t("pricing.agency.seatsBig")
                    : t("pricing.agency.seatsSmall")}
                </p>

                <div className="sk-pricing-plan__features">
                  {getAgencyFeatures(language).map((feature) => (
                    <PlanFeature key={feature} text={feature} />
                  ))}
                </div>

                <span className="sk-pricing-plan__spacer" aria-hidden />

                <button
                  type="button"
                  className="sk-pricing-plan__cta sk-pricing-plan__cta--white"
                  disabled={loadingTier === agency.tier}
                  onClick={() =>
                    void handleActivate(
                      agency.tier,
                      yearly ? agency.stripePriceIdYearly : agency.stripePriceIdMonthly,
                    )
                  }
                >
                  {loadingTier === agency.tier
                    ? t("pricing.activating")
                    : t("pricing.choosePlan")}
                </button>
              </div>

              <div className="sk-pricing-plan sk-pricing-plan--custom">
                <div className="sk-pricing-plan__head">
                  <span className="sk-pricing-plan__name">
                    {t("pricing.custom.name")}
                  </span>
                  <span className="sk-pricing-plan__badge sk-pricing-plan__badge--muted">
                    {t("pricing.custom.badge")}
                  </span>
                </div>

                <div className="sk-pricing-plan__custom-price">
                  {t("pricing.custom.price")}
                </div>

                <p className="sk-pricing-plan__tagline">
                  {t("pricing.custom.tagline")}
                </p>

                <div className="sk-pricing-plan__features">
                  {getCustomFeatures(language).map((feature) => (
                    <PlanFeature key={feature} text={feature} />
                  ))}
                </div>

                <span className="sk-pricing-plan__spacer" aria-hidden />

                <button
                  type="button"
                  className="sk-pricing-plan__cta sk-pricing-plan__cta--raised"
                  onClick={() => {
                    window.location.href =
                      "mailto:podpora@venegard.com?subject=Custom%20tarif%20Sklyvo";
                  }}
                >
                  {t("pricing.contactUs")}
                </button>
              </div>
            </div>

            <div className="sk-pricing-askbot-wrap">
              <button type="button" className="sk-pricing-askbot" onClick={handleAskBot}>
                <span className="sk-pricing-askbot__icon" aria-hidden>
                  <SklyvoMark size={24} tone="grey" interactive={false} />
                </span>
                <span className="sk-pricing-askbot__text">
                  {t("pricing.botAskQ")}{" "}
                  <strong>{t("pricing.botAskA")}</strong>
                </span>
              </button>
            </div>
          </>
        )}

        <p className="sk-pricing-note">{t("pricing.note")}</p>
      </div>

      <LegalDocumentLinks className="sk-help-legal" />
    </div>
  );
}

type SinglePlanCopy = {
  name: string;
  badge?: string;
  tagline: string;
  features: string[];
};

function getSinglePlanCopy(
  language: Language,
  key: SinglePlanKey,
): SinglePlanCopy {
  return messages[language].pricing.singlePlans[key];
}

function getAgencyFeatures(language: Language): string[] {
  return messages[language].pricing.agency.features;
}

function getCustomFeatures(language: Language): string[] {
  return messages[language].pricing.custom.features;
}
