"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, Receipt } from "lucide-react";
import {
  listWorkspaceInvoices,
  type WorkspaceInvoiceRow,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatInvoiceAmount(amountCents: number, currency: string): string {
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

function formatInvoiceDate(iso: string): string {
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

function statusLabel(status: string | null): {
  text: string;
  className: string;
} {
  switch (status) {
    case "paid":
      return {
        text: "Zaplaceno",
        className: "bg-emerald-50 text-emerald-700 ",
      };
    case "open":
      return {
        text: "K úhradě",
        className: "bg-amber-50 text-amber-700 ",
      };
    case "uncollectible":
      return {
        text: "Neuhrazeno",
        className: "bg-rose-50 text-rose-700 ",
      };
    default:
      return {
        text: status || "—",
        className: "bg-muted text-muted-foreground",
      };
  }
}

export function AccountInvoiceHistory() {
  const [invoices, setInvoices] = useState<WorkspaceInvoiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listWorkspaceInvoices().then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
        setInvoices([]);
        return;
      }
      setInvoices(result.invoices);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (invoices === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Načítám faktury…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-sm text-rose-700 ">
        {error}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-background px-4 py-6 text-center">
        <Receipt className="h-5 w-5 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground">
          Zatím žádné faktury. Zobrazí se tu po první platbě přes Stripe.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-background">
      {invoices.map((inv) => {
        const status = statusLabel(inv.status);
        const openUrl = inv.pdfUrl || inv.hostedUrl;
        return (
          <li
            key={inv.id}
            className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {inv.number || inv.id}
                </p>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    status.className,
                  )}
                >
                  {status.text}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatInvoiceDate(inv.createdAt)} ·{" "}
                {formatInvoiceAmount(inv.amountPaid, inv.currency)}
              </p>
            </div>
            {openUrl ? (
              <div className="flex shrink-0 gap-1.5">
                {inv.pdfUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                  >
                    <a href={inv.pdfUrl} target="_blank" rel="noreferrer">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      PDF
                    </a>
                  </Button>
                ) : null}
                {inv.hostedUrl ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                  >
                    <a href={inv.hostedUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Detail
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
