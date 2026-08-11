import {
  getAdminBillingOverview,
  getPlatformFakturoidStatus,
} from "@/app/actions/platform-admin";
import { AdminInvoiceFeed } from "@/components/admin/admin-invoice-feed";

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

  const financeCards = [
    {
      label: "Obrat",
      value: formatMoney(billing.revenueCents30d, billing.currency),
      hint:
        billing.paidCount > 0
          ? `${billing.paidCount} zaplacených faktur · 30 dní`
          : "Stripe platby za posledních 30 dní",
    },
    {
      label: "Náklady",
      value: formatMoney(billing.costsCents30d, billing.currency),
      hint:
        billing.fixedCostsCents > 0
          ? `Fixní ${formatMoney(billing.fixedCostsCents, billing.currency)} + Stripe poplatky ${formatMoney(billing.stripeFeesCents, billing.currency)}`
          : billing.stripeFeesCents > 0
            ? `Stripe poplatky (odhad) · nastav PLATFORM_MONTHLY_COSTS_CZK`
            : "Nastav PLATFORM_MONTHLY_COSTS_CZK v .env",
    },
    {
      label: "Čistý zisk",
      value: formatMoney(billing.profitCents30d, billing.currency),
      hint: "Obrat − náklady",
    },
  ];

  return (
    <div className="sk-admin__page">
      <header className="sk-admin__page-head">
        <p className="sk-admin__eyebrow">Platforma</p>
        <h1 className="sk-admin__h1">Finance</h1>
        <p className="sk-admin__lede">
          Obrat, náklady, zisk · Stripe faktury · platform Fakturoid
        </p>
      </header>

      <section className="sk-admin__panel" aria-label="Finance">
        <div className="sk-admin__panel-head">
          <div>
            <h2 className="sk-admin__h2">Souhrn · 30 dní</h2>
            <p className="sk-admin__panel-sub">
              {billing.stripeOk
                ? "Obrat ze Stripe, náklady a čistý zisk"
                : "Stripe nedostupné — zkontroluj STRIPE_SECRET_KEY"}
            </p>
          </div>
          <span
            className={`sk-admin__pill ${billing.stripeOk ? "sk-admin__pill--ok" : "sk-admin__pill--bad"}`}
          >
            {billing.stripeOk ? "Stripe OK" : "Stripe chyba"}
          </span>
        </div>
        <div className="sk-admin__stat-grid sk-admin__stat-grid--billing">
          {financeCards.map((card) => (
            <div
              key={card.label}
              className="sk-admin__stat sk-admin__stat--compact sk-admin__stat--static"
            >
              <p className="sk-admin__stat-label">{card.label}</p>
              <p className="sk-admin__stat-value">{card.value}</p>
              <p className="sk-admin__stat-hint">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="sk-admin__panel"
        aria-label="Platform Fakturoid"
      >
        <div className="sk-admin__panel-head">
          <div>
            <h2 className="sk-admin__h2">Platform Fakturoid</h2>
            <p className="sk-admin__panel-sub">
              Sklyvo branding · oddělené od workspace Integrací
            </p>
          </div>
          <span
            className={`sk-admin__pill ${fakturoid.configured ? "sk-admin__pill--ok" : "sk-admin__pill--trial"}`}
          >
            {fakturoid.label}
          </span>
        </div>
        <p className="sk-admin__fakturoid-detail">{fakturoid.detail}</p>
        <ul className="sk-admin__fakturoid-rules">
          <li>Platba vždy přes Stripe (karta, retry, předplatné).</li>
          <li>
            Po zaplacení webhook vystaví / pošle české PDF ve Fakturoidu.
          </li>
          <li>
            Workspace Fakturoid v Integracích = účet zákazníka, ne pokladna
            Sklyvo.
          </li>
        </ul>
        {fakturoid.slug ? (
          <a
            href={`https://app.fakturoid.cz/${fakturoid.slug}`}
            target="_blank"
            rel="noreferrer"
            className="sk-admin__text-link"
          >
            Otevřít účet {fakturoid.slug} ve Fakturoidu
          </a>
        ) : null}
      </section>

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
