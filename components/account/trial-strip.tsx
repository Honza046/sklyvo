"use client";

import { Clock } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export type TrialStripProps = {
  remainingDays: number;
  creditsUsed: number;
  creditsTotal: number;
  className?: string;
};

export function TrialStrip({
  remainingDays,
  creditsUsed,
  creditsTotal,
  className,
}: TrialStripProps) {
  const { t, dayWord } = useLanguage();
  const days = Math.max(0, remainingDays);

  return (
    <div className={cn("sk-trial-strip", className)}>
      <span className="sk-trial-strip__icon" aria-hidden>
        <Clock className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <div className="sk-trial-strip__cols">
        <div className="sk-trial-strip__col">
          <span className="sk-trial-strip__label">
            {t("account.trialStripLabel")}
          </span>
          <span className="sk-trial-strip__value">
            {t("account.trialStripDays", {
              days,
              dayWord: dayWord(days),
            })}
          </span>
        </div>
        <div className="sk-trial-strip__col">
          <span className="sk-trial-strip__label">
            {t("account.trialStripCredits")}
          </span>
          <span className="sk-trial-strip__value sk-trial-strip__value--accent">
            {creditsUsed} / {creditsTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
