const EMAIL_ERROR_RULES: Array<{ test: RegExp; message: string }> = [
  {
    test: /535|534|invalid login|incorrect credentials|authentication failed|auth credentials|eauth|username and password not accepted|login failed/i,
    message:
      "Přihlašovací údaje k e-mailu nejsou správné. V Nastavení → Firemní e-mail zkontrolujte heslo nebo účet znovu propojte.",
  },
  {
    test: /econnrefused|etimedout|enotfound|econnreset|connect timeout|connection timeout|getaddrinfo|unable to connect|socket hang up|network error/i,
    message:
      "Nepodařilo se spojit s e-mailovým serverem. Zkontrolujte SMTP adresu, port a internetové připojení.",
  },
  {
    test: /certificate|self signed|tls|ssl|unable to verify|cert/i,
    message:
      "E-mailový server odmítl zabezpečené spojení. Zkontrolujte SMTP nastavení u poskytovatele e-mailu.",
  },
  {
    test: /550[\s.-]?5\.1\.[13]|user unknown|mailbox not found|no such user|recipient rejected|address rejected|does not exist|unknown recipient/i,
    message: "E-mailová adresa příjemce neexistuje nebo není dostupná.",
  },
  {
    test: /550[\s.-]?5\.7\.1|relay|not permitted|sender rejected|unauthorized sender|access denied/i,
    message:
      "Váš e-mailový server odmítl odeslání z této aplikace. Zkontrolujte SMTP nastavení nebo kontaktujte správce e-mailu.",
  },
  {
    test: /421|452|rate limit|too many|quota exceeded|daily limit|throttl|try again later/i,
    message:
      "E-mailový server dočasně limituje odesílání. Počkejte chvíli a zkuste to znovu.",
  },
  {
    test: /554|spam|blacklist|blocked|policy rejection|message rejected/i,
    message:
      "E-mailový server zprávu odmítl. Zkuste upravit text e-mailu nebo kontaktujte správce e-mailu.",
  },
  {
    test: /message too large|size limit|552/i,
    message: "E-mail je příliš velký pro odeslání. Zkuste zkrátit text nebo odebrat přílohy.",
  },
];

const GENERIC_EMAIL_ERROR =
  "Odeslání se nezdařilo. Zkontrolujte propojení firemního e-mailu v Nastavení a zkuste to znovu.";

function looksTechnical(raw: string): boolean {
  return (
    /\b\d{3}[\s.-]\d\.\d\.\d+\b/.test(raw) ||
    /\b(invalid|incorrect|authentication|credentials|econn|etimedout|enotfound|timeout|certificate|tls|ssl|relay|denied|rejected|failed|error)\b/i.test(
      raw,
    )
  );
}

/** Převede technickou chybu SMTP/API na srozumitelnou zprávu pro uživatele. */
export function humanizeEmailError(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return "Odeslání se nezdařilo. Zkuste e-mail znovu vygenerovat nebo upravit.";
  }

  for (const rule of EMAIL_ERROR_RULES) {
    if (rule.test.test(trimmed)) {
      return rule.message;
    }
  }

  if (looksTechnical(trimmed)) {
    return GENERIC_EMAIL_ERROR;
  }

  return trimmed;
}
