"use client";

import type { SniperRecentItem } from "@/lib/sniper-recent";
import { cn } from "@/lib/utils";

type SniperRecentPanelProps = {
  items: SniperRecentItem[];
  onOpen: (item: SniperRecentItem) => void;
  title: string;
  countLabel: string;
  emptyHint: string;
  draftLabel: string;
  sentLabel: string;
  t: (key: string, params?: Record<string, string | number>) => string;
};

function formatRecentWhen(
  ts: number,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (minutes < 1) return t("dashboard.timeNow");
  if (hours < 1) return t("dashboard.timeMinutesAgo", { minutes });
  if (days < 1) return t("dashboard.timeHoursAgo", { hours });
  if (days === 1) return t("dashboard.timeYesterday");
  const d = new Date(ts);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function SniperRecentPanel({
  items,
  onOpen,
  title,
  countLabel,
  emptyHint,
  draftLabel,
  sentLabel,
  t,
}: SniperRecentPanelProps) {
  return (
    <section className="sk-sniper-recent" aria-label={title}>
      <div className="sk-sniper-recent__head">
        <h2 className="sk-sniper-recent__title">{title}</h2>
        <span className="sk-sniper-recent__count">{countLabel}</span>
      </div>

      <div className="sk-sniper-recent__list">
        {items.length === 0 ? (
          <p className="sk-sniper-recent__empty">{emptyHint}</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="sk-history__row"
              onClick={() => onOpen(item)}
            >
              <span className="sk-history__lead">
                <span className="sk-history__text">{item.companyLabel}</span>
                {item.selectedSubject ? (
                  <span className="sk-history__subtitle">
                    {item.selectedSubject}
                  </span>
                ) : null}
              </span>
              <span className="sk-history__meta">
                <span
                  className={cn(
                    "sk-history__badge",
                    item.status === "sent"
                      ? "sk-history__badge--sent"
                      : "sk-history__badge--draft",
                  )}
                >
                  {item.status === "sent" ? sentLabel : draftLabel}
                </span>
                <span className="sk-history__when">
                  {formatRecentWhen(item.updatedAt, t)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
