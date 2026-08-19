import type { Language } from "@/lib/i18n/types";
import type { LegalDocument, LegalDocumentId } from "@/lib/legal/types";

const cz: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    id: "privacy",
    title: "Zásady ochrany osobních údajů",
    updatedAt: "19. 8. 2026",
    sections: [
      {
        heading: "1. Správce údajů",
        paragraphs: [
          "Správcem osobních údajů zpracovávaných v aplikaci Sklyvo je společnost Venegard s.r.o., se sídlem v České republice, kontakt: podpora@venegard.com.",
          "Sklyvo je B2B nástroj pro vyhledávání kontaktů, generování oslovení a správu obchodních příležitostí. Tyto zásady popisují, jaké údaje zpracováváme, proč a jaká máte práva.",
        ],
      },
      {
        heading: "2. Jaké údaje zpracováváme",
        paragraphs: [
          "Údaje o účtu: jméno, e-mail, heslo (v hashované podobě), profilová fotografie, nastavení jazyka a workspace.",
          "Provozní údaje: logy přihlášení, IP adresa, typ prohlížeče, chybové záznamy a metadata potřebná pro bezpečnost služby.",
          "Obchodní data, která do Sklyva vložíte: profil firmy, seznamy leadů, e-mailové koncepty, poznámky v CRM a soubory v úložišti.",
          "Fakturační údaje: tarif, historie plateb a fakturační adresa, pokud máte placený plán.",
        ],
      },
      {
        heading: "3. Účel a právní základ",
        paragraphs: [
          "Údaje zpracováváme za účelem poskytování služby, zákaznické podpory, zabezpečení účtu a plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR).",
          "Marketingové a produktové e-maily zasíláme jen na základě oprávněného zájmu nebo souhlasu, který můžete kdykoli odvolat.",
          "Zákonné povinnosti (např. účetnictví) plníme dle čl. 6 odst. 1 písm. c) GDPR.",
        ],
      },
      {
        heading: "4. Doba uchování",
        paragraphs: [
          "Data účtu uchováváme po dobu trvání smlouvy a následně nejdéle 24 měsíců, pokud zákon nevyžaduje delší lhůtu.",
          "Zálohy a logy bezpečnosti mažeme průběžně podle interní retenční politiky, obvykle do 90 dnů.",
          "Po smazání účtu odstraníme osobní údaje, pokud nemusíme některé záznamy archivovat ze zákona.",
        ],
      },
      {
        heading: "5. Příjemci a předávání",
        paragraphs: [
          "Využíváme důvěryhodné zpracovatele: hosting (Vercel), databáze, e-mailoví poskytovatelé, OpenAI pro generování textů a platební bránu.",
          "Se zpracovateli máme smlouvy o zpracování osobních údajů. Předávání mimo EU/EHP probíhá jen s odpovídajícími zárukami (standardní smluvní doložky).",
        ],
      },
      {
        heading: "6. Vaše práva",
        paragraphs: [
          "Máte právo na přístup, opravu, výmaz, omezení zpracování, přenositelnost údajů a vznést námitku proti zpracování.",
          "Stížnost můžete podat u Úřadu pro ochranu osobních údajů (uoou.cz).",
          "Pro uplatnění práv nás kontaktujte na podpora@venegard.com.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Podmínky použití",
    updatedAt: "19. 8. 2026",
    sections: [
      {
        heading: "1. Předmět služby",
        paragraphs: [
          "Sklyvo poskytuje software pro B2B outreach: vyhledávání firem, generování e-mailů, CRM a automatizaci kampaní.",
          "Používáním služby uzavíráte smlouvu s Venegard s.r.o. Tyto podmínky doplňují ceník a objednávku konkrétního tarifu.",
        ],
      },
      {
        heading: "2. Účet a přístup",
        paragraphs: [
          "Účet je určen pro podnikatele a firmy. Jste odpovědní za bezpečnost přihlašovacích údajů a za aktivity pod vaším účtem.",
          "Agency tarif umožňuje správu více klientů; odpovídáte za to, že máte oprávnění zpracovávat data těchto klientů.",
        ],
      },
      {
        heading: "3. Povolené použití",
        paragraphs: [
          "Službu smíte využívat jen pro legální B2B oslovování v souladu s GDPR, zákonem o elektronických komunikacích a dalšími applicable předpisy.",
          "Je zakázáno spam, klamavé oslovení, obcházení bezpečnostních opatření, scraping mimo povolené kanály Sklyva nebo zneužití cizích dat.",
        ],
      },
      {
        heading: "4. Kredity a platby",
        paragraphs: [
          "Placené tarify se účtují dle ceníku. Kredity se obnovují každé fakturační období; nevyužité kredity se nepřevádí, pokud není u tarifu uvedeno jinak.",
          "Službu můžete zrušit ke konci období v nastavení účtu. Už zaplacené období se nevrací, pokud zákon nestanoví jinak.",
        ],
      },
      {
        heading: "5. Obsah a AI",
        paragraphs: [
          "Texty generované AI kontrolujete před odesláním. Venegard neodpovídá za obsah e-mailů odeslaných z vašeho účtu.",
          "Poskytujeme službu „tak jak je“. Uptime a podpora jsou popsány u jednotlivých tarifů.",
        ],
      },
      {
        heading: "6. Ukončení",
        paragraphs: [
          "Účet můžeme pozastavit nebo ukončit při porušení podmínek, neplacení nebo bezpečnostním riziku.",
          "Po ukončení si můžete exportovat svá data v rozumné lhůtě, pokud to technicky umožňujeme.",
        ],
      },
    ],
  },
  data: {
    id: "data",
    title: "Zpracování dat",
    updatedAt: "19. 8. 2026",
    sections: [
      {
        heading: "1. Vztah správce a zpracovatele",
        paragraphs: [
          "Pro data, která jako uživatel vkládáte do Sklyva (leady, kontakty, obsah e-mailů), jste správcem vy. Venegard s.r.o. jedná jako zpracovatel dle čl. 28 GDPR.",
          "Tento dokument popisuje rozsah zpracování, bezpečnostní opatření a povinnosti stran.",
        ],
      },
      {
        heading: "2. Předmět a doba zpracování",
        paragraphs: [
          "Zpracováváme osobní údaje obsažené ve vašich seznamech leadů, CRM záznamech, konceptech a související metadata jen po dobu trvání smlouvy a dle vašich instrukcí.",
          "Po ukončení smlouvy data smažeme nebo vrátíme, pokud není dohodnuto jinak.",
        ],
      },
      {
        heading: "3. Povaha a účel zpracování",
        paragraphs: [
          "Účely: ukládání, zobrazení, synchronizace s integracemi, generování návrhů textů, odesílání dle vašeho nastavení a zálohování.",
          "Automatizované rozhodování s právními účinky pro subjekty údajů neprovádíme; scoring leadů slouží jen jako podpůrný nástroj.",
        ],
      },
      {
        heading: "4. Typy subjektů údajů a kategorie údajů",
        paragraphs: [
          "Typicky jde o kontaktní osoby firem: jméno, pracovní e-mail, telefon, pozice, firma, web, poznámky a historie komunikace.",
          "Rozsah údajů určujete vy importem nebo sběrem přes Radar/Sniper.",
        ],
      },
      {
        heading: "5. Bezpečnostní opatření",
        paragraphs: [
          "Šifrování přenosu (TLS), řízení přístupu, izolace workspace, pravidelné zálohy a monitoring.",
          "Sub-zpracovatele vybíráme s ohledem na bezpečnost a smluvně je zavazujeme k mlčenlivosti a ochraně údajů.",
        ],
      },
      {
        heading: "6. Povinnosti zákazníka",
        paragraphs: [
          "Zaručujete, že máte právní titul ke zpracování vložených údajů a že subjekty údajů byly informovány, pokud to vyžaduje zákon.",
          "Pokud obdržíte žádost subjektu údajů, informujete nás a my poskytneme součinnost v rozsahu naší role zpracovatele.",
        ],
      },
    ],
  },
  cookies: {
    id: "cookies",
    title: "Cookies",
    updatedAt: "19. 8. 2026",
    sections: [
      {
        heading: "1. Co jsou cookies",
        paragraphs: [
          "Cookies jsou malé soubory ukládané do prohlížeče. Používáme je k provozu přihlášení, ukládání preferencí a měření výkonu aplikace.",
        ],
      },
      {
        heading: "2. Nezbytné cookies",
        paragraphs: [
          "Autentizační session a CSRF tokeny — bez nich Sklyvo nelze bezpečně používat. Tyto cookies nevyžadují souhlas.",
          "Ukládání jazyka a stavu sidebaru pro lepší uživatelský zážitek.",
        ],
      },
      {
        heading: "3. Analytické cookies",
        paragraphs: [
          "Můžeme používat anonymizované analytické nástroje ke zlepšení produktu (např. chybovost, výkon stránek).",
          "Pokud používáme cookies vyžadující souhlas, zobrazíme banner s možností odmítnout nebo přizpůsobit.",
        ],
      },
      {
        heading: "4. Správa cookies",
        paragraphs: [
          "Cookies můžete smazat nebo blokovat v nastavení prohlížeče. Blokování nezbytných cookies může omezit funkčnost aplikace.",
          "Dotazy k cookies směřujte na podpora@venegard.com.",
        ],
      },
    ],
  },
};

const en: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    id: "privacy",
    title: "Privacy policy",
    updatedAt: "19 Aug 2026",
    sections: [
      {
        heading: "1. Data controller",
        paragraphs: [
          "The controller of personal data processed in Sklyvo is Venegard s.r.o., Czech Republic, contact: podpora@venegard.com.",
          "Sklyvo is a B2B tool for contact discovery, outreach copy, and pipeline management. This policy explains what we process, why, and your rights.",
        ],
      },
      {
        heading: "2. Data we process",
        paragraphs: [
          "Account data: name, email, password (hashed), profile photo, language and workspace settings.",
          "Operational data: sign-in logs, IP address, browser type, error logs, and security metadata.",
          "Business data you upload: company profile, lead lists, email drafts, CRM notes, and storage files.",
          "Billing data: plan, payment history, and billing address for paid tiers.",
        ],
      },
      {
        heading: "3. Purpose and legal basis",
        paragraphs: [
          "We process data to provide the service, support customers, secure accounts, and perform our contract (GDPR Art. 6(1)(b)).",
          "Product and marketing emails are sent based on legitimate interest or consent, which you may withdraw anytime.",
          "Legal obligations (e.g. accounting) are processed under GDPR Art. 6(1)(c).",
        ],
      },
      {
        heading: "4. Retention",
        paragraphs: [
          "Account data is kept for the contract term and up to 24 months after, unless law requires longer retention.",
          "Backups and security logs are rotated per internal policy, typically within 90 days.",
          "After account deletion we remove personal data unless archival is required by law.",
        ],
      },
      {
        heading: "5. Recipients and transfers",
        paragraphs: [
          "We use trusted processors: hosting (Vercel), database, email providers, OpenAI for text generation, and payment gateway.",
          "Processors are bound by data processing agreements. Transfers outside the EU/EEA use appropriate safeguards (SCCs).",
        ],
      },
      {
        heading: "6. Your rights",
        paragraphs: [
          "You may request access, rectification, erasure, restriction, portability, and object to processing.",
          "You may lodge a complaint with your supervisory authority.",
          "Contact podpora@venegard.com to exercise your rights.",
        ],
      },
    ],
  },
  terms: {
    id: "terms",
    title: "Terms of use",
    updatedAt: "19 Aug 2026",
    sections: [
      {
        heading: "1. Service",
        paragraphs: [
          "Sklyvo provides B2B outreach software: company discovery, email generation, CRM, and campaign automation.",
          "By using the service you enter into an agreement with Venegard s.r.o. These terms supplement your plan and pricing.",
        ],
      },
      {
        heading: "2. Account",
        paragraphs: [
          "Accounts are for businesses. You are responsible for credential security and activity under your account.",
          "Agency plans allow multiple clients; you must have permission to process their data.",
        ],
      },
      {
        heading: "3. Acceptable use",
        paragraphs: [
          "Use Sklyvo only for lawful B2B outreach compliant with GDPR, ePrivacy, and applicable marketing rules.",
          "Spam, deceptive outreach, bypassing security, or misuse of third-party data is prohibited.",
        ],
      },
      {
        heading: "4. Credits and billing",
        paragraphs: [
          "Paid plans are billed per pricing. Credits renew each billing period; unused credits do not roll over unless stated.",
          "You may cancel at period end in account settings. Paid periods are non-refundable unless required by law.",
        ],
      },
      {
        heading: "5. Content and AI",
        paragraphs: [
          "Review AI-generated copy before sending. Venegard is not liable for emails sent from your account.",
          "The service is provided “as is”; uptime and support depend on your plan.",
        ],
      },
      {
        heading: "6. Termination",
        paragraphs: [
          "We may suspend or terminate accounts for breach, non-payment, or security risk.",
          "After termination you may export your data within a reasonable window where technically feasible.",
        ],
      },
    ],
  },
  data: {
    id: "data",
    title: "Data processing",
    updatedAt: "19 Aug 2026",
    sections: [
      {
        heading: "1. Controller and processor",
        paragraphs: [
          "For data you upload (leads, contacts, email content) you are the controller. Venegard s.r.o. acts as processor under GDPR Art. 28.",
          "This document describes scope, security measures, and obligations.",
        ],
      },
      {
        heading: "2. Subject matter and duration",
        paragraphs: [
          "We process personal data in your lead lists, CRM records, drafts, and related metadata for the contract term and per your instructions.",
          "After termination we delete or return data unless agreed otherwise.",
        ],
      },
      {
        heading: "3. Nature and purpose",
        paragraphs: [
          "Purposes: storage, display, integrations, AI draft generation, sending per your settings, and backup.",
          "We do not make solely automated decisions with legal effects; lead scoring is advisory only.",
        ],
      },
      {
        heading: "4. Data subjects and categories",
        paragraphs: [
          "Typically business contacts: name, work email, phone, role, company, website, notes, and communication history.",
          "You determine scope via import or Radar/Sniper collection.",
        ],
      },
      {
        heading: "5. Security",
        paragraphs: [
          "TLS encryption, access control, workspace isolation, backups, and monitoring.",
          "Sub-processors are vetted and contractually bound to confidentiality and protection.",
        ],
      },
      {
        heading: "6. Customer obligations",
        paragraphs: [
          "You warrant lawful basis for uploaded data and inform data subjects where required.",
          "If you receive a data subject request, notify us and we will assist within our processor role.",
        ],
      },
    ],
  },
  cookies: {
    id: "cookies",
    title: "Cookies",
    updatedAt: "19 Aug 2026",
    sections: [
      {
        heading: "1. What cookies are",
        paragraphs: [
          "Cookies are small browser files. We use them for sign-in, preferences, and product performance measurement.",
        ],
      },
      {
        heading: "2. Essential cookies",
        paragraphs: [
          "Auth session and CSRF tokens — required for secure use of Sklyvo.",
          "Language and UI state for a better experience.",
        ],
      },
      {
        heading: "3. Analytics cookies",
        paragraphs: [
          "We may use anonymized analytics to improve the product (errors, performance).",
          "Where consent is required, we show a banner with accept or customize options.",
        ],
      },
      {
        heading: "4. Managing cookies",
        paragraphs: [
          "You can delete or block cookies in your browser. Blocking essential cookies may limit functionality.",
          "Questions: podpora@venegard.com.",
        ],
      },
    ],
  },
};

const byLanguage: Partial<Record<Language, Record<LegalDocumentId, LegalDocument>>> = {
  cz,
  en,
  de: en,
  es: en,
};

export function getLegalDocument(
  id: LegalDocumentId,
  language: Language,
): LegalDocument {
  const pack = byLanguage[language] ?? en;
  return pack[id];
}
