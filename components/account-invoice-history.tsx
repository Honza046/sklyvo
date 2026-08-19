"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, Receipt } from "lucide-react";
import {
  listWorkspaceInvoices,
  type WorkspaceInvoiceRow,
} from "@/app/actions/billing";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export function AccountInvoiceHistory() {
  const { t, language } = useLanguage();
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

  const formatInvoiceAmount = (amountCents: number, currency: string) => {
    try {
      return new Intl.NumberFormat(DATE_LOCALE[language] || "cs-CZ", {
        style: "currency",
        currency: currency || "CZK",
        maximumFractionDigits: 0,
      }).format(amountCents / 100);
    } catch {
      return `${(amountCents / 100).toFixed(0)} ${currency}`;
    }
  };

  const formatInvoiceDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(DATE_LOCALE[language] || "cs-CZ", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const statusLabel = (status: string | null) => {
    switch (status) {
      case "paid":
        return {
          text: t("account.invoices.paid"),
          className: "sk-account-sub__invoice-badge--paid",
        };
      case "open":
        return {
          text: t("account.invoices.open"),
          className: "sk-account-sub__invoice-badge--open",
        };
      case "uncollectible":
        return {
          text: t("account.invoices.uncollectible"),
          className: "sk-account-sub__invoice-badge--bad",
        };
      default:
        return {
          text: status || "—",
          className: "sk-account-sub__invoice-badge--neutral",
        };
    }
  };

  if (invoices === null) {
    return (
      <div className="sk-account-sub__invoice-empty">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("account.invoices.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="sk-account-sub__invoice-error">{error}</div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="sk-account-sub__invoice-empty sk-account-sub__invoice-empty--dashed">
        <Receipt className="h-5 w-5" aria-hidden />
        <p>{t("account.invoices.empty")}</p>
      </div>
    );
  }

  return (
    <ul className="sk-account-sub__invoice-list">
      {invoices.map((inv) => {
        const status = statusLabel(inv.status);
        const openUrl = inv.pdfUrl || inv.hostedUrl;
        return (
          <li key={inv.id} className="sk-account-sub__invoice-row">
            <div className="sk-account-sub__invoice-main">
              <div className="sk-account-sub__invoice-headline">
                <p className="sk-account-sub__invoice-number">
                  {inv.number || inv.id}
                </p>
                <span
                  className={cn(
                    "sk-account-sub__invoice-badge",
                    status.className,
                  )}
                >
                  {status.text}
                </span>
              </div>
              <p className="sk-account-sub__invoice-meta">
                {formatInvoiceDate(inv.createdAt)} ·{" "}
                {formatInvoiceAmount(inv.amountPaid, inv.currency)}
              </p>
            </div>
            {openUrl ? (
              <div className="sk-account-sub__invoice-actions">
                {inv.pdfUrl ? (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="sk-btn sk-btn--secondary sk-account-sub__invoice-btn"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    PDF
                  </a>
                ) : null}
                {inv.hostedUrl ? (
                  <a
                    href={inv.hostedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="sk-btn sk-btn--secondary sk-account-sub__invoice-btn"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    {t("account.invoices.detail")}
                  </a>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
