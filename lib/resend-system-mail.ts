/**
 * Systémové e-maily (obnova hesla, ověřovací kód) přes Resend.
 * Pro produkci nastav RESEND_FROM_EMAIL na adresu z ověřené domény
 * (např. "Venegard <noreply@venegard.com>").
 */
export function getResendFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  return "Venegard <onboarding@resend.dev>";
}

/** Přeloží technické chyby Resendu do srozumitelné češtiny. */
export function mapResendSendError(raw: string): string {
  const message = raw.trim();
  if (!message) return "E-mail se nepodařilo odeslat.";

  if (
    /only send testing emails/i.test(message) ||
    /verify a domain/i.test(message) ||
    /resend\.com\/domains/i.test(message)
  ) {
    return (
      "Teď se nám nepodařilo e-mail odeslat (systémové odesílání ještě není plně nastavené). " +
      "Zkuste to prosím později, nebo nás kontaktujte."
    );
  }

  return message;
}
