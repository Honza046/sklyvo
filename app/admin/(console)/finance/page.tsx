import {
  getAdminBillingOverview,
  getPlatformFakturoidStatus,
} from "@/app/actions/platform-admin";
import { AdminInvoiceFeed } from "@/components/admin/admin-invoice-feed";
import { AdminPageHead } from "@/components/admin/admin-page-head";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: currency || "CZK",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

export default async function AdminFinancePage() {
  const [billing, fakturoid] = await Promise.all([
    getAdminBillingOverview(),
    getPlatformFakturoidStatus(),
  ]);

  return (
    <div className="sk-admin__page sk-admin__page--finance">
      <AdminPageHead
        title="Finance"
        meta="30 dní · Stripe"
        actions={
          <span
            className={`sk-admin__pill ${billing.stripeOk ? "sk-admin__pill--ok" : "sk-admin__pill--bad"}`}
          >
            {billing.stripeOk ? "Stripe OK" : "Stripe chyba"}
          </span>
        }
      />

      <div className="sk-admin__stat-grid sk-admin__stat-grid--billing sk-admin__stat-grid--inline">
        <div className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static">
          <p className="sk-admin__stat-label">Obrat</p>
          <p className="sk-admin__stat-value">
            {formatMoney(billing.revenueCents30d, billing.currency)}
          </p>
        </div>
        <div className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static">
          <p className="sk-admin__stat-label">Náklady</p>
          <p className="sk-admin__stat-value">
            {formatMoney(billing.costsCents30d, billing.currency)}
          </p>
        </div>
        <div className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static">
          <p className="sk-admin__stat-label">Zisk</p>
          <p className="sk-admin__stat-value">
            {formatMoney(billing.profitCents30d, billing.currency)}
          </p>
        </div>
        <div className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static">
          <p className="sk-admin__stat-label">Fakturoid</p>
          <p className="sk-admin__stat-value sk-admin__stat-value--sm">
            {fakturoid.configured ? fakturoid.slug || "OK" : "—"}
          </p>
        </div>
      </div>

      <AdminInvoiceFeed
        invoices={billing.invoices}
        stripeOk={billing.stripeOk}
        stripeError={billing.stripeError}
        paidCount={billing.paidCount}
        openCount={billing.openCount}
        failedCount={billing.failedCount}
      />
    </div>
  );
}
