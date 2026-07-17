import type { Language } from "@/lib/i18n/types";

export type HelpFaqItem = {
  question: string;
  answer: string;
};

const helpFaqs: Record<Language, HelpFaqItem[]> = {
  cz: [
    {
      question: "Jak se počítá spotřeba kreditů?",
      answer:
        "Kredity se odečítají za každou úspěšnou AI operaci. Vygenerování jednoho e-mailu přes Sniper stojí typicky 1 kredit. Deep Scan v Radaru stojí 2 kredity za firmu. Nevyužité kredity se do dalšího měsíce nepřevádějí.",
    },
    {
      question: "Mohu používat vlastní klíč k OpenAI (BYOK)?",
      answer:
        "Z důvodu optimalizace našich modelů a kvality výstupů nepodporujeme vkládání vlastních API klíčů. Celý systém běží na našich serverech — kupujete balíčky kreditů bez skrytých poplatků u OpenAI nebo Googlu.",
    },
    {
      question: "Jak napojím svůj Google Workspace nebo Outlook?",
      answer:
        "Přejděte do Osobního profilu a sekce Propojené e-mailové účty. Tam můžete přes OAuth propojit firemní schránku. Venegard získá oprávnění pouze k odesílání e-mailů.",
    },
    {
      question: "Kde najdu svoje měsíční faktury za předplatné?",
      answer:
        "Faktury a správu platební karty najdete v Osobním profilu v sekci Fakturace a předplatné. Faktury si stáhněte jako PDF — generují se první den zúčtovacího období.",
    },
    {
      question: "Jak importovat vlastní kontakty (CSV)?",
      answer:
        "V CRM nebo v přípravě kampaně vyberte import kontaktů a nahrajte CSV (firma, jméno, e-mail, pozice). Systém kontroluje duplicity podle e-mailu.",
    },
    {
      question: "Jaké jsou limity pro odesílání e-mailů?",
      answer:
        "Limity závisí na tarifu a ochraně domény. Počet zpráv za hodinu/den držíme v bezpečném pásmu. Přesný strop je v nastavení předplatného nebo u podpory.",
    },
    {
      question: "Jak funguje ochrana domény proti spamu?",
      answer:
        "Postupné odesílání, střídání šablon a respektování odhlášení. Doporučujeme SPF, DKIM a DMARC u odesílací domény.",
    },
    {
      question: "Lze propojit CRM s Pipedrive?",
      answer:
        "Ano, typicky přes webhooky nebo Make.com/Zapier. Nové leady a změny stavů mohou odejít do Pipedrive — mapování nastavíte v Integracích.",
    },
    {
      question: "Kde nastavím podpis do e-mailu?",
      answer:
        "Podpis nastavíte v Osobním profilu u propojených účtů nebo ve šablonách ve Sniperovi. Změny platí u nově generovaných kampaní.",
    },
  ],
  en: [
    {
      question: "How are credits consumed?",
      answer:
        "Credits are deducted for each successful AI operation. One Sniper email typically costs 1 credit. Radar Deep Scan costs 2 credits per company. Unused credits do not roll over.",
    },
    {
      question: "Can I use my own OpenAI key (BYOK)?",
      answer:
        "We do not support custom API keys. The system runs on our optimized servers — you buy credit packs without hidden OpenAI or Google fees.",
    },
    {
      question: "How do I connect Google Workspace or Outlook?",
      answer:
        "Go to your profile → Connected email accounts and connect via OAuth. Venegard only gets permission to send emails.",
    },
    {
      question: "Where are my monthly invoices?",
      answer:
        "Invoices and payment card management are in your profile under Billing & subscription. Download PDFs generated on the first day of each billing period.",
    },
    {
      question: "How do I import contacts (CSV)?",
      answer:
        "In CRM or campaign setup, choose import and upload CSV (company, name, email, role). Duplicates are checked by email.",
    },
    {
      question: "What are email sending limits?",
      answer:
        "Limits depend on your plan and domain protection. We throttle sends to safe levels. Exact caps are in subscription settings or from support.",
    },
    {
      question: "How does domain spam protection work?",
      answer:
        "Gradual sending, template rotation, and unsubscribe respect. We strongly recommend SPF, DKIM, and DMARC on your sending domain.",
    },
    {
      question: "Can I connect CRM to Pipedrive?",
      answer:
        "Yes, typically via webhooks or Make.com/Zapier. Map fields in Integrations.",
    },
    {
      question: "Where do I set my email signature?",
      answer:
        "Set it in your profile under connected accounts or in Sniper templates. Changes apply to newly generated campaigns.",
    },
  ],
  es: [
    {
      question: "¿Cómo se consumen los créditos?",
      answer:
        "Los créditos se descuentan por cada operación IA exitosa. Un email de Sniper suele costar 1 crédito. Deep Scan en Radar cuesta 2 créditos por empresa.",
    },
    {
      question: "¿Puedo usar mi propia clave de OpenAI?",
      answer:
        "No admitimos claves API propias. El sistema corre en nuestros servidores — compras paquetes de créditos sin costes ocultos.",
    },
    {
      question: "¿Cómo conecto Google Workspace u Outlook?",
      answer:
        "Ve a tu perfil → Cuentas de email conectadas y conecta vía OAuth. Venegard solo obtiene permiso para enviar emails.",
    },
    {
      question: "¿Dónde están mis facturas mensuales?",
      answer:
        "En tu perfil, sección Facturación y suscripción. Descarga PDFs generados el primer día del período.",
    },
    {
      question: "¿Cómo importo contactos (CSV)?",
      answer:
        "En CRM o preparación de campaña, sube un CSV (empresa, nombre, email, cargo). Se comprueban duplicados por email.",
    },
    {
      question: "¿Cuáles son los límites de envío?",
      answer:
        "Dependen del plan y protección del dominio. Limitamos envíos a niveles seguros.",
    },
    {
      question: "¿Cómo funciona la protección anti-spam?",
      answer:
        "Envío gradual, rotación de plantillas y respeto de bajas. Recomendamos SPF, DKIM y DMARC.",
    },
    {
      question: "¿Puedo conectar CRM con Pipedrive?",
      answer:
        "Sí, vía webhooks o Make.com/Zapier. Configura el mapeo en Integraciones.",
    },
    {
      question: "¿Dónde configuro la firma del email?",
      answer:
        "En tu perfil o plantillas de Sniper. Los cambios aplican a campañas nuevas.",
    },
  ],
  de: [
    {
      question: "Wie werden Credits verbraucht?",
      answer:
        "Credits werden pro erfolgreicher KI-Operation abgezogen. Eine Sniper-E-Mail kostet typisch 1 Credit. Radar Deep Scan kostet 2 Credits pro Firma.",
    },
    {
      question: "Kann ich einen eigenen OpenAI-Schlüssel nutzen?",
      answer:
        "Eigene API-Schlüssel werden nicht unterstützt. Sie kaufen Credit-Pakete ohne versteckte Gebühren.",
    },
    {
      question: "Wie verbinde ich Google Workspace oder Outlook?",
      answer:
        "Profil → Verbundene E-Mail-Konten → per OAuth verbinden. Venegard erhält nur Sendeberechtigung.",
    },
    {
      question: "Wo finde ich monatliche Rechnungen?",
      answer:
        "Im Profil unter Abrechnung & Abo. PDFs werden am ersten Tag des Abrechnungszeitraums erstellt.",
    },
    {
      question: "Wie importiere ich Kontakte (CSV)?",
      answer:
        "Im CRM oder Kampagnen-Setup CSV hochladen (Firma, Name, E-Mail, Rolle). Duplikate werden per E-Mail geprüft.",
    },
    {
      question: "Welche Versandlimits gibt es?",
      answer:
        "Abhängig von Tarif und Domain-Schutz. Wir drosseln auf sichere Werte.",
    },
    {
      question: "Wie funktioniert Spam-Schutz der Domain?",
      answer:
        "Schrittweises Senden, Template-Rotation, Abmeldungen respektieren. SPF, DKIM, DMARC empfohlen.",
    },
    {
      question: "CRM mit Pipedrive verbinden?",
      answer:
        "Ja, per Webhooks oder Make.com/Zapier. Mapping in Integrationen.",
    },
    {
      question: "Wo stelle ich die E-Mail-Signatur ein?",
      answer:
        "Im Profil bei verbundenen Konten oder in Sniper-Vorlagen.",
    },
  ],
};

export function getHelpFaqs(language: Language): HelpFaqItem[] {
  return helpFaqs[language];
}
