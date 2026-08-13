"use client";

import { Clock3, Mail, RotateCcw } from "lucide-react";
import type { SniperRecentItem } from "@/lib/sniper-recent";
import { cn } from "@/lib/utils";

type SniperRecentPanelProps = {
  items: SniperRecentItem[];
  onOpen: (item: SniperRecentItem) => void;
  title: string;
  emptyHint: string;
  draftLabel: string;
  sentLabel: string;
  openLabel: string;
  dateLocale: string;
};

function formatRecentDate(ts: number, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

export function SniperRecentPanel({
  items,
  onOpen,
  title,
  emptyHint,
  draftLabel,
  sentLabel,
  openLabel,
  dateLocale,
}: SniperRecentPanelProps) {
  return (
    <section className="sk-sniper-recent" aria-label={title}>
      <div className="sk-sniper-recent__head">
        <h2 className="sk-sniper-recent__title">{title}</h2>
        {items.length > 0 ? (
          <span className="sk-sniper-recent__count">{items.length}</span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="sk-sniper-recent__empty">{emptyHint}</p>
      ) : (
        <ul className="sk-sniper-recent__list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="sk-sniper-recent__row"
                onClick={() => onOpen(item)}
                aria-label={`${openLabel}: ${item.companyLabel}`}
              >
                <div className="sk-sniper-recent__main">
                  <p className="sk-sniper-recent__company">{item.companyLabel}</p>
                  <p className="sk-sniper-recent__url">{item.targetUrl}</p>
                  <p className="sk-sniper-recent__email">
                    <Mail className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {item.contactEmail || "—"}
                    </span>
                  </p>
                </div>
                <div className="sk-sniper-recent__meta">
                  <span
                    className={cn(
                      "sk-sniper-recent__status",
                      item.status === "sent" && "is-sent",
                    )}
                  >
                    {item.status === "sent" ? sentLabel : draftLabel}
                  </span>
                  <span className="sk-sniper-recent__date">
                    <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
                    {formatRecentDate(item.updatedAt, dateLocale)}
                  </span>
                  <span className="sk-sniper-recent__action">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    {openLabel}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
