"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Receipt } from "lucide-react";
import type {
  AdminInvoiceFilterBucket,
  AdminStripeInvoiceRow,
} from "@/app/actions/platform-admin";
import { cn } from "@/lib/utils";

function formatAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: currency || "CZK",
      maximumFractionDigits: 0,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(0)} ${currency}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusPill(bucket: AdminStripeInvoiceRow["bucket"], status: string | null) {
  if (bucket === "paid") {
    return { text: "Zaplaceno", tone: "ok" as const };
  }
  if (bucket === "open") {
    return { text: status === "open" ? "Otevřené" : status || "Otevřené", tone: "trial" as const };
  }
  return {
    text: status === "uncollectible" ? "Selhané" : status || "Selhané",
    tone: "bad" as const,
  };
}

const FILTERS: { id: AdminInvoiceFilterBucket; label: string }[] = [
  { id: "all", label: "Vše" },
  { id: "paid", label: "Zaplaceno" },
  { id: "open", label: "Otevřené" },
  { id: "failed", label: "Selhané" },
];

type Props = {
  invoices: AdminStripeInvoiceRow[];
  stripeOk: boolean;
  stripeError: string | null;
  paidCount: number;
  openCount: number;
  failedCount: number;
};

export function AdminInvoiceFeed({
  invoices,
  stripeOk,
  stripeError,
  paidCount,
  openCount,
  failedCount,
}: Props) {
  const [filter, setFilter] = useState<AdminInvoiceFilterBucket>("all");

  const counts = useMemo(
    () => ({
      all: invoices.length,
      paid: paidCount,
      open: openCount,
      failed: failedCount,
    }),
    [failedCount, invoices.length, openCount, paidCount],
  );

  const rows = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter((inv) => inv.bucket === filter);
  }, [filter, invoices]);

  return (
    <section
      className="sk-admin__panel sk-admin__panel--invoices sk-admin__panel--fill"
      aria-label="Stripe faktury"
    >
      <div className="sk-admin__panel-head">
        <h2 className="sk-admin__h2">Faktury</h2>
        <span className="sk-admin__meta-inline">{invoices.length} · Stripe</span>
      </div>

      {!stripeOk ? (
        <p className="sk-admin__feed-error" role="alert">
          {stripeError || "Stripe faktury se nepodařilo načíst."}
        </p>
      ) : null}

      <div className="sk-admin__feed-filters" role="tablist" aria-label="Filtr faktur">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={cn(
              "sk-admin__feed-filter",
              filter === f.id && "is-active",
            )}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="sk-admin__feed-filter-count">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="sk-admin__feed-empty">
          <Receipt className="h-5 w-5" aria-hidden />
          <p>
            {stripeOk
              ? filter === "all"
                ? "Zatím žádné Stripe faktury."
                : "V tomto filtru nic není."
              : "Bez Stripe dat."}
          </p>
        </div>
      ) : (
        <div className="sk-admin__table-wrap sk-admin__table-wrap--rows sk-admin__table-wrap--scroll-inset">
          <table className="sk-admin__table sk-admin__table--rows sk-admin__table--dense">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Částka</th>
                <th>Stav</th>
                <th>Datum</th>
                <th>Doklad</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const pill = statusPill(inv.bucket, inv.status);
                return (
                  <tr key={inv.id}>
                    <td>
                      {inv.workspaceId ? (
                        <Link
                          href={`/admin/workspaces/${inv.workspaceId}`}
                          className="sk-admin__link"
                        >
                          {inv.workspaceName || "Workspace"}
                        </Link>
                      ) : (
                        <span className="sk-admin__muted">
                          {inv.stripeCustomerId
                            ? `cus…${inv.stripeCustomerId.slice(-6)}`
                            : "Neznámý"}
                        </span>
                      )}
                      {inv.planTier ? (
                        <span className="sk-admin__muted block text-xs">
                          {inv.planTier}
                        </span>
                      ) : null}
                    </td>
                    <td className="tabular-nums font-semibold whitespace-nowrap">
                      {formatAmount(inv.amountCents, inv.currency)}
                    </td>
                    <td>
                      <span
                        className={`sk-admin__pill sk-admin__pill--${pill.tone}`}
                      >
                        {pill.text}
                      </span>
                    </td>
                    <td className="sk-admin__muted text-xs tabular-nums whitespace-nowrap">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="text-xs">
                      <span className="font-medium">
                        {inv.number || inv.id.slice(0, 12)}
                      </span>
                    </td>
                    <td className="sk-admin__feed-actions">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="sk-admin__icon-link"
                          aria-label="PDF faktury"
                          title="PDF"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : null}
                      <a
                        href={inv.dashboardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="sk-admin__icon-link"
                        aria-label="Otevřít ve Stripe"
                        title="Stripe"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
