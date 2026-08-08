export const EMAIL_SETUP_SETTINGS_HASH = "email-integration";
export const EMAIL_SETUP_SETTINGS_PATH = `/settings#${EMAIL_SETUP_SETTINGS_HASH}`;

const EMAIL_KEYWORDS = [
  "email",
  "e-mail",
  "e-mailu",
  "mail",
  "autopilot",
  "propoj",
  "propojen",
  "gmail",
  "google",
  "outlook",
  "smtp",
  "schrán",
  "mailbox",
  "odesíl",
  "odeslat",
  "workspace",
  "pracovní prostor",
  "nastaven",
];

const AUTOPILOT_SETUP_PROMPT = "⚙️ Jak zprovoznit Autopilota s mým e-mailem?";

export function isEmailSetupQuestion(input: string): boolean {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes(AUTOPILOT_SETUP_PROMPT.toLowerCase().replace("⚙️ ", ""))) {
    return true;
  }
  return EMAIL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export type CopilotGuideStep = {
  title: string;
  body: string;
};

export type CopilotGuideResponse = {
  intro: string;
  steps: CopilotGuideStep[];
  footer: string;
  settingsPath: string;
};

export function buildEmailSetupGuide(language: "cz" | "en" | "es" | "de"): CopilotGuideResponse {
  if (language === "en") {
    return {
      intro:
        "To run Autopilot outreach from your company inbox, connect Google Workspace or Outlook/SMTP in Workspace settings first.",
      steps: [
        {
          title: "Step 1 — Open Workspace settings",
          body: 'In the sidebar click "Workspace" (or Settings). Scroll to the section "Company email connection".',
        },
        {
          title: "Step 2 — Choose your provider",
          body:
            "Google: click \"Connect via Google OAuth\" (recommended). Outlook/custom domain: fill sender name, company email, SMTP host, port, and an App Password — not your regular login password.",
        },
        {
          title: "Step 3 — Google App Password (if not using OAuth)",
          body:
            "In Google Account → Security enable 2-Step Verification, then create an App Password under \"App passwords\" and paste it into Sklyvo.",
        },
        {
          title: "Step 4 — Verify the status card",
          body:
            'When connected, the status changes to "Connected — Autopilot can send". Then return to Autopilot and launch your campaign.',
        },
      ],
      footer: "Open the connection panel now:",
      settingsPath: EMAIL_SETUP_SETTINGS_PATH,
    };
  }

  if (language === "es") {
    return {
      intro:
        "Para que Autopilot envíe desde su buzón corporativo, primero conecte Google Workspace u Outlook/SMTP en Ajustes del espacio de trabajo.",
      steps: [
        {
          title: "Paso 1 — Abrir ajustes del espacio de trabajo",
          body: 'En el menú lateral haga clic en "Espacio de trabajo". Busque la sección "Conexión de e-mail corporativo".',
        },
        {
          title: "Paso 2 — Elija su proveedor",
          body:
            "Google: \"Conectar vía Google OAuth\". Outlook/dominio propio: complete nombre, e-mail, servidor SMTP, puerto y contraseña de aplicación.",
        },
        {
          title: "Paso 3 — Contraseña de aplicación de Google (sin OAuth)",
          body:
            "En la cuenta Google → Seguridad active la verificación en dos pasos y cree una contraseña de aplicación.",
        },
        {
          title: "Paso 4 — Compruebe el estado",
          body:
            'Cuando esté conectado verá "Conectado — Autopilot puede enviar". Vuelva a Autopilot y lance la campaña.',
        },
      ],
      footer: "Abrir el panel de conexión:",
      settingsPath: EMAIL_SETUP_SETTINGS_PATH,
    };
  }

  if (language === "de") {
    return {
      intro:
        "Damit Autopilot aus Ihrem Firmenpostfach sendet, verbinden Sie zuerst Google Workspace oder Outlook/SMTP in den Workspace-Einstellungen.",
      steps: [
        {
          title: "Schritt 1 — Workspace-Einstellungen öffnen",
          body: 'Klicken Sie in der Seitenleiste auf "Arbeitsbereich". Suchen Sie den Abschnitt "Firmen-E-Mail-Verbindung".',
        },
        {
          title: "Schritt 2 — Anbieter wählen",
          body:
            "Google: \"Über Google OAuth verbinden\". Outlook/eigene Domain: Absendername, E-Mail, SMTP-Server, Port und App-Passwort eingeben.",
        },
        {
          title: "Schritt 3 — Google App-Passwort (ohne OAuth)",
          body:
            "In Google-Konto → Sicherheit 2-Faktor aktivieren und unter \"App-Passwörter\" ein Passwort erstellen.",
        },
        {
          title: "Schritt 4 — Status prüfen",
          body:
            'Bei Erfolg erscheint "Verbunden — Autopilot kann senden". Kehren Sie zu Autopilot zurück.',
        },
      ],
      footer: "Verbindungspanel öffnen:",
      settingsPath: EMAIL_SETUP_SETTINGS_PATH,
    };
  }

  return {
    intro:
      "Aby Autopilot odesílal kampaně z vaší firemní schránky, nejdříve propojte Google Workspace nebo Outlook/SMTP v nastavení pracovního prostoru.",
    steps: [
      {
        title: "Krok 1: Otevřete Pracovní prostor",
        body: 'V postranním menu klikněte na „Pracovní prostor“ (Settings). Najděte sekci „Propojení firemního e-mailu“.',
      },
      {
        title: "Krok 2: Vyberte poskytovatele",
        body:
          "Google: tlačítko „Propojit přes Google OAuth“ (doporučeno). Outlook/vlastní doména: vyplňte jméno odesílatele, firemní e-mail, SMTP server, port a heslo aplikace.",
      },
      {
        title: "Krok 3: Google heslo aplikace (bez OAuth)",
        body:
          "V Google účtu → Zabezpečení zapněte dvoufázové ověření a v části „Hesla aplikací“ vytvořte nové heslo pro Sklyvo.",
      },
      {
        title: "Krok 4: Ověřte stav připojení",
        body:
          "Po úspěchu uvidíte „✅ Připojeno. Autopilot je aktivní“. Poté se vraťte do Autopilota a spusťte kampaň.",
      },
    ],
    footer: "Otevřít panel propojení:",
    settingsPath: EMAIL_SETUP_SETTINGS_PATH,
  };
}

export function getAutopilotEmailSetupPrompt(language: "cz" | "en" | "es" | "de"): string {
  const prompts = {
    cz: AUTOPILOT_SETUP_PROMPT,
    en: "⚙️ How do I set up Autopilot with my email?",
    es: "⚙️ ¿Cómo activo Autopilot con mi e-mail?",
    de: "⚙️ Wie richte ich Autopilot mit meiner E-Mail ein?",
  };
  return prompts[language];
}
