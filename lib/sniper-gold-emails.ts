/**
 * Gold-standard ukázkové cold e-maily pro Sniper (25 oborů).
 * Účel: few-shot inspirace + offline fallback při Gemini kvótě (buildGoldQuotaFallbackDraft).
 * Offline draft není copy-paste odesílání — před odesláním upravit fakta z webu.
 *
 * PŘEDMĚTY V PRODUKCI:
 * Pole `subject` u ukázek je jen orientační styl. Live Sniper dál generuje
 * 3–4 personalizované chytlavé předměty (s refreshem) přes stávající flow,
 * gold banka je nenahrazuje.
 *
 * Pravidla při použití v generování:
 * - NIKDY neposílej text doslova, vždy nahraď konkrétními fakty z webu klienta.
 * - „Fakta“ v ukázkách jsou fiktivní příklady stylu (rozvrh, ceník, specializace…).
 * - Podpis: v ukázkách „Jan Sedlář za tým Sklyvo“; v appce nahradí podpis uživatele / workspace.
 * - Piš v 1. osobě jednotného čísla (já), ne „modernizujeme / my v …“.
 * - Placeholder [Název firmy] nahraď jménem firmy NEBO „váš web“ (bez syrové domény).
 * - Žádné pomlčky (-, –, —) v těle ukázky.
 */

export type SniperGoldEmailExample = {
  id: number;
  /** Krátký název oboru. */
  industry: string;
  /** Tag(y) sladitelné s `lib/lead-tags.ts` (kde dává smysl). */
  tags: string[];
  /** Jen ukázka tónu. Produkce = 3–4 generované předměty + refresh. */
  subject: string;
  /** Tělo včetně oslovení; podpis je ukázkový, v appce se nahradí. */
  body: string;
};

export const SNIPER_GOLD_EMAIL_EXAMPLES: SniperGoldEmailExample[] = [
  {
    id: 1,
    industry: "Fitka / gym / sportoviště",
    tags: ["fitka", "sport"],
    subject: "rozvrh lekcí vs. jak se u vás lidi přihlásí",
    body: `Dobrý den,

na webu [Název firmy] je hezky rozepsaný rozvrh lekcí, ale cesta k rezervaci pak skáče na Messenger / telefon. Právě tam podle mě mizí lidi, co už měli chuť přijít.

Dělám weby pro fitness místa, hlavně aby rozvrh, permanentky a první návštěva šly dokončit na jednom místě, bez zbytečných a zdlouhavých prokliků.

Kdyby se vám to hodilo, rád se na to podívám spolu s vámi. Stačí napsat, jestli Vám dává smysl krátký hovor.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 2,
    industry: "Wellness / spa / masáže",
    tags: ["wellness"],
    subject: "termíny a poukazy, co klient nevidí hned",
    body: `Dobrý den,

u [Název firmy] je na webu hezký popis procedur, ale volné termíny a dárkové poukazy jsou schované o úroveň dál. U relaxu lidi rozhodují rychle, když to nevidí hned, odejdou.

Umím weby pro wellness a masáže postavit tak, aby první dojem seděl s úrovní péče a objednání bylo na pár kliknutí.

Máte čas se na to společně podívat? Napište, jestli si můžeme příští týden zavolat.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 3,
    industry: "Ordinace / klinika",
    tags: ["healthcare"],
    subject: "ceník a objednání, co pacienti hledají jako první",
    body: `Dobrý den,

procházel jsem web [Název firmy], spektrum péče je jasné, ale ceník a objednání jsou až po několika kliknutích. Pacienti v tomhle bodě často radši zavolají jinam, nebo to vzdají.

Pomáhám ordinacím a klinikám s weby, které působí klidně a důvěryhodně a první kontakt usnadní, ne zkomplikují.

Když budete chtít, pošlu vám 2 konkrétní návrhy jen k vašemu webu, případně si můžeme domluvit i krátký hovor.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 4,
    industry: "Advokátní kancelář / notář",
    tags: ["legal"],
    subject: "specializace, kterou klient musí hledat",
    body: `Dobrý den,

na webu [Název firmy] je vidět zkušenost týmu, ale hlavní specializace (např. obchodní právo / reality) není hned na úvodu. U právních služeb rozhodují vteřiny, když to klient nenajde, jde dál.

Dělám weby pro kanceláře tak, aby autorita byla zřejmá hned a poptávka šla odeslat bez zbytečného bloudění na webu.

Hodilo by se vám to probrat napřímo? Klidně jen krátký hovor, konkrétně k vašemu webu.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 5,
    industry: "Účetnictví / daňové poradenství",
    tags: ["finance"],
    subject: "jak k vám firma přejde, je to na webu jasné?",
    body: `Dobrý den,

web [Název firmy] působí věcně, ale podnikatel na něm musí hledat, co přesně řešíte (daně / mzdy / přechod od jiné kanceláře) a jak vypadá první krok. Právě tam se rozhoduje, jestli napíše Vám nebo konkurenci.

Pomáhám účetním a daňovým poradcům s weby, které vysvětlí přínos lidsky a zkrátí cestu k první schůzce.

Když budete mít zájem, rád to s vámi projdu, napište zda by Vám dával smysl krátký hovor příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 6,
    industry: "Reality / realitní kancelář",
    tags: ["reality"],
    subject: "nabídky vs. proč si vybrat právě vás",
    body: `Dobrý den,

u [Název firmy] jsou na webu nabídky, ale výsledky / reference makléřů jsou slaběji vidět než fotky bytů. Majitel, který vybírá, koho pověří prodejem, tohle často porovnává jako první.

Dělám weby pro reality tak, aby nemovitosti vypadaly silně a zároveň bylo jasné, proč jít právě k vám a to nejdůležitější usnadnit klientům orientaci na vašem webu.

Chcete, abych vám napsal 2 konkrétní věci, co bych na vašem webu upravil jako první? Případně si můžeme domluvit krátký hovor na příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 7,
    industry: "Eshop (móda / doplňky)",
    tags: ["ecommerce", "retail"],
    subject: "košík na mobilu, kde lidi odpadávají",
    body: `Dobrý den,

díval jsem se na eshop [Název firmy] z mobilu, produkty vypadají dobře, ale checkout / velikosti / doprava působí zbytečně těžkopádně. U módy tam končí spousta nákupů, které už měly být hotové.

Stavím eshopy (i redesigny), kde je cesta od katalogu k objednávce krátká  a to hlavně na telefonu, kde nakupuje nejvíce zákazníků.

Kdybychom se na to podívali spolu, ukážu vám to přímo na vašich stránkách. Vyhovoval by vám krátký hovor příští týden?

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 8,
    industry: "Eshop (nábytek / hobby)",
    tags: ["ecommerce", "retail"],
    subject: "rozměry a doprava schované pod produkt",
    body: `Dobrý den,

u eshopu [Název firmy] je široký katalog, ale rozměry, hmotnost a doprava jsou často až hluboko v detailu. U nábytku / hobby to lidi potřebují dřív, než dají zboží do košíku, jinak nákup nedokončí.

Umím eshopy srovnat tak, aby se ve velké nabídce dalo vyznat a to především na mobilu, kde nakupuje nejvíce zákazníků a nebylo to pro ně utrpení.

Máte prostor to krátce projít? Napište datum a čas příští týden, kdy by vám dával smysl krátký hovor.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 9,
    industry: "Gastro / restaurace / kavárna",
    tags: ["gastro"],
    subject: "jídelní lístek na mobilu se u vás otevírá pomalu",
    body: `Dobrý den,

na webu [Název firmy] jsem otevřel jídelní lístek z telefonu, načítá se zbytečně dlouho a rezervace stolu není hned po ruce. Host v tu chvíli často radši zvolí podnik, kde to má za 5 sekund.

Dělám weby pro restaurace a kavárny, aby menu, otevíračka a rezervace fungovaly na mobilu bez zbytečného bloudění zákazníka.

Když budete chtít, podívám se na to s vámi. Vyhovoval by vám krátký hovor příští týden?

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 10,
    industry: "Hotel / penzion / ubytování",
    tags: ["hotel"],
    subject: "přímá rezervace vs. Booking",
    body: `Dobrý den,

web [Název firmy] hezky ukazuje pokoje, ale přímá rezervace / ceník je méně vidět než odkazy ven. Host pak často skončí na portálu, a vy platíte provizi za někoho, koho jste už skoro měli.

Pomáhám hotelům a penzionům s weby, které tahají víc přímých rezervací a na mobilu se v tom vyzná i unavený cestovatel.

Dává vám smysl to probrat? Klidně napište jen „ano“ a domluvíme krátký hovor na příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 11,
    industry: "Beauty / kosmetika / kadeřnictví",
    tags: ["beauty"],
    subject: "portfolio je, rezervace je schovaná",
    body: `Dobrý den,

u [Název firmy] jsou na webu hezké ukázky práce, ale ceník a online rezervace nejsou na první obrazovce. Klientky rozhodují vizuálně a rychle, když musí hledat termín, jdou jinam.

Dělám weby pro salony tak, aby fotky prodávaly a objednání bylo hned vedle nich po ruce.

Kdybyste chtěli tipy přímo k vašemu webu, napište, ozvu se s konkrétními body. Případně si můžeme domluvit krátký hovor na příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 12,
    industry: "Auto servis / pneuservis",
    tags: ["auto"],
    subject: "objednání na pneuservis bez volání",
    body: `Dobrý den,

na webu [Název firmy] je výpis služeb, ale rychlé objednání (pneuservis / STK / diagnostika) vede hlavně na telefonu. Řidič to řeší ve spěchu, když nejde kliknout hned, jede o ulici dál.

Umím weby pro servisy udělat tak, aby působily důvěryhodně a rezervace šla dokončit z mobilu za minutu.

Máte chuť se na to podívat? Případně si můžeme domluvit krátký hovor na příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 13,
    industry: "Stavebnictví / řemesla",
    tags: ["construction"],
    subject: "realizace jsou silné, poptávka je slabá",
    body: `Dobrý den,

procházel jsem [Název firmy], fotky realizací vypadají dobře, ale formulář poptávky a typy zakázek (střechy / rekonstrukce / instalace) nejsou stejně výrazné. Zájemce pak často napíše první firmě, kterou najde s jasným „poptat“.

Pomáhám řemeslníkům a stavebním firmám s weby, kde práce mluví sama a poptávka je na dosah.

Když budete chtít, sepíšu vám 2 konkrétní úpravy jen podle vašeho webu. Případně si můžeme domluvit krátký hovor na příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 14,
    industry: "Výroba / průmysl / B2B dodavatel",
    tags: ["production"],
    subject: "certifikace a kapacity nejsou na úvodu",
    body: `Dobrý den,

web [Název firmy] popisuje výrobu, ale certifikace, kapacity a typické zakázky jsou rozstrkané po podstránkách. Nákupčí to hledá jako první, když to nenajde, jde k dodavateli, co to má na úvodu.

Dělám weby pro výrobní a B2B firmy tak, aby působily odborně a partnerovi usnadnily první kontakt.

Hodilo by se vám to krátce projít? Napište, kdy se vám to hodí a můžeme se spojit na hovoru.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 15,
    industry: "Logistika / doprava / sklad",
    tags: ["logistics"],
    subject: "poptávka přepravy na víc kliků, než musí",
    body: `Dobrý den,

u [Název firmy] je na webu přehled služeb, ale odeslání poptávky (trasa / palety / termín) trvá zbytečně dlouho. U dopravy rozhoduje rychlost, když to nejde za minutu, zákazník volá jinam.

Umím logistické weby zjednodušit tak, aby kapacity byly jasné a specifikace šla poslat hned.

Chcete to spočítat na vašem webu? Ozvěte se a podívám se na to s vámi, případně si můžeme zavolat příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 16,
    industry: "Marketingová / PPC agentura",
    tags: ["marketing"],
    subject: "case studies až pod foldem",
    body: `Dobrý den,

na webu [Název firmy] jsou služby popsané obecně, ale case studies / čísla výsledků jsou až níž, než by měly. Klient agentury kupuje důkaz, když ho nevidí hned, klikne na konkurenci s jasnými výsledky.

Pomáhám agenturám s weby, které ukazují práci napřed a poptávku nechají snadnou.

Když budete mít zájem, rád to s vámi projdu na konkrétních stránkách u vás.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 17,
    industry: "IT / softwarová firma",
    tags: ["it_web"],
    subject: "tech stack a projekty nejsou na jednom místě",
    body: `Dobrý den,

web [Název firmy] působí moderně, ale tech stack a vybrané projekty jsou rozptýlené. B2B klient to chce vidět rychle, jinak má pocit, že „ještě nevíte, co umíte“.

Dělám prezentace pro IT týmy tak, aby technologie a reference seděly vedle sebe a zadání šlo poslat bez tření.

Dává smysl krátký hovor? Napište, co vám vyhovuje.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 18,
    industry: "Školství / kurzy / jazykovka",
    tags: ["education"],
    subject: "rozvrh kurzů vs. přihláška",
    body: `Dobrý den,

u [Název firmy] je na webu nabídka kurzů, ale zápis / přihláška není stejně rychlá jako prohlížení rozvrhu. Zájemce, co už vybral termín, pak často odejde k jazykovce, kde to má na jedno tlačítko.

Pomáhám školám a kurzům s weby, kde je výběr i zápis stejně jednoduchý.

Když budete chtít, pošlu tipy přímo k vašemu webu, bez obecné omáčky. Případně si můžeme domluvit krátký hovor na příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 19,
    industry: "Developer / stavební projekty",
    tags: ["reality", "construction"],
    subject: "vizualizace ano, dispozice a rezervace méně",
    body: `Dobrý den,

vizualizace projektu [Název firmy] vypadají silně, ale dispozice, ceník jednotek a další krok (rezervace / schůzka) jsou méně průchozí. U developmentu se zájem ztrácí přesně v tomhle bodě.

Dělám weby pro developery tak, aby vizuál prodával a zároveň bylo jasné, co je volné a jak se ozvat.

Máte chuť to krátce projít? Stačí odpovědět a domluvíme se na krátkém hovoru příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 20,
    industry: "Pojištění / finanční poradce",
    tags: ["finance"],
    subject: "osobní stránka, co nevede ke konzultaci",
    body: `Dobrý den,

web [Název firmy] představuje vás jako poradce, ale cesta k nezávazné konzultaci / kalendáři není dost vidět. U financí lidi potřebují důvěru a jasný další krok, jinak odejdou ke známější značce.

Umím weby pro poradce postavit tak, aby osobní značka seděla a první kontakt byl jednoduchý.

Když budete mít zájem, rád se na to podívám s vámi. Vyhovoval by vám krátký hovor příští týden?

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 21,
    industry: "Optika / lékárna",
    tags: ["healthcare"],
    subject: "objednání na měření zraku z mobilu",
    body: `Dobrý den,

na webu [Název firmy] jsou služby přehledné, ale objednání (měření zraku / vyzvednutí) z mobilu není první věc, co člověk uvidí. Klient to řeší cestou, když to nejde hned, zvolí pobočku o blok dál.

Pomáhám optikám a odborným provozovnám s weby, které usnadní objednání i navigaci k vám.

Chcete tipy přímo k vašemu webu? Napište a ozvu se, případně si můžeme příští týden zavolat.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 22,
    industry: "Veterinární klinika",
    tags: ["healthcare"],
    subject: "pohotovostní kontakt, co musí být hned nahoře",
    body: `Dobrý den,

u [Název firmy] je na webu hezký tým a vybavení, ale pohotovostní / rychlý kontakt není natolik výrazný, jak by v nouzi měl být. Páníček ve stresu nečte odstavce, hledá číslo a adresu.

Dělám weby pro veteriny tak, aby působily klidně a zároveň v krizovém momentu nezdržovaly.

Když budete chtít, projdu to s vámi konkrétně, napište jen, jestli máte zájem a můžeme si domluvit krátký hovor na příští týden.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 23,
    industry: "Fotograf / studio / eventy",
    tags: ["marketing"],
    subject: "portfolio zaslouží jednodušší cestu k termínu",
    body: `Dobrý den,

portfolio na webu [Název firmy] je silné, ale ceník a rezervace termínu jsou oddělené od galerie. Lidi se rozhodují podle fotek, když musí hledat, jak vás objednat, jdou k jinému studiu.

Umím weby pro fotografy a eventy udělat tak, aby práce vynikla a termín šel domluvit hned vedle ní.

Hodilo by se vám to? Ozvěte se a podíváme se na to spolu.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 24,
    industry: "Čistírna / úklid / facility",
    tags: [],
    subject: "poptávka úklidu by měla jít odeslat hned",
    body: `Dobrý den,

web [Název firmy] popisuje služby, ale formulář poptávky (typ objektu / frekvence) není dost výrazný. U facility zákazník porovnává rychle, vyhraje ten, komu jde napsat nejdřív.

Pomáhám úklidovým firmám s weby, které ukážou zkušenost a zároveň zkrátí cestu k první poptávce.

Když budete mít chuť, napište, připravím 2 konkrétní body k vašemu webu.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
  {
    id: 25,
    industry: "Obchod / showroom / retail",
    tags: ["retail"],
    subject: "z webu na prodejnu, chybí jasný důvod přijít",
    body: `Dobrý den,

u [Název firmy] web ukazuje sortiment, ale méně tlačí to, co člověk uvidí jen naživo (showroom, výdej, konzultace) a jak se k vám snadno dostane. Pak návštěvník webu často skončí u eshopu konkurence.

Dělám weby pro retail a showroomy tak, aby sortiment seděl a cesta na pobočku byla jasná.

Máte chuť to krátce projít? Stačí odpovědět a domluvíme se.

S pozdravem,
Jan Sedlář za tým Sklyvo`,
  },
];

/** Najde ukázky podle tagu (např. fitka, gastro). */
export function findGoldEmailsByTag(tag: string): SniperGoldEmailExample[] {
  const t = tag.trim().toLowerCase();
  if (!t) return [];
  return SNIPER_GOLD_EMAIL_EXAMPLES.filter((e) => e.tags.includes(t));
}

/** Segment Sniperu → tagy gold banky. */
const SEGMENT_TO_GOLD_TAGS: Record<string, string[]> = {
  healthcare: ["healthcare"],
  legal: ["legal"],
  gastro: ["gastro"],
  ecommerce: ["ecommerce", "retail"],
  reality: ["reality"],
  finance: ["finance"],
  logistics: ["logistics"],
  production: ["production"],
  b2b_saas: ["it_web"],
  marketing: ["marketing"],
  hotel: ["hotel"],
};

/**
 * Odhad tagů pro výběr gold mailů z textu webu / segmentu / názvu.
 * Používá stejné patterny jako lead-tags (fitka, gastro, …).
 */
export function resolveGoldEmailTags(input: {
  websiteText?: string | null;
  companyLabel?: string | null;
  segment?: string | null;
  extraTags?: string[] | null;
}): string[] {
  const tags = new Set<string>();
  for (const t of input.extraTags ?? []) {
    const x = t.trim().toLowerCase();
    if (x) tags.add(x);
  }
  const seg = (input.segment ?? "").trim().toLowerCase();
  for (const t of SEGMENT_TO_GOLD_TAGS[seg] ?? []) tags.add(t);

  const blob = [input.companyLabel, input.websiteText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (blob) {
    const rules: Array<[string, RegExp]> = [
      ["fitka", /\b(fitka|fitness|fitnes|gym|posilovn|crossfit|bodybuilding|workout)\b/],
      ["wellness", /\b(wellness|spa\b|sauna|masaz|lazne)\b/],
      ["sport", /\b(tenis|squash|plaveck|bazen|yoga|joga|pilates)\b/],
      ["gastro", /\b(restaurace|kavarna|bistro|hospoda|pizzerie|gastro|jideln)\b/],
      ["healthcare", /\b(ordinace|klinik|lekar|zubar|stomatolog|fyzioter|nemocnic|veterinar|optika|lekarna)\b/],
      ["legal", /\b(advokat|pravni|notar|advokacie)\b/],
      ["ecommerce", /\b(e-?shop|eshop|kosik|doprava zdarma)\b/],
      ["reality", /\b(reality|nemovitost|developersk|pronajem)\b/],
      ["finance", /\b(ucetni|ucetnictvi|danov|pojistov|financni porad)\b/],
      ["logistics", /\b(logistik|doprav|spedice|sklad)\b/],
      ["production", /\b(vyrob|prumysl|strojiren|\bcnc\b)\b/],
      ["marketing", /\b(marketing|ppc|seo agentur|reklamn)\b/],
      ["it_web", /\b(software|saas|vyvoj softwar|programovan|it firma)\b/],
      ["beauty", /\b(kadernictvi|kosmetik|beauty|nehtova)\b/],
      ["auto", /\b(autoservis|pneuservis|autoservis|autodíln)\b/],
      ["education", /\b(jazykovk|kurz|skoleni|vzdelavan|univerzit)\b/],
      ["hotel", /\b(hotel|penzion|ubytovan|apartman)\b/],
      ["retail", /\b(showroom|prodejna|kamenn[aá]|retail)\b/],
      ["construction", /\b(stavebn|rekonstrukc|instalater|strech|truhlar)\b/],
    ];
    for (const [tag, re] of rules) {
      if (re.test(blob)) tags.add(tag);
    }
  }

  return Array.from(tags);
}

/** Vrátí 1 až 3 ukázky pro few-shot (preferuj tag match, jinak mix). */
export function pickGoldEmailsForPrompt(opts: {
  tags?: string[];
  limit?: number;
}): SniperGoldEmailExample[] {
  const limit = opts.limit ?? 3;
  const tags = (opts.tags ?? []).map((t) => t.toLowerCase());
  const matched = SNIPER_GOLD_EMAIL_EXAMPLES.filter((e) =>
    e.tags.some((t) => tags.includes(t)),
  );
  if (matched.length >= limit) return matched.slice(0, limit);
  const rest = SNIPER_GOLD_EMAIL_EXAMPLES.filter((e) => !matched.includes(e));
  return [...matched, ...rest].slice(0, limit);
}

/** Odřízne ukázkový podpis — v promptu má model použít podpis odesílatele. */
function stripExampleSignature(body: string): string {
  return body
    .replace(/\n*S pozdravem,?\s*\n[\s\S]*$/i, "")
    .replace(/\n*Přeji hezký den,?\s*\n[\s\S]*$/i, "")
    .replace(/\n*S úctou,?\s*\n[\s\S]*$/i, "")
    .trim();
}

/** Placeholder firmy → přirozená čeština (ne „na webu váš web“). */
function replaceFirmPlaceholder(body: string): string {
  return body
    .replace(/\bna webu \[Název firmy\]/gi, "na vašem webu")
    .replace(/\bprocházel jsem web \[Název firmy\]/gi, "procházel jsem váš web")
    .replace(/\bprocházel jsem \[Název firmy\]/gi, "procházel jsem váš web")
    .replace(/\bdíval jsem se na eshop \[Název firmy\]/gi, "díval jsem se na váš eshop")
    .replace(/\bu eshopu \[Název firmy\]/gi, "u vašeho eshopu")
    .replace(/\bweb \[Název firmy\]/gi, "váš web")
    .replace(/\bu \[Název firmy\]/gi, "u vás")
    .replace(/\b\[Název firmy\]/gi, "váš web");
}

/**
 * Nouzový draft při nedostupné Gemini API (kvóta / 429).
 * Bere nejbližší gold ukázku podle oboru — styl OK, bez AI faktů z webu.
 * Bez podpisu a bez doplňovaného druhého CTA (podpis doplní generate z nastavení).
 */
export function buildGoldQuotaFallbackDraft(opts: {
  websiteText?: string | null;
  companyLabel?: string | null;
  segment?: string | null;
  extraTags?: string[] | null;
}): {
  industry: string;
  tags: string[];
  osloveni: string;
  subject: string;
  /** Tělo bez pozdravu; bez podpisu (doplní generate). */
  body: string;
  analysis: string;
} {
  const tags = resolveGoldEmailTags({
    websiteText: opts.websiteText,
    companyLabel: opts.companyLabel,
    segment: opts.segment,
    extraTags: opts.extraTags,
  });
  const picked = pickGoldEmailsForPrompt({ tags, limit: 1 });
  const ex = picked[0] ?? SNIPER_GOLD_EMAIL_EXAMPLES[0]!;

  let raw = replaceFirmPlaceholder(ex.body);

  let osloveni = "Dobrý den,";
  const greet = /^(Dobrý den[^\n]*),?\s*\n+/i.exec(raw);
  if (greet) {
    osloveni = greet[1]!.trim().endsWith(",") ? greet[1]!.trim() : `${greet[1]!.trim()},`;
    raw = raw.slice(greet[0].length);
  }

  const body = stripExampleSignature(raw);

  const tagHint = tags.length > 0 ? tags.join(", ") : "obecný B2B";
  return {
    industry: ex.industry,
    tags,
    osloveni,
    subject: ex.subject,
    body,
    analysis: `Offline návrh ze šablony oboru „${ex.industry}“ (tagy: ${tagHint}). Gemini API není dostupná (kvóta) — text není personalizovaný z webu; před odesláním upravte fakta.`,
  };
}

/**
 * Blok do user promptu: 1–3 gold maily podle oboru.
 * Inspirace tónem/strukturou — zákaz kopírování a zákaz pomlček.
 */
export function buildGoldEmailFewShotBlock(opts: {
  websiteText?: string | null;
  companyLabel?: string | null;
  segment?: string | null;
  extraTags?: string[] | null;
  limit?: number;
}): string {
  const tags = resolveGoldEmailTags({
    websiteText: opts.websiteText,
    companyLabel: opts.companyLabel,
    segment: opts.segment,
    extraTags: opts.extraTags,
  });
  const examples = pickGoldEmailsForPrompt({ tags, limit: opts.limit ?? 2 });
  if (examples.length === 0) return "";

  const tagHint = tags.length > 0 ? tags.join(", ") : "obecný B2B";
  const parts: string[] = [
    "",
    "UKÁZKY STYLU PRO PODOBNÝ OBOR (few-shot):",
    `Detekované tagy oboru: ${tagHint}.`,
    "Inspiruj se tónem, strukturou a konkrétností. NEKOPÍRUJ věty ani fiktivní detaily.",
    "Přepiš podle REÁLNÝCH faktů z webu klienta výše. Žádné pomlčky. 1. osoba jednotného čísla.",
    "Předměty v ukázkách jsou jen tón — vygeneruj vlastní 3 až 4 předměty podle schématu.",
    "Podpis v ukázkách ignoruj — do těla ho nevkládej (systém připojí podpis z nastavení).",
  ];

  examples.forEach((ex, i) => {
    parts.push("");
    parts.push(`--- Ukázka ${i + 1}: ${ex.industry} ---`);
    parts.push(`(příklad tónu předmětu: ${ex.subject})`);
    parts.push(stripExampleSignature(ex.body));
  });

  return parts.join("\n");
}
