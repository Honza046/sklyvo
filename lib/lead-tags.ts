/**
 * Neviditelné tagy leadů — ukládají se v DB, v UI se neukazují na kartách,
 * slouží jen ke kvalitní filtraci (Autopilot / CRM).
 */

export const LEAD_TAG_LABELS: Record<string, string> = {
  fitka: "Fitka / gym",
  wellness: "Wellness / spa",
  gastro: "Gastro / restaurace",
  healthcare: "Zdravotnictví",
  legal: "Právo",
  ecommerce: "E-shop",
  reality: "Reality",
  finance: "Finance / účetnictví",
  logistics: "Logistika",
  production: "Výroba",
  marketing: "Marketing / agentura",
  it_web: "IT / web",
  beauty: "Beauty / kosmetika",
  auto: "Auto / servis",
  education: "Školství / kurzy",
  hotel: "Hotel / ubytování",
  retail: "Obchod / retail",
  construction: "Stavebnictví",
  sport: "Sport obecně",
};

/** Pořadí v selectu filtrů. */
export const LEAD_TAG_ORDER = Object.keys(LEAD_TAG_LABELS);

type TagRule = {
  tag: string;
  /** Regex proti normalizovanému textu (název, doména, query, industry). */
  pattern: RegExp;
};

const TAG_RULES: TagRule[] = [
  {
    tag: "fitka",
    pattern:
      /\b(fitka|fitness|fitnes|gym|posilovn|crossfit|cross.?fit|bodybuilding|workout|powerlifting|calisthenics|sportcentrum|sport.?centrum|fitnesscentrum)\b/,
  },
  {
    tag: "wellness",
    pattern: /\b(wellness|spa\b|sauna|masaz|relaxacni|lazne)\b/,
  },
  {
    tag: "sport",
    pattern:
      /\b(sportovni klub|tenis|squash|badminton|plaveck|bazen|yoga|joga|pilates)\b/,
  },
  {
    tag: "gastro",
    pattern:
      /\b(restaurace|kavarna|bistro|hospoda|pizzerie|cukrarna|gastro|bar\b|pub\b|cafe|jidelna|fast.?food|burger)\b/,
  },
  {
    tag: "healthcare",
    pattern:
      /\b(ordinace|klinik|lekar|zubar|stomatolog|fyzioter|nemocnic|ambulance|dentalni|gynekolog|pediatr|lekarna)\b/,
  },
  {
    tag: "legal",
    pattern: /\b(advokat|pravni|notar|advokacie|advokatni)\b/,
  },
  {
    tag: "ecommerce",
    pattern: /\b(e-?shop|eshop|online.?shop|internetovy obchod)\b/,
  },
  {
    tag: "reality",
    pattern: /\b(reality|realitni|nemovitost|developersk|pronajem|real.?estate)\b/,
  },
  {
    tag: "finance",
    pattern:
      /\b(ucetni|ucetnictvi|danov|hypote|pojistov|financni porad|bookkeeping)\b/,
  },
  {
    tag: "logistics",
    pattern: /\b(logistik|doprav|spedice|skladovan|zasilk|kuryr)\b/,
  },
  {
    tag: "production",
    pattern: /\b(vyrob|prumysl|strojiren|\bcnc\b|fabrika|manufactur)\b/,
  },
  {
    tag: "marketing",
    pattern:
      /\b(marketing|agentura|ppc|seo\b|reklamni|social media|branding|copywriting)\b/,
  },
  {
    tag: "it_web",
    pattern:
      /\b(webove studio|softwar|software|saas|it firma|vyvojar|programator|digitalni agentura)\b/,
  },
  {
    tag: "beauty",
    pattern:
      /\b(kosmetik|kadernict|barber|nehty|manikur|pedikur|beauty|lash|oblicejov)\b/,
  },
  {
    tag: "auto",
    pattern: /\b(autoservis|pneuservis|autodily|car.?wash|mycka|autosalon|dealership)\b/,
  },
  {
    tag: "education",
    pattern:
      /\b(skola|skolka|kurzy|vzdelav|jazykova|tutoring|academy|akademie)\b/,
  },
  {
    tag: "hotel",
    pattern: /\b(hotel|penzion|ubytovani|apartman|hostel|motel|airbnb)\b/,
  },
  {
    tag: "retail",
    pattern: /\b(obchod|prodejna|boutique|retail|supermarket|hypermarket)\b/,
  },
  {
    tag: "construction",
    pattern:
      /\b(stavebn|stavitel|zednict|klempir|elektroinstal|vodoinstal|rekonstrukc|development)\b/,
  },
];

/** Google Places `primaryType` / `types` → interní tag. */
const PLACE_TYPE_TO_TAG: Record<string, string> = {
  gym: "fitka",
  fitness_center: "fitka",
  sports_complex: "sport",
  sports_club: "sport",
  stadium: "sport",
  spa: "wellness",
  beauty_salon: "beauty",
  hair_care: "beauty",
  restaurant: "gastro",
  cafe: "gastro",
  bar: "gastro",
  bakery: "gastro",
  meal_takeaway: "gastro",
  meal_delivery: "gastro",
  hospital: "healthcare",
  doctor: "healthcare",
  dentist: "healthcare",
  physiotherapist: "healthcare",
  pharmacy: "healthcare",
  lawyer: "legal",
  real_estate_agency: "reality",
  accounting: "finance",
  insurance_agency: "finance",
  bank: "finance",
  moving_company: "logistics",
  storage: "logistics",
  car_repair: "auto",
  car_dealer: "auto",
  car_wash: "auto",
  lodging: "hotel",
  hotel: "hotel",
  school: "education",
  university: "education",
  clothing_store: "retail",
  store: "retail",
  general_contractor: "construction",
  electrician: "construction",
  plumber: "construction",
};

function normalizeTagText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_/|+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = tag.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    if (!(key in LEAD_TAG_LABELS)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function leadTagLabel(tag: string): string {
  return LEAD_TAG_LABELS[tag] ?? tag;
}

export type InferLeadTagsInput = {
  companyName?: string | null;
  domain?: string | null;
  industry?: string | null;
  /** Radar / Places text query (např. „fitka Praha“). */
  searchQuery?: string | null;
  /** Google Places primaryType + types. */
  placeTypes?: string[] | null;
};

/** Odhadne neviditelné tagy z dostupných signálů (bez AI). */
export function inferLeadTags(input: InferLeadTagsInput): string[] {
  const tags: string[] = [];

  for (const raw of input.placeTypes ?? []) {
    const key = raw.trim().toLowerCase().replace(/^places\//, "");
    const mapped = PLACE_TYPE_TO_TAG[key];
    if (mapped) tags.push(mapped);
  }

  const blob = normalizeTagText(
    [input.companyName, input.domain, input.industry, input.searchQuery]
      .filter(Boolean)
      .join(" "),
  );

  if (blob) {
    for (const rule of TAG_RULES) {
      if (rule.pattern.test(blob)) {
        tags.push(rule.tag);
      }
    }
  }

  return uniqueTags(tags);
}

export function tagsEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const left = uniqueTags(a ?? []);
  const right = uniqueTags(b ?? []);
  if (left.length !== right.length) return false;
  return left.every((tag, i) => tag === right[i]);
}
