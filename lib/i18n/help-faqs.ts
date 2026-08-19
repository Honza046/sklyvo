import type { Language } from "@/lib/i18n/types";

export type HelpFaqSectionId = "billing" | "autopilot" | "email";

export type HelpFaqItem = {
  section: HelpFaqSectionId;
  question: string;
  answer: string;
};

export type HelpFaqSection = {
  id: HelpFaqSectionId;
  title: string;
  items: HelpFaqItem[];
};

const sectionTitles: Record<Language, Record<HelpFaqSectionId, string>> = {
  cz: {
    billing: "Kredity a plán",
    autopilot: "Autopilot",
    email: "E-maily a odesílání",
  },
  en: {
    billing: "Credits & plan",
    autopilot: "Autopilot",
    email: "Email & sending",
  },
  es: {
    billing: "Créditos y plan",
    autopilot: "Autopilot",
    email: "Email y envío",
  },
  de: {
    billing: "Credits & Tarif",
    autopilot: "Autopilot",
    email: "E-Mail & Versand",
  },
};

const helpFaqs: Record<Language, HelpFaqItem[]> = {
  cz: [
    {
      section: "billing",
      question: "Jak se kredity spotřebovávají?",
      answer:
        "Kredit se odečte za každé odeslané oslovení a za každé ověření kontaktu. Náhledy a koncepty nic nestojí.",
    },
    {
      section: "billing",
      question: "Co se stane, když vyčerpám kredity uprostřed kampaně?",
      answer:
        "Kampaň se pozastaví a rozjede se sama, jakmile kredity doplníte. Nic se neztratí.",
    },
    {
      section: "billing",
      question: "Přenášejí se nevyužité kredity do dalšího měsíce?",
      answer:
        "Ne, kredity se každý měsíc obnovují. Nevyužité propadají.",
    },
    {
      section: "billing",
      question: "Jaký je rozdíl mezi Single a Agency účtem?",
      answer:
        "Single je jedna firma a jedna doména. Agency spravuje víc klientů a každý má vlastní kampaně i statistiky.",
    },
    {
      section: "billing",
      question: "Můžu plán kdykoli zrušit?",
      answer:
        "Ano, ke konci zaplaceného období. Data zůstanou dostupná k exportu.",
    },
    {
      section: "billing",
      question: "Můžu použít vlastní OpenAI klíč (BYOK)?",
      answer:
        "Ano. V nastavení vložíte vlastní klíč a generování textů se pak účtuje přímo u OpenAI.",
    },
    {
      section: "billing",
      question: "Kde najdu měsíční faktury?",
      answer:
        "V Nastavení Sklyvo → Fakturace. Faktury se zakládají vždy první den v měsíci.",
    },
    {
      section: "autopilot",
      question: "Jak Sklyvo vybírá firmy k oslovení?",
      answer:
        "Podle vašeho profilu ideálního klienta, oboru, regionu a velikosti. Radar pak doplňuje signály jako nábor nebo změna webu.",
    },
    {
      section: "autopilot",
      question: "Můžu zkontrolovat zprávy před odesláním?",
      answer:
        "Ano. Zapněte režim schvalování a každá zpráva čeká na vaše potvrzení.",
    },
    {
      section: "autopilot",
      question: "Co když chci kampaň okamžitě zastavit?",
      answer:
        "Jedním tlačítkem v Autopilotu. Rozeslané zprávy už zpět nevezmeme, frontu ale zastavíme okamžitě.",
    },
    {
      section: "email",
      question: "Jak připojím Google Workspace nebo Outlook?",
      answer:
        "Přes OAuth v Nastavení Sklyvo. Připojení trvá minutu a nepotřebujete heslo aplikace.",
    },
    {
      section: "email",
      question: "Kolik e-mailových adres můžu připojit?",
      answer:
        "Single účet tři, Agency neomezeně. Odesílání se mezi adresami rozkládá automaticky.",
    },
    {
      section: "email",
      question: "Jaké jsou limity odesílání?",
      answer:
        "Nová doména začíná na 30 e-mailech denně a limit se automaticky navyšuje podle doručitelnosti.",
    },
    {
      section: "email",
      question: "Jak dlouho trvá zahřátí nové domény?",
      answer:
        "Obvykle dva až tři týdny. Sklyvo navyšuje objem samo, nemusíte nic řešit.",
    },
    {
      section: "email",
      question: "Co když mi e-mail spadne do spamu?",
      answer:
        "Sklyvo to pozná z chybějících otevření, zpomalí odesílání a navrhne úpravu textu i technického nastavení.",
    },
    {
      section: "email",
      question: "Můžu si nastavit vlastní odesílací okno?",
      answer:
        "Ano, například jen 9–17 v pracovní dny. Nastavíte v Odesílání.",
    },
    {
      section: "email",
      question: "Odpovídá Sklyvo na odpovědi automaticky?",
      answer:
        "Ne. Odpovědi vždy schvalujete vy, Sklyvo jen připraví návrh.",
    },
  ],
  en: [
    {
      section: "billing",
      question: "How are credits consumed?",
      answer:
        "One credit is deducted for each outreach sent and each contact verification. Previews and drafts are free.",
    },
    {
      section: "billing",
      question: "What happens if I run out of credits mid-campaign?",
      answer:
        "The campaign pauses and resumes automatically once you top up credits. Nothing is lost.",
    },
    {
      section: "billing",
      question: "Do unused credits roll over to the next month?",
      answer: "No. Credits renew each month. Unused credits expire.",
    },
    {
      section: "billing",
      question: "What's the difference between Single and Agency accounts?",
      answer:
        "Single is one company and one domain. Agency manages multiple clients, each with their own campaigns and stats.",
    },
    {
      section: "billing",
      question: "Can I cancel my plan anytime?",
      answer:
        "Yes, at the end of the paid period. Your data remains available for export.",
    },
    {
      section: "billing",
      question: "Can I use my own OpenAI key (BYOK)?",
      answer:
        "Yes. Add your key in settings and text generation is billed directly by OpenAI.",
    },
    {
      section: "billing",
      question: "Where do I find monthly invoices?",
      answer:
        "In Sklyvo Settings → Billing. Invoices are issued on the first day of each month.",
    },
    {
      section: "autopilot",
      question: "How does Sklyvo choose companies to reach out to?",
      answer:
        "Based on your ideal client profile, industry, region, and size. Radar adds signals like hiring or website changes.",
    },
    {
      section: "autopilot",
      question: "Can I review messages before they're sent?",
      answer:
        "Yes. Turn on approval mode and each message waits for your confirmation.",
    },
    {
      section: "autopilot",
      question: "What if I need to stop a campaign immediately?",
      answer:
        "One button in Autopilot. Sent messages can't be recalled, but the queue stops instantly.",
    },
    {
      section: "email",
      question: "How do I connect Google Workspace or Outlook?",
      answer:
        "Via OAuth in Sklyvo Settings. Connection takes a minute — no app password needed.",
    },
    {
      section: "email",
      question: "How many email addresses can I connect?",
      answer:
        "Single accounts: three. Agency: unlimited. Sending is distributed across addresses automatically.",
    },
    {
      section: "email",
      question: "What are the sending limits?",
      answer:
        "A new domain starts at 30 emails per day. The limit increases automatically based on deliverability.",
    },
    {
      section: "email",
      question: "How long does domain warm-up take?",
      answer:
        "Usually two to three weeks. Sklyvo increases volume on its own — nothing for you to manage.",
    },
    {
      section: "email",
      question: "What if my email lands in spam?",
      answer:
        "Sklyvo detects missing opens, slows sending, and suggests copy and technical setting changes.",
    },
    {
      section: "email",
      question: "Can I set a custom sending window?",
      answer:
        "Yes — for example 9–17 on weekdays only. Set it in Sending settings.",
    },
    {
      section: "email",
      question: "Does Sklyvo reply to responses automatically?",
      answer:
        "No. You always approve replies — Sklyvo only prepares a draft.",
    },
  ],
  es: [
    {
      section: "billing",
      question: "¿Cómo se consumen los créditos?",
      answer:
        "Se descuenta un crédito por cada outreach enviado y por cada verificación de contacto. Las vistas previas y borradores son gratis.",
    },
    {
      section: "billing",
      question: "¿Qué pasa si me quedo sin créditos a mitad de campaña?",
      answer:
        "La campaña se pausa y se reanuda sola cuando recargues créditos. No se pierde nada.",
    },
    {
      section: "billing",
      question: "¿Los créditos no usados pasan al mes siguiente?",
      answer: "No. Los créditos se renuevan cada mes. Los no usados caducan.",
    },
    {
      section: "billing",
      question: "¿Cuál es la diferencia entre cuenta Single y Agency?",
      answer:
        "Single es una empresa y un dominio. Agency gestiona varios clientes, cada uno con sus campañas y estadísticas.",
    },
    {
      section: "billing",
      question: "¿Puedo cancelar el plan en cualquier momento?",
      answer:
        "Sí, al final del periodo pagado. Tus datos siguen disponibles para exportar.",
    },
    {
      section: "billing",
      question: "¿Puedo usar mi propia clave de OpenAI (BYOK)?",
      answer:
        "Sí. Añade tu clave en ajustes y la generación de textos se factura directamente en OpenAI.",
    },
    {
      section: "billing",
      question: "¿Dónde encuentro las facturas mensuales?",
      answer:
        "En Ajustes de Sklyvo → Facturación. Las facturas se emiten el primer día de cada mes.",
    },
    {
      section: "autopilot",
      question: "¿Cómo elige Sklyvo las empresas a contactar?",
      answer:
        "Según tu perfil de cliente ideal, sector, región y tamaño. Radar añade señales como contratación o cambios web.",
    },
    {
      section: "autopilot",
      question: "¿Puedo revisar los mensajes antes de enviarlos?",
      answer:
        "Sí. Activa el modo de aprobación y cada mensaje espera tu confirmación.",
    },
    {
      section: "autopilot",
      question: "¿Qué pasa si quiero parar una campaña al instante?",
      answer:
        "Un botón en Autopilot. Los mensajes enviados no se pueden recuperar, pero la cola se detiene al momento.",
    },
    {
      section: "email",
      question: "¿Cómo conecto Google Workspace u Outlook?",
      answer:
        "Mediante OAuth en Ajustes de Sklyvo. La conexión tarda un minuto — no necesitas contraseña de aplicación.",
    },
    {
      section: "email",
      question: "¿Cuántas direcciones de email puedo conectar?",
      answer:
        "Cuenta Single: tres. Agency: ilimitadas. El envío se reparte automáticamente entre direcciones.",
    },
    {
      section: "email",
      question: "¿Cuáles son los límites de envío?",
      answer:
        "Un dominio nuevo empieza con 30 emails al día. El límite sube automáticamente según la entregabilidad.",
    },
    {
      section: "email",
      question: "¿Cuánto dura el calentamiento de un dominio nuevo?",
      answer:
        "Normalmente dos o tres semanas. Sklyvo aumenta el volumen solo — no tienes que hacer nada.",
    },
    {
      section: "email",
      question: "¿Qué pasa si mi email cae en spam?",
      answer:
        "Sklyvo lo detecta por aperturas faltantes, ralentiza el envío y sugiere cambios de texto y configuración técnica.",
    },
    {
      section: "email",
      question: "¿Puedo definir una ventana de envío propia?",
      answer:
        "Sí — por ejemplo solo 9–17 en días laborables. Configúralo en Envío.",
    },
    {
      section: "email",
      question: "¿Sklyvo responde automáticamente a las respuestas?",
      answer:
        "No. Siempre apruebas tú las respuestas — Sklyvo solo prepara un borrador.",
    },
  ],
  de: [
    {
      section: "billing",
      question: "Wie werden Credits verbraucht?",
      answer:
        "Pro gesendetem Outreach und pro Kontaktverifizierung wird ein Credit abgezogen. Vorschauen und Entwürfe sind kostenlos.",
    },
    {
      section: "billing",
      question: "Was passiert, wenn mir mitten in der Kampagne die Credits ausgehen?",
      answer:
        "Die Kampagne pausiert und läuft automatisch weiter, sobald Sie Credits nachladen. Nichts geht verloren.",
    },
    {
      section: "billing",
      question: "Werden ungenutzte Credits in den nächsten Monat übernommen?",
      answer: "Nein. Credits erneuern sich monatlich. Ungenutzte verfallen.",
    },
    {
      section: "billing",
      question: "Was ist der Unterschied zwischen Single- und Agency-Konto?",
      answer:
        "Single ist eine Firma und eine Domain. Agency verwaltet mehrere Kunden mit eigenen Kampagnen und Statistiken.",
    },
    {
      section: "billing",
      question: "Kann ich den Tarif jederzeit kündigen?",
      answer:
        "Ja, zum Ende des bezahlten Zeitraums. Ihre Daten bleiben zum Export verfügbar.",
    },
    {
      section: "billing",
      question: "Kann ich einen eigenen OpenAI-Schlüssel nutzen (BYOK)?",
      answer:
        "Ja. Schlüssel in den Einstellungen hinterlegen — Textgenerierung wird dann direkt bei OpenAI abgerechnet.",
    },
    {
      section: "billing",
      question: "Wo finde ich monatliche Rechnungen?",
      answer:
        "In Sklyvo-Einstellungen → Abrechnung. Rechnungen werden am ersten Tag jedes Monats erstellt.",
    },
    {
      section: "autopilot",
      question: "Wie wählt Sklyvo Firmen für Outreach aus?",
      answer:
        "Nach Ihrem Ideal-Kundenprofil, Branche, Region und Größe. Radar ergänzt Signale wie Einstellungen oder Website-Änderungen.",
    },
    {
      section: "autopilot",
      question: "Kann ich Nachrichten vor dem Versand prüfen?",
      answer:
        "Ja. Freigabe-Modus aktivieren — jede Nachricht wartet auf Ihre Bestätigung.",
    },
    {
      section: "autopilot",
      question: "Was, wenn ich eine Kampagne sofort stoppen muss?",
      answer:
        "Ein Knopf im Autopilot. Gesendete Nachrichten sind nicht rückholbar, die Warteschlange stoppt sofort.",
    },
    {
      section: "email",
      question: "Wie verbinde ich Google Workspace oder Outlook?",
      answer:
        "Per OAuth in den Sklyvo-Einstellungen. Verbindung dauert eine Minute — kein App-Passwort nötig.",
    },
    {
      section: "email",
      question: "Wie viele E-Mail-Adressen kann ich verbinden?",
      answer:
        "Single-Konto: drei. Agency: unbegrenzt. Versand wird automatisch auf Adressen verteilt.",
    },
    {
      section: "email",
      question: "Welche Versandlimits gibt es?",
      answer:
        "Neue Domain startet mit 30 E-Mails pro Tag. Das Limit steigt automatisch je nach Zustellbarkeit.",
    },
    {
      section: "email",
      question: "Wie lange dauert das Aufwärmen einer neuen Domain?",
      answer:
        "In der Regel zwei bis drei Wochen. Sklyvo erhöht das Volumen selbst — Sie müssen nichts tun.",
    },
    {
      section: "email",
      question: "Was, wenn meine E-Mail im Spam landet?",
      answer:
        "Sklyvo erkennt fehlende Öffnungen, drosselt den Versand und schlägt Text- und Technik-Anpassungen vor.",
    },
    {
      section: "email",
      question: "Kann ich ein eigenes Sendezeitfenster festlegen?",
      answer:
        "Ja — z. B. nur 9–17 an Werktagen. Einstellung unter Versand.",
    },
    {
      section: "email",
      question: "Antwortet Sklyvo automatisch auf Antworten?",
      answer:
        "Nein. Antworten genehmigen Sie immer selbst — Sklyvo bereitet nur einen Entwurf vor.",
    },
  ],
};

const SECTION_ORDER: HelpFaqSectionId[] = ["billing", "autopilot", "email"];

export function getHelpFaqs(language: Language): HelpFaqItem[] {
  return helpFaqs[language];
}

export function getHelpFaqSections(language: Language): HelpFaqSection[] {
  const items = helpFaqs[language];
  const titles = sectionTitles[language];
  return SECTION_ORDER.map((id) => ({
    id,
    title: titles[id],
    items: items.filter((item) => item.section === id),
  })).filter((section) => section.items.length > 0);
}
