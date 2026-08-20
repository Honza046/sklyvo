type EmailErrorLocale = "cz" | "en" | "de" | "es";

type EmailErrorCopy = {
  auth: string;
  connect: string;
  tls: string;
  recipient: string;
  relay: string;
  rateLimit: string;
  spam: string;
  tooLarge: string;
  generic: string;
  empty: string;
};

const COPY: Record<EmailErrorLocale, EmailErrorCopy> = {
  cz: {
    auth: "Přihlašovací údaje k e-mailu nejsou správné. V Nastavení → Firemní e-mail zkontrolujte heslo nebo účet znovu propojte.",
    connect:
      "Nepodařilo se spojit s e-mailovým serverem. Zkontrolujte SMTP adresu, port a internetové připojení.",
    tls: "E-mailový server odmítl zabezpečené spojení. Zkontrolujte SMTP nastavení u poskytovatele e-mailu.",
    recipient: "E-mailová adresa příjemce neexistuje nebo není dostupná.",
    relay:
      "Váš e-mailový server odmítl odeslání z této aplikace. Zkontrolujte SMTP nastavení nebo kontaktujte správce e-mailu.",
    rateLimit:
      "E-mailový server dočasně limituje odesílání. Počkejte chvíli a zkuste to znovu.",
    spam: "E-mailový server zprávu odmítl. Zkuste upravit text e-mailu nebo kontaktujte správce e-mailu.",
    tooLarge:
      "E-mail je příliš velký pro odeslání. Zkuste zkrátit text nebo odebrat přílohy.",
    generic:
      "Odeslání se nezdařilo. Zkontrolujte propojení firemního e-mailu v Nastavení a zkuste to znovu.",
    empty:
      "Odeslání se nezdařilo. Zkuste e-mail znovu vygenerovat nebo upravit.",
  },
  en: {
    auth: "Email login details are incorrect. In Settings → Company email, check the password or reconnect the account.",
    connect:
      "Could not connect to the email server. Check the SMTP host, port, and your internet connection.",
    tls: "The email server rejected the secure connection. Check SMTP settings with your email provider.",
    recipient: "The recipient email address does not exist or is unavailable.",
    relay:
      "Your email server rejected sending from this app. Check SMTP settings or contact your email admin.",
    rateLimit:
      "The email server is temporarily limiting sends. Wait a moment and try again.",
    spam: "The email server rejected the message. Try editing the email text or contact your email admin.",
    tooLarge:
      "The email is too large to send. Try shortening the text or removing attachments.",
    generic:
      "Sending failed. Check your company email connection in Settings and try again.",
    empty: "Sending failed. Try regenerating or editing the email.",
  },
  de: {
    auth: "Die E-Mail-Zugangsdaten sind falsch. Prüfen Sie unter Einstellungen → Firmen-E-Mail das Passwort oder verbinden Sie das Konto erneut.",
    connect:
      "Verbindung zum E-Mail-Server fehlgeschlagen. Prüfen Sie SMTP-Host, Port und Internetverbindung.",
    tls: "Der E-Mail-Server hat die sichere Verbindung abgelehnt. Prüfen Sie die SMTP-Einstellungen bei Ihrem Anbieter.",
    recipient: "Die Empfängeradresse existiert nicht oder ist nicht erreichbar.",
    relay:
      "Ihr E-Mail-Server hat das Senden aus dieser App abgelehnt. Prüfen Sie SMTP oder kontaktieren Sie den Admin.",
    rateLimit:
      "Der E-Mail-Server begrenzt vorübergehend das Senden. Warten Sie kurz und versuchen Sie es erneut.",
    spam: "Der E-Mail-Server hat die Nachricht abgelehnt. Passen Sie den Text an oder kontaktieren Sie den Admin.",
    tooLarge:
      "Die E-Mail ist zu groß. Kürzen Sie den Text oder entfernen Sie Anhänge.",
    generic:
      "Senden fehlgeschlagen. Prüfen Sie die Firmen-E-Mail in den Einstellungen und versuchen Sie es erneut.",
    empty:
      "Senden fehlgeschlagen. Generieren oder bearbeiten Sie die E-Mail erneut.",
  },
  es: {
    auth: "Los datos de acceso al e-mail no son correctos. En Ajustes → E-mail de empresa, revisa la contraseña o vuelve a conectar la cuenta.",
    connect:
      "No se pudo conectar con el servidor de e-mail. Revisa el host SMTP, el puerto y la conexión a internet.",
    tls: "El servidor de e-mail rechazó la conexión segura. Revisa la configuración SMTP con tu proveedor.",
    recipient: "La dirección del destinatario no existe o no está disponible.",
    relay:
      "Tu servidor de e-mail rechazó el envío desde esta app. Revisa SMTP o contacta al administrador.",
    rateLimit:
      "El servidor limita temporalmente los envíos. Espera un momento e inténtalo de nuevo.",
    spam: "El servidor rechazó el mensaje. Prueba a editar el texto o contacta al administrador.",
    tooLarge:
      "El e-mail es demasiado grande. Acorta el texto o quita adjuntos.",
    generic:
      "El envío falló. Revisa la conexión del e-mail de empresa en Ajustes e inténtalo de nuevo.",
    empty: "El envío falló. Intenta regenerar o editar el e-mail.",
  },
};

const EMAIL_ERROR_RULES: Array<{
  test: RegExp;
  key: keyof Omit<EmailErrorCopy, "generic" | "empty">;
}> = [
  {
    test: /535|534|invalid login|incorrect credentials|authentication failed|auth credentials|eauth|username and password not accepted|login failed/i,
    key: "auth",
  },
  {
    test: /econnrefused|etimedout|enotfound|econnreset|connect timeout|connection timeout|getaddrinfo|unable to connect|socket hang up|network error/i,
    key: "connect",
  },
  {
    test: /certificate|self signed|tls|ssl|unable to verify|cert/i,
    key: "tls",
  },
  {
    test: /550[\s.-]?5\.1\.[13]|user unknown|mailbox not found|no such user|recipient rejected|address rejected|does not exist|unknown recipient/i,
    key: "recipient",
  },
  {
    test: /550[\s.-]?5\.7\.1|relay|not permitted|sender rejected|unauthorized sender|access denied/i,
    key: "relay",
  },
  {
    test: /421|452|rate limit|too many|quota exceeded|daily limit|throttl|try again later/i,
    key: "rateLimit",
  },
  {
    test: /554|spam|blacklist|blocked|policy rejection|message rejected/i,
    key: "spam",
  },
  {
    test: /message too large|size limit|552/i,
    key: "tooLarge",
  },
];

function looksTechnical(raw: string): boolean {
  return (
    /\b\d{3}[\s.-]\d\.\d\.\d+\b/.test(raw) ||
    /\b(invalid|incorrect|authentication|credentials|econn|etimedout|enotfound|timeout|certificate|tls|ssl|relay|denied|rejected|failed|error)\b/i.test(
      raw,
    )
  );
}

function resolveLocale(language?: string): EmailErrorLocale {
  if (language === "en" || language === "de" || language === "es") {
    return language;
  }
  return "cz";
}

/** Převede technickou chybu SMTP/API na srozumitelnou zprávu pro uživatele. */
export function humanizeEmailError(
  raw: string | null | undefined,
  language: string = "cz",
): string {
  const copy = COPY[resolveLocale(language)];
  const trimmed = raw?.trim();
  if (!trimmed) {
    return copy.empty;
  }

  for (const rule of EMAIL_ERROR_RULES) {
    if (rule.test.test(trimmed)) {
      return copy[rule.key];
    }
  }

  if (looksTechnical(trimmed)) {
    return copy.generic;
  }

  return trimmed;
}
