export const PREDEFINED_INDUSTRIES = [
  "B2B SaaS",
  "E-commerce",
  "Marketing & PR",
  "Výroba a průmysl",
  "Finance a účetnictví",
  "Reality a stavebnictví",
  "IT a vývoj",
  "Logistika a doprava",
  "Právo a advokacie",
  "Konzultace a poradenství",
];

export const PREDEFINED_SERVICE_GROUPS = [
  {
    id: "digital",
    label: "Digitální služby a IT",
    services: [
      "Vývoj webů a aplikací",
      "AI systémy a chatboti",
      "Automatizace procesů",
      "UI/UX Design",
      "SEO a online marketing",
      "Správa sociálních sítí",
      "IT podpora a bezpečnost",
    ],
  },
  {
    id: "professional",
    label: "Profesionální služby",
    services: [
      "Účetnictví a daně",
      "Právní služby a advokacie",
      "HR a nábor zaměstnanců",
      "Konzultace a audity",
      "Překlady a tlumočení",
      "Finanční poradenství",
    ],
  },
  {
    id: "construction",
    label: "Stavebnictví a řemesla",
    services: [
      "Fotovoltaika a čerpadla",
      "Truhlářství a nábytek",
      "Projektování a architektura",
      "Stavební realizace",
      "Revize a technické služby",
    ],
  },
  {
    id: "commerce",
    label: "Obchod a výroba",
    services: [
      "E-commerce a eshopy",
      "Zakázková výroba",
      "Velkoobchodní dodávky",
      "Logistika a doprava",
    ],
  },
  {
    id: "other",
    label: "Ostatní služby",
    services: [
      "Fotografování a video",
      "Reality a nemovitosti",
      "Vzdělávání a kurzy",
      "Zdravotní a estetická péče",
    ],
  },
] as const;

/** Plochý seznam všech předdefinovaných oborů (onboarding, validace, Sniper). */
export const PREDEFINED_SERVICES = PREDEFINED_SERVICE_GROUPS.flatMap((group) => group.services);

/** Sentinel hodnota pro režim, kdy AI sama vybere nejvhodnější službu podle analýzy webu. */
export const SNIPER_AUTODETECT_VALUE = "autodetect";

/** Popisek autodetekce v Sniper výběru (výchozí možnost). */
export const SNIPER_AUTODETECT_LABEL = "Chytrá autodetekce AI";

/** Statické možnosti výběru „Typ nabídky“ ve Sniperu (nezávislé na databázi). */
export const SNIPER_OFFER_OPTIONS = [
  { value: SNIPER_AUTODETECT_VALUE, label: SNIPER_AUTODETECT_LABEL },
  { value: "Vývoj webů a aplikací", label: "Vývoj webů a aplikací" },
  { value: "AI systémy a chatboti", label: "AI systémy a chatboti" },
  { value: "Automatizace procesů", label: "Automatizace procesů" },
  { value: "UI/UX Design", label: "UI/UX Design" },
] as const;

export const PREDEFINED_AUDIENCES = [
  "Majitelé firem (CEO)",
  "Marketingoví ředitelé (CMO)",
  "HR Manažeři",
  "E-shopaři",
  "Obchodní ředitelé (CSO)",
  "Finanční ředitelé (CFO)",
  "Provozní ředitelé (COO)",
  "IT ředitelé (CIO)",
];
