"use server";

import { generateObject } from "ai";
import type { FilePart, TextPart } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/actions/auth";
import { SNIPER_AUTODETECT_VALUE } from "@/lib/constants";
import {
  DEFAULT_SNIPER_SYSTEM_PROMPT,
  parseForbiddenWordsFromStoredSystemPrompt,
  parseStoredAiBehaviorSettings,
} from "@/lib/ai-behavior-settings";
import { plainTextToHtml, plainTextToMimeText, appendEmailSignatureIfMissing } from "@/lib/email-format";
import { sendEmail } from "@/app/actions/email";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

/**
 * Model pro Sniper (AI SDK Google). Override: env `SNIPER_GEMINI_MODEL`.
 * Krátký název `gemini-1.5-flash` může u API vracet 404 — používej `-latest` suffix.
 */
const SNIPER_GEMINI_MODEL =
  process.env.SNIPER_GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** Max. délka textu z webu do promptu (horní část stránky). */
const SNIPER_WEB_TEXT_MAX = 3600;

/** Stažené HTML před parsováním — menší = rychlejší čtení odpovědi. */
const SNIPER_FETCH_BODY_MAX = 50_000;

const SNIPER_FETCH_TIMEOUT_MS = 8000;

/** Maximální velikost dekódovaného PDF pro Sniper (ochrana API a server action). */
const SNIPER_PDF_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Vyčistí vstupní base64 / data URL a ověří velikost a hlavičku PDF.
 * @returns čistý base64 bez whitespace, nebo `undefined` při neplatných datech.
 */
function preparePdfBase64ForModel(raw: string): string | undefined {
  let s = raw.trim();
  const dataUrl = /^data:application\/pdf[^,]*base64,(.+)$/i.exec(s);
  if (dataUrl) s = dataUrl[1];
  s = s.replace(/\s/g, "");
  if (!s) return undefined;
  let buf: Buffer;
  try {
    buf = Buffer.from(s, "base64");
  } catch {
    return undefined;
  }
  if (buf.length < 5 || buf.length > SNIPER_PDF_MAX_BYTES) return undefined;
  if (buf.slice(0, 5).toString("ascii") !== "%PDF-") return undefined;
  return s;
}

/** Zakázaná slova a fráze (sjednoceno s instrukcí pro model). */
const FORBIDDEN_SUBSTRINGS = [
  "synergie",
  "namontujeme",
  "komplexní řešení",
  "inovativní",
  "posunout na další úroveň",
  "odemykat potenciál",
  "v digitální době",
  "v dnešní digitální",
  "digitální vizitka",
  "vizitkou vaší",
  "online důvěryhodnost",
] as const;

/** Typické „AI“ závěry — nesmí se objevit v těle ani v předmětu. */
const BANNED_CHEESY_PHRASES = [
  "mám pro vás rychlou myšlenku",
  "mám pro vás rychlou myšlenku k probrání",
  "budu se těšit na odpověď",
  "pojďme se spojit",
  "pojďme se spojit na krátký hovor",
  "v dnešní době",
  "v digitální době",
  "silná digitální přítomnost",
  "digitální přítomnost",
  "online vizitka",
  "vizitkou ordinace",
  "zvýšit důvěryhodnost",
] as const;

/** Prázdné ledoborce — první věta musí být konkrétní detail z webu, ne obecná chvála. */
const BANNED_GENERIC_ICEBREAKERS = [
  "zaujal mě váš web",
  "zaujal mě váš přístup",
  "zaujal mě váš obsah",
  "prošel jsem váš web a zaujalo mě",
  "na vašem webu mě zaujalo, jak srozumitelně",
  "pár postřehů k vašemu webu",
  "všiml jsem si vašeho webu",
  "narazil jsem na váš web",
] as const;

/** Min./max. počet odstavců v těle e-mailu (včetně rozloučení s podpisem). */
const SNIPER_EMAIL_PARAGRAPHS_MIN = 3;
const SNIPER_EMAIL_PARAGRAPHS_MAX = 4;

const DASH_REGEX = /[-‐‑‒–—―]/;

/** Počet variant předmětu v jedné odpovědi Sniperu. */
const SNIPER_SUBJECT_VARIANTS_MIN = 3;
const SNIPER_SUBJECT_VARIANTS_MAX = 4;
/** Délka jednoho předmětu ve slovech (zvědavostní věty, ne suchá klíčová slova). */
const SNIPER_SUBJECT_MIN_WORDS = 3;
const SNIPER_SUBJECT_MAX_WORDS = 7;

/** Povolené klíče pro detekci parametrů z analýzy webu (musí sedět s UI selecty). */
const SNIPER_DETECTED_SEGMENTS = [
  "b2b_saas",
  "ecommerce",
  "production",
  "reality",
  "finance",
  "healthcare",
  "logistics",
  "legal",
  "gastro",
] as const;
const SNIPER_DETECTED_TONES = [
  "friendly",
  "professional",
  "assertive",
  "nobullshit",
  "educational",
  "technical",
] as const;
const SNIPER_DETECTED_LANGUAGES = [
  "cs",
  "sk",
  "en",
  "de",
  "es",
  "ru",
  "fr",
  "pl",
  "it",
  "nl",
] as const;

const sniperEmailOutputSchema = z.object({
  contact_email: z.string().nullable(),
  contact_phone: z.string().nullable(),
  osloveni: z.string().min(1),
  analyza_klienta: z.string().min(1),
  vygenerovane_predmety: z
    .array(z.string().min(1))
    .min(SNIPER_SUBJECT_VARIANTS_MIN)
    .max(SNIPER_SUBJECT_VARIANTS_MAX)
    .describe("Pole 3 až 4 různých předmětů e-mailu"),
  vygenerovany_email: z.string().min(1),
  detekovany_segment: z
    .enum(SNIPER_DETECTED_SEGMENTS)
    .nullable()
    .optional()
    .describe("Segment klienta detekovaný z webu (jeden z povolených klíčů)."),
  detekovany_ton: z
    .enum(SNIPER_DETECTED_TONES)
    .nullable()
    .optional()
    .describe("Nejvhodnější tón komunikace pro tohoto klienta."),
  detekovany_jazyk: z
    .enum(SNIPER_DETECTED_LANGUAGES)
    .nullable()
    .optional()
    .describe("Jazyk webu klienta (jeden z povolených kódů)."),
});

const emailSubjectsSchema = z.object({
  subjects: z
    .array(z.string().min(1))
    .length(3)
    .refine(
      (arr) =>
        arr.every((s) => {
          const words = s.trim().split(/\s+/).filter(Boolean).length;
          return words >= SNIPER_SUBJECT_MIN_WORDS && words <= SNIPER_SUBJECT_MAX_WORDS;
        }),
      `Každý předmět musí mít ${SNIPER_SUBJECT_MIN_WORDS}–${SNIPER_SUBJECT_MAX_WORDS} slov.`,
    ),
});

export type GenerateEmailParams = {
  targetUrl: string;
  /** Služba z workspace.offeredServices (zaměření této zprávy) */
  selectedOfferedService: string;
  language: string;
  tone: string;
  segment: string;
  /** Base64 PDF (bez prefixu data URL), volitelný kontext pro Gemini. */
  pdfData?: string;
};

type SniperWorkspaceContext = {
  /** Profil firmy (companyContext) + základní obory + fallback. */
  companyContext: string;
  /** Podrobný text z companyServices (znalostní báze pro autodetekci). */
  companyServices: string;
  emailSignature: string;
  systemPrompt: string;
  forbiddenWords: string[];
};

function buildEffectiveForbiddenWords(customWords: string[]): string[] {
  const merged = [...FORBIDDEN_SUBSTRINGS, ...customWords.map((w) => w.toLowerCase())];
  return Array.from(new Set(merged));
}

function normalizeOfferedServicesList(list: string[] | null | undefined) {
  return Array.from(new Set((list ?? []).map((s) => String(s).trim()).filter(Boolean)));
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Syrová doména / URL v textu (tělo, oslovení, předmět). */
function textContainsRawDomain(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/https?:\/\//i.test(t)) return true;
  return /\b[a-z0-9][a-z0-9-]{1,63}\.(?:cz|com|sk|eu|io|net|org|app|legal|pl|de|uk|ch|at|be|fr|it|nl|info|biz|gov|edu|cloud|tech|store|shop|blog|site|dev|ai|co|global|online|world)(?=$|[\s,?!.:;„"')]|[^\w.-])/i.test(
    t,
  );
}

/** Odvození firmy odesílatele z e-mailové domény (např. „Jan z Postu“). */
function textDerivesSenderFromEmailDomain(text: string): boolean {
  const lowered = text.toLowerCase();
  return /\b(?:jsem|jsme)\s+(?:z|ze)\s+(?:postu|seznamu|gmailu|google|outlooku|microsoftu|icloud|yahoo)\b/i.test(
    lowered,
  );
}

function countEmailParagraphs(text: string): number {
  return text
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean).length;
}

/** Zakázaná slovní spojení a „AI“ fráze (pomlčky řešíme samostatně auto-korekcí). */
function textHasForbiddenLexicon(text: string) {
  const lowered = text.toLowerCase();
  if (FORBIDDEN_SUBSTRINGS.some((word) => lowered.includes(word))) return true;
  if (BANNED_CHEESY_PHRASES.some((phrase) => lowered.includes(phrase))) return true;
  if (BANNED_GENERIC_ICEBREAKERS.some((phrase) => lowered.includes(phrase))) return true;
  return false;
}

function truncateToMaxWords(text: string, maxWords: number): string {
  const w = text.trim().split(/\s+/).filter(Boolean);
  return w.slice(0, maxWords).join(" ");
}

function subjectLineWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Syrová doména / URL v předmětu působí roboticky (např. macek.legal, neco.cz). */
function subjectLineContainsRawDomain(text: string): boolean {
  return textContainsRawDomain(text);
}

/** Předmět má vypadat jako rychlá zpráva z mobilu — začátek malým písmenem. */
function lowercaseFirstLetterSubject(s: string): string {
  const t = s.trim();
  if (!t) return t;
  const chars = [...t];
  const first = chars[0];
  if (!first) return t;
  return first.toLocaleLowerCase("cs-CZ") + chars.slice(1).join("");
}

/** Unikátní 3–4 předměty; doplní obecné varianty, pokud AI vrátilo málo. */
function ensureVygenerovanePredmetyCount(subjects: string[], nabizenaSluzba: string): string[] {
  const capped = subjects.slice(0, SNIPER_SUBJECT_VARIANTS_MAX);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of capped) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
    if (out.length >= SNIPER_SUBJECT_VARIANTS_MAX) break;
  }
  const nabizena = nabizenaSluzba.trim() || "vaše nabídka online";
  const defaults = [
    truncateToMaxWords("dotaz k tomu co píšete na webu", SNIPER_SUBJECT_MAX_WORDS),
    truncateToMaxWords("rychlý dotaz k vaší praxi online", SNIPER_SUBJECT_MAX_WORDS),
    truncateToMaxWords(`rychlý dotaz k ${nabizena} podle toho co máte na webu`, SNIPER_SUBJECT_MAX_WORDS),
    truncateToMaxWords("měl bych krátký dotaz k vašim službám z webu", SNIPER_SUBJECT_MAX_WORDS),
  ];
  for (const d of defaults) {
    if (out.length >= SNIPER_SUBJECT_VARIANTS_MIN) break;
    const k = d.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(d);
    }
  }
  while (out.length < SNIPER_SUBJECT_VARIANTS_MIN) {
    out.push("dotaz k vašemu webu");
  }
  return out.slice(0, SNIPER_SUBJECT_VARIANTS_MAX);
}

/** Oddělí a zformátuje podpis: vždy na vlastním bloku, jméno na dalším řádku. */
function formatClosingSignatureBlock(block: string): string {
  const cleaned = block.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(S\s+(?:pozdravem|úctou))[,.]?\s*(.*)$/i);
  if (!match) return cleaned;
  const isUctou = /úctou/i.test(match[1] ?? "");
  const greeting = isUctou ? "S úctou," : "S pozdravem,";
  const rest = (match[2] ?? "").trim();
  if (!rest) return greeting;
  return `${greeting}\n${rest}`;
}

/** Nahradí pomlčky mezerou; u těla e-mailu zachová odstavce (oddělené prázdným řádkem). */
function normalizeSniperEmailBody(text: string): string {
  const dashless = text.replace(DASH_REGEX, " ");
  // CTA a podpis nesmí zůstat na jednom řádku
  const separated = dashless
    .replace(/([.!?])\s+(S\s+(?:pozdravem|úctou)\b)/gi, "$1\n\n$2")
    .replace(/(\?)\s+(S\s+(?:pozdravem|úctou)\b)/gi, "$1\n\n$2");

  return separated
    .split(/\n\s*\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^S\s+(?:pozdravem|úctou)\b/i.test(trimmed)) {
        return formatClosingSignatureBlock(trimmed);
      }
      // Pokud je podpis nalepený uprostřed bloku, rozděl
      const glued = trimmed.match(/^(.*?)([.!?])\s+(S\s+(?:pozdravem|úctou)\b[\s\S]*)$/i);
      if (glued?.[1] && glued[2] && glued[3]) {
        return `${glued[1].trim()}${glued[2]}\n\n${formatClosingSignatureBlock(glued[3])}`;
      }
      return trimmed.replace(/[ \t\r\f\v]+/g, " ").replace(/\n+/g, " ").trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function scrubForbiddenLexiconPreservingParagraphs(text: string): string {
  return text
    .split(/\n\s*\n+/)
    .map((block) => scrubForbiddenLexiconFromText(block))
    .filter(Boolean)
    .join("\n\n");
}

/** Nahradí unicode pomlčky mezerou a sjednotí mezery (e-mailové texty, ne nutně telefony v kontaktu). */
function replaceUnicodeDashesWithSpace(text: string): string {
  return text.replace(DASH_REGEX, " ").replace(/\s+/g, " ").trim();
}

function normalizeSniperEmailOutput(
  o: z.infer<typeof sniperEmailOutputSchema>,
  nabizenaSluzba: string,
): z.infer<typeof sniperEmailOutputSchema> {
  const rawList = Array.isArray(o.vygenerovane_predmety) ? o.vygenerovane_predmety : [];
  const cleaned = rawList
    .map((s) =>
      lowercaseFirstLetterSubject(
        replaceUnicodeDashesWithSpace(truncateToMaxWords(String(s).trim(), SNIPER_SUBJECT_MAX_WORDS)),
      ),
    )
    .filter((s) => s.length > 0);
  const vygenerovane_predmety = ensureVygenerovanePredmetyCount(cleaned, nabizenaSluzba);
  return {
    ...o,
    osloveni: replaceUnicodeDashesWithSpace(o.osloveni),
    analyza_klienta: replaceUnicodeDashesWithSpace(o.analyza_klienta),
    vygenerovane_predmety,
    vygenerovany_email: normalizeSniperEmailBody(o.vygenerovany_email),
  };
}

function sniperOutputViolatesForbiddenOnly(o: z.infer<typeof sniperEmailOutputSchema>): boolean {
  if (
    o.vygenerovane_predmety.length < SNIPER_SUBJECT_VARIANTS_MIN ||
    o.vygenerovane_predmety.length > SNIPER_SUBJECT_VARIANTS_MAX
  ) {
    return true;
  }
  for (const s of o.vygenerovane_predmety) {
    const wc = subjectLineWordCount(s);
    if (wc < SNIPER_SUBJECT_MIN_WORDS || wc > SNIPER_SUBJECT_MAX_WORDS) return true;
    if (textHasForbiddenLexicon(s)) return true;
    if (subjectLineContainsRawDomain(s)) return true;
  }
  if (textContainsRawDomain(o.vygenerovany_email)) return true;
  if (textContainsRawDomain(o.osloveni)) return true;
  if (textDerivesSenderFromEmailDomain(o.vygenerovany_email)) return true;
  const paragraphCount = countEmailParagraphs(o.vygenerovany_email);
  if (
    paragraphCount < SNIPER_EMAIL_PARAGRAPHS_MIN ||
    paragraphCount > SNIPER_EMAIL_PARAGRAPHS_MAX
  ) {
    return true;
  }
  const parts = [o.osloveni, o.analyza_klienta, o.vygenerovany_email];
  return parts.some((p) => p && textHasForbiddenLexicon(p));
}

function scrubForbiddenLexiconFromText(text: string): string {
  let t = text;
  for (const phrase of BANNED_CHEESY_PHRASES) {
    t = t.replace(new RegExp(escapeRegExp(phrase), "gi"), " ");
  }
  for (const phrase of BANNED_GENERIC_ICEBREAKERS) {
    t = t.replace(new RegExp(escapeRegExp(phrase), "gi"), " ");
  }
  for (const word of FORBIDDEN_SUBSTRINGS) {
    t = t.replace(new RegExp(escapeRegExp(word), "gi"), " ");
  }
  return t.replace(/\s+/g, " ").trim();
}

function finalizeSniperEmailOutput(
  o: z.infer<typeof sniperEmailOutputSchema>,
  nabizenaSluzba: string,
  authorFullName: string,
): z.infer<typeof sniperEmailOutputSchema> {
  const base = normalizeSniperEmailOutput(o, nabizenaSluzba);
  const scrub = (s: string, emptyFallback: string) => {
    const x = scrubForbiddenLexiconFromText(s);
    return x.length > 0 ? x : emptyFallback;
  };
  const predmetyFb = [
    truncateToMaxWords("dotaz k tomu co píšete na webu", SNIPER_SUBJECT_MAX_WORDS),
    truncateToMaxWords("rychlý dotaz k vaší praxi online", SNIPER_SUBJECT_MAX_WORDS),
    truncateToMaxWords(
      `rychlý dotaz k ${nabizenaSluzba.trim() || "vaší nabídce"} podle vašeho webu`,
      SNIPER_SUBJECT_MAX_WORDS,
    ),
    truncateToMaxWords("měl bych dotaz k vašim službám zobrazeným na webu", SNIPER_SUBJECT_MAX_WORDS),
  ];
  const scrubbedSubjects = base.vygenerovane_predmety.map((s, i) =>
    lowercaseFirstLetterSubject(
      truncateToMaxWords(scrub(s, predmetyFb[i] ?? predmetyFb[0]!), SNIPER_SUBJECT_MAX_WORDS),
    ),
  );
  const vygenerovane_predmety = ensureVygenerovanePredmetyCount(scrubbedSubjects, nabizenaSluzba);
  return {
    contact_email: base.contact_email,
    contact_phone: base.contact_phone,
    osloveni: scrub(base.osloveni, "Dobrý den,"),
    analyza_klienta: scrub(base.analyza_klienta, "Shrnutí z outreachu doplňte ručně v CRM."),
    vygenerovane_predmety,
    vygenerovany_email: (() => {
      const x = scrubForbiddenLexiconPreservingParagraphs(base.vygenerovany_email);
      return x.length > 0
        ? x
        : [
            "Na webu jasně ukazujete, komu pomáháte, a právě to mě přimělo napsat.",
            `U podobných firem často pomáháme s tím, aby se k vám dostali dřív relevantní zájemci kolem ${nabizenaSluzba.trim() || "naší práce"}.`,
            "Měli byste příští týden deset minut na krátký hovor? Stačí napsat, co vám sedí.",
            `S pozdravem,\n${authorFullName.trim() || "Váš kontakt"}`,
          ].join("\n\n");
    })(),
  };
}

function minimalFallbackSniperEmail(
  clientSiteLabel: string,
  nabizenaSluzba: string,
  authorFullName: string,
): z.infer<typeof sniperEmailOutputSchema> {
  const nab = nabizenaSluzba.trim() || "vaše online nabídka";
  const sign = authorFullName.trim() || "Váš kontakt";
  return {
    contact_email: null,
    contact_phone: null,
    osloveni: "Dobrý den,",
    analyza_klienta: `Firma ${clientSiteLabel} z outreachu.`,
    vygenerovane_predmety: ensureVygenerovanePredmetyCount(
      [
        lowercaseFirstLetterSubject(
          truncateToMaxWords("dotaz k tomu co píšete na webu", SNIPER_SUBJECT_MAX_WORDS),
        ),
        lowercaseFirstLetterSubject(
          truncateToMaxWords("rychlý dotaz k vaší praxi online", SNIPER_SUBJECT_MAX_WORDS),
        ),
        lowercaseFirstLetterSubject(
          truncateToMaxWords(`rychlý dotaz k ${nab} podle toho co píšete na webu`, SNIPER_SUBJECT_MAX_WORDS),
        ),
        lowercaseFirstLetterSubject(
          truncateToMaxWords(
            `měl bych krátký dotaz k vašim službám zobrazeným online`,
            SNIPER_SUBJECT_MAX_WORDS,
          ),
        ),
      ],
      nabizenaSluzba,
    ),
    vygenerovany_email: [
      "Na webu jasně ukazujete, komu pomáháte a jak u vás péče vypadá, a právě to mě přimělo napsat.",
      `U podobných praxí často pomáháme s tím, aby web líp přivedl relevantní zájemce k ${nab}, bez zbytečné vaty a dlouhých úprav.`,
      "Měli byste příští týden deset minut na krátký hovor? Stačí napsat, co vám sedí.",
      `S pozdravem,\n${sign}`,
    ].join("\n\n"),
  };
}

function normalizeEmailSubjectsOutput(o: z.infer<typeof emailSubjectsSchema>): z.infer<typeof emailSubjectsSchema> {
  return {
    subjects: o.subjects.map((s) =>
      lowercaseFirstLetterSubject(
        replaceUnicodeDashesWithSpace(truncateToMaxWords(s, SNIPER_SUBJECT_MAX_WORDS)),
      ),
    ) as [string, string, string],
  };
}

function subjectsViolateForbiddenOnly(o: z.infer<typeof emailSubjectsSchema>): boolean {
  for (const s of o.subjects) {
    const w = subjectLineWordCount(s);
    if (w < SNIPER_SUBJECT_MIN_WORDS || w > SNIPER_SUBJECT_MAX_WORDS) return true;
    if (textHasForbiddenLexicon(s)) return true;
    if (subjectLineContainsRawDomain(s)) return true;
  }
  return false;
}

function finalizeEmailSubjectsOutput(o: z.infer<typeof emailSubjectsSchema>): z.infer<typeof emailSubjectsSchema> {
  const fallbacks = [
    truncateToMaxWords("dotaz k tomu co píšete na webu", SNIPER_SUBJECT_MAX_WORDS),
    truncateToMaxWords("rychlý dotaz k vaší praxi online", SNIPER_SUBJECT_MAX_WORDS),
    truncateToMaxWords("rychlý dotaz k vašim službám z webu", SNIPER_SUBJECT_MAX_WORDS),
  ].map((s) => lowercaseFirstLetterSubject(s));
  const scrubbed = o.subjects.map((s, i) => {
    const cleaned = scrubForbiddenLexiconFromText(replaceUnicodeDashesWithSpace(s));
    const t = cleaned.length > 0 ? cleaned : fallbacks[i] ?? fallbacks[0]!;
    return lowercaseFirstLetterSubject(truncateToMaxWords(t, SNIPER_SUBJECT_MAX_WORDS));
  });
  return {
    subjects: [scrubbed[0]!, scrubbed[1]!, scrubbed[2]!],
  };
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "0.0.0.0" || h === "[::1]" || h === "::1") return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  const m = /^172\.(\d+)\.\d+\.\d+$/.exec(h);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  if (h.startsWith("169.254.")) return true;
  return false;
}

/**
 * Odlehčené stažení stránky: pouze fetch + odstranění tagů (žádný Puppeteer).
 * Výstup oříznutý na SNIPER_WEB_TEXT_MAX znaků před odesláním do LLM.
 */
async function fetchClientWebsiteSnippet(urlRaw: string): Promise<string> {
  const raw = urlRaw.trim();
  if (!raw) {
    return "(URL nebyla zadána.)";
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withProtocol);
  } catch {
    return "(Neplatná URL — nelze načíst obsah.)";
  }
  if (!["http:", "https:"].includes(u.protocol)) {
    return "(Nepovolený protokol.)";
  }
  if (isBlockedHostname(u.hostname)) {
    return "(Interní nebo nepovolená adresa — obsah nestahujeme.)";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SNIPER_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(u.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "VenegardSniper/2.0 (contact: support)",
        Accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
      },
    });
    if (!res.ok) {
      return `(Stažení stránky selhalo: HTTP ${res.status}.)`;
    }
    const buf = (await res.text()).slice(0, SNIPER_FETCH_BODY_MAX);
    const text = buf
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, SNIPER_WEB_TEXT_MAX);
    return text.length > 0 ? text : "(Stránka neobsahovala čitelný text.)";
  } catch {
    return "(Obsah stránky se nepodařilo načíst — pracuj jen s informacemi z URL a názvu domény. NEVYMÝŠLEJ SaaS ani jiný obor, pokud z URL jasně neplyne.)";
  } finally {
    clearTimeout(timer);
  }
}

async function loadSniperWorkspaceContext(workspaceId: string): Promise<SniperWorkspaceContext> {
  const [workspace, services] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        companyName: true,
        industry: true,
        targetAudience: true,
        defaultTone: true,
        companyContext: true,
        companyServices: true,
        offeredServices: true,
        emailSignature: true,
        systemPrompt: true,
      },
    }),
    prisma.service.findMany({
      where: { workspaceId },
      select: { name: true, description: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const offered = normalizeOfferedServicesList(workspace?.offeredServices ?? []);
  const companyServices = (workspace?.companyServices ?? "").trim().slice(0, 8000);
  const parsedPrompt = parseStoredAiBehaviorSettings(workspace?.systemPrompt);
  const aiSettings = {
    emailSignature: (workspace?.emailSignature ?? "").trim(),
    systemPrompt: parsedPrompt.systemPrompt,
    forbiddenWords: parseForbiddenWordsFromStoredSystemPrompt(workspace?.systemPrompt),
  };

  const profileParts: string[] = [];
  if (workspace?.companyContext?.trim()) {
    profileParts.push(workspace.companyContext.trim());
  }
  if (offered.length > 0) {
    profileParts.push(`Základní obory služeb: ${offered.join(", ")}`);
  }

  if (profileParts.length > 0 || companyServices) {
    return {
      companyContext:
        profileParts.length > 0
          ? profileParts.join("\n\n").slice(0, 8000)
          : "(Profil firmy zatím není podrobně vyplněn — vycházej z popisu služeb níže.)",
      companyServices,
      ...aiSettings,
    };
  }

  const companyName =
    workspace?.companyName?.trim() ||
    workspace?.name?.trim() ||
    "Vaše firma";

  const fallbackParts: string[] = [`Název firmy: ${companyName}`];

  if (services.length > 0) {
    fallbackParts.push(
      "Nabízené služby:",
      ...services.map((s) => {
        const desc = (s.description ?? "").trim().replace(/\s+/g, " ").slice(0, 400);
        return desc ? `- ${s.name}: ${desc}` : `- ${s.name}`;
      }),
    );
  } else if (offered.length > 0) {
    fallbackParts.push("Nabízené služby:", ...offered.map((n) => `- ${n}`));
  }

  if (workspace?.industry?.trim()) {
    fallbackParts.push(`Odvětví / focus: ${workspace.industry.trim()}`);
  }
  if (workspace?.targetAudience?.trim()) {
    fallbackParts.push(`Cílová skupina: ${workspace.targetAudience.trim()}`);
  }
  if (workspace?.defaultTone?.trim()) {
    fallbackParts.push(`Preferovaný tón značky: ${workspace.defaultTone.trim()}`);
  }

  const companyContext =
    fallbackParts.length > 1
      ? fallbackParts.join("\n")
      : "(Profil firmy zatím není vyplněn. V e-mailu buď stručná a vycházej z nabízené služby v uživatelské zprávě.)";

  return { companyContext, companyServices: "", ...aiSettings };
}

type SniperAuthorContext = {
  fullName: string;
  firstName: string;
};

function clientSiteLabelFromUrl(urlRaw: string): string {
  const raw = urlRaw.trim();
  if (!raw) return "jejich web";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, "") || "jejich web";
  } catch {
    return "jejich web";
  }
}

/** Heuristika segmentu z textu webu — přebije špatnou LLM detekci (např. SaaS u ordinace). */
function inferSegmentFromWebsiteText(
  text: string,
): (typeof SNIPER_DETECTED_SEGMENTS)[number] | null {
  const t = text.toLowerCase();
  if (
    /gynekolog|ordinace|klinik|lékař|lekar|pacient|zdravot|dentist|stomatolog|fyzioter|nemocnic|porodn|ultrazvuk|ambulance/.test(
      t,
    )
  ) {
    return "healthcare";
  }
  if (/advokát|advokat|právn|pravn|notář|notar|advokacie|\.legal\b/.test(t)) {
    return "legal";
  }
  if (/restaurace|kavárna|kavarna|bistro|hospoda|menu|gastro|pizzerie|cukrárna/.test(t)) {
    return "gastro";
  }
  if (/e-?shop|eshop|košík|kosik|doprava zdarma/.test(t)) {
    return "ecommerce";
  }
  if (/reality|nemovitost|byt[yu]|developersk|pronájem|pronajem/.test(t)) {
    return "reality";
  }
  if (/účetní|ucetni|danov|hypote|pojišťov|pojistov/.test(t)) {
    return "finance";
  }
  if (/logistik|doprav|spedice|skladován|skladovan|zásilk|zasilk/.test(t)) {
    return "logistics";
  }
  if (/výrob|vyrob|průmysl|prumysl|strojíren|strojiren|\bcnc\b/.test(t)) {
    return "production";
  }
  if (/\bsaas\b|b2b software|cloud platform|subscription software/.test(t)) {
    return "b2b_saas";
  }
  return null;
}

function resolveDetectedSegment(
  websiteText: string,
  modelSegment: string | null | undefined,
): (typeof SNIPER_DETECTED_SEGMENTS)[number] | null {
  const inferred = inferSegmentFromWebsiteText(websiteText);
  if (inferred) return inferred;
  if (
    modelSegment &&
    (SNIPER_DETECTED_SEGMENTS as readonly string[]).includes(modelSegment)
  ) {
    return modelSegment as (typeof SNIPER_DETECTED_SEGMENTS)[number];
  }
  return null;
}

function getAuthorFromSession(session: Awaited<ReturnType<typeof getSessionUser>>): SniperAuthorContext {
  const u = session.user;
  if (!u) {
    return { fullName: "Kolega", firstName: "Kolega" };
  }
  const fromName = u.name?.trim();
  const fromEmail = u.email?.trim();
  const full =
    fromName ||
    (fromEmail ? fromEmail.split("@")[0]?.replace(/\./g, " ").trim() : null) ||
    "Kolega";
  const firstName = fromName
    ? (u.firstName?.trim() || full.split(/\s+/).filter(Boolean)[0] || full)
    : full.split(/\s+/).filter(Boolean)[0] || full;
  return { fullName: full, firstName };
}

async function getAuthorForWorkspace(workspaceId: string): Promise<SniperAuthorContext> {
  const owner = await prisma.user.findFirst({
    where: { workspaceId, role: { in: ["OWNER", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { name: true, email: true },
  });
  if (!owner) {
    return { fullName: "Kolega", firstName: "Kolega" };
  }
  const full =
    owner.name?.trim() ||
    owner.email.split("@")[0]?.replace(/\./g, " ").trim() ||
    "Kolega";
  const firstName = full.split(/\s+/).filter(Boolean)[0] || full;
  return { fullName: full, firstName };
}

function buildSniperSystemPrompt(
  ctx: SniperWorkspaceContext,
  author: SniperAuthorContext,
  nabizenaSluzba: string,
  isAutodetect: boolean,
): string {
  const nab = nabizenaSluzba.trim() || "naše nabízená služba";
  const forbiddenWords = buildEffectiveForbiddenWords(ctx.forbiddenWords);
  const customForbiddenLine = forbiddenWords
    .filter((w) => w !== "synergie" && w !== "namontujeme")
    .map((w) => `„${w}“`)
    .join(", ");
  const signatureInstruction = ctx.emailSignature
    ? `Použij přesně tento podpis na konci těla e-mailu (za rozloučením):\n${ctx.emailSignature}`
    : `řádek „S pozdravem“, nový řádek a podpis: ${author.fullName}. Nikdy nepodepisuj „Tým …“, pokud to není v profilu firmy.`;
  const personaIntro = ctx.systemPrompt.trim()
    ? ctx.systemPrompt.trim()
    : [
        "Píšeš jako zkušený člověk z praxe, ne jako copywriter ani chatbot.",
        "Styl: elegantní, klidný, profesionální, ale ne formalistický. Krátké věty. Žádná vata.",
        "Čtenář má pocit, že mu píše konkrétní člověk, který web opravdu viděl — ne agentura s šablonou.",
      ].join(" ");
  const knowledgeBase = ctx.companyServices
    ? [
        "",
        "PODROBNÝ POPIS NAŠICH SLUŽEB (interní znalostní báze — čerpej z ní jen relevantní části, nikdy nevkládej celý text):",
        ctx.companyServices,
      ]
    : [];
  const taskBlock = isAutodetect
    ? [
        "TVŮJ ÚKOL (REŽIM AUTODETEKCE SLUŽBY):",
        "Nejdřív z webu pochop, čím se klient živí. Z naší znalostní báze vyber 1 službu (max. 2), která dává smysl právě jim.",
        "E-mail postav na konkrétním postřehu z webu + jedné jasné nabídce pomoci. Žádné obecné AI/SaaS řeči.",
      ]
    : [
        "TVŮJ ÚKOL:",
        "Z textu webu napiš krátký cold e-mail. Čtenář musí poznat, že jsi web opravdu prošel. Jedna myšlenka, žádná vata.",
      ];
  return [
    `Píšeš obchodní e-mail jménem uživatele. Informace o jeho firmě, nabízených službách a hodnotách, které musíš v e-mailu přirozeně použít, najdeš zde:`,
    ctx.companyContext,
    ...knowledgeBase,
    "",
    personaIntro,
    "",
    ...taskBlock,
    "",
    "STYL PSANÍ (povinné):",
    "• Profesionální a elegantní, lehce neformální — jako zpráva od člověka, ne od marketingu.",
    "• Max. 2 věty na odstavec. Žádné výčty benefitů (SEO, marketing, důvěryhodnost…) v řadě.",
    "• Jedna konkrétní myšlenka z webu + jedna nabídka + měkké CTA. Nic navíc.",
    "• Zakázaná vata: „v digitální době“, „online vizitka“, „silná digitální přítomnost“, „zvýšit důvěryhodnost“, obecné chválení webu.",
    "• Nepoužívej oslovení typu „týme [doména]“. Piš „Dobrý den,“ nebo konkrétní jméno, pokud je na webu.",
    "",
    "KDO PÍŠE (identita odesílatele):",
    `• Jmenuješ se ${author.fullName}. V češtině drž správný rod podle křestního jména „${author.firstName}“ (např. Jan → „četl jsem“, „napadlo mě“; Jana → ženský rod). V jiných jazycích obdobně.`,
    "• Nikdy neodvozuj název firmy odesílatele z e-mailové domény příjemce ani nehádej poskytovatele schránky. Zakázáno např. „Jan z Postu“, „Jsem ze Seznamu“. Kdo jsme, vycházej z profilu firmy výše; jinak piš obecně „U nás…“, „Zabýváme se…“.",
    "",
    "STRUKTURA JSON POLÍ:",
    "• osloveni: pouze řádek pozdravu (např. „Dobrý den,“). Bez domény v oslovení.",
    `• vygenerovany_email: tělo BEZ pozdravu. Striktně ${SNIPER_EMAIL_PARAGRAPHS_MIN} až ${SNIPER_EMAIL_PARAGRAPHS_MAX} krátkých odstavců. Mezi každým odstavcem prázdný řádek (\\n\\n). Každý odstavec max. 2 věty.`,
    "",
    "STRUKTURA TĚLA (vygenerovany_email) — přesně v tomto pořadí:",
    "1) Ledoborec: jedna konkrétní věc z webu (specializace, služba, typ klientů). Bez chvály a bez SaaS frází.",
    isAutodetect
      ? "2) Nabídka: jedna věc, kterou bychom jim mohli zlepšit / ušetřit — navázaná na jejich obor a 1 vybranou službu. Bez výčtu funkcí."
      : `2) Nabídka: jedna věc ke zlepšení z jejich webu v návaznosti na „${nab}“. Bez výčtu funkcí a bez obecného marketingového pitchování.`,
    "3) CTA: jen krátká otázka (např. jestli mají příští týden 10 minut). BEZ podpisu v tomto odstavci.",
    "4) Podpis VŽDY jako samostatný odstavec (před ním prázdný řádek). Přesný formát:",
    "   S pozdravem,",
    `   ${author.fullName} … (nebo uložený podpis níže; jméno vždy na novém řádku pod „S pozdravem,“)`,
    `   ${signatureInstruction}`,
    "",
    "STRIKTNÍ ZÁKAZY (porušení = neplatný výstup):",
    "• DOMÉNY A URL: NIKDY v těle e-mailu, oslovení ani předmětech nepiš syrovou doménu, hostitele ani tvar slovo.tld. Zakázáno např. „macek.legal“, „gynekologietereza.cz“. Místo toho „vaše ordinace“, „váš web“, „vaše firma“.",
    `• ABSOLUTNÍ ZÁKAZ SLOV/FRÁZÍ: „synergie“, „namontujeme“, „v digitální době“, „digitální přítomnost“, „online vizitka“.${customForbiddenLine ? ` Dále: ${customForbiddenLine}.` : ""}`,
    "• POMLČKY: v celém textu je zakázán znak minus, en dash, em dash. Piš celé věty bez pomlček.",
    "• Zakázané AI závěry: „Mám pro vás rychlou myšlenku…“, „Budu se těšit na odpověď“, „Pojďme se spojit…“.",
    "• Zakázané prázdné ledoborce: „Zaujal mě váš web“, „Všiml jsem si vašeho webu…“ bez konkrétního detailu.",
    "",
    "PŘEDMĚTY (pole vygenerovane_predmety):",
    `• Vrať ${SNIPER_SUBJECT_VARIANTS_MIN} až ${SNIPER_SUBJECT_VARIANTS_MAX} různých předmětů, žádné duplicity.`,
    `• Délka každého předmětu: ${SNIPER_SUBJECT_MIN_WORDS} až ${SNIPER_SUBJECT_MAX_WORDS} slov. Začni malým písmenem. Lidsky, ne reklamně.`,
    "• V předmětech platí stejný zákaz syrových domén, URL a pomlček jako výše.",
    "",
    "Psychologické vzorce předmětů (každý vzorec právě jednou, v rozumném pořadí):",
    "A) Konkrétní postřeh k obsahu webu.",
    "B) Konkrétní dotaz na jejich službu z textu webu.",
    isAutodetect
      ? "C) Propojení jejich světa s tou naší službou, kterou jsi vybral podle analýzy webu."
      : `C) Propojení jejich světa s nabídkou „${nab}“.`,
    "D) Neformální přímý dotaz k tématu z webu.",
    "",
    "Výstup: striktně JSON podle schématu, bez markdownu kolem.",
  ].join("\n");
}

function buildLanguageToneSegmentBlock(params: GenerateEmailParams): string {
  const isAutodetect = params.selectedOfferedService?.trim() === SNIPER_AUTODETECT_VALUE;
  const toneHint =
    params.tone === "friendly"
      ? "přátelský = klidný a lidský, ne familiární a ne marketingově „uvolněný“"
      : params.tone === "professional"
        ? "profesionální = elegantní a věcný, ne úřední"
        : params.tone === "nobullshit"
          ? "stručný a úderný, bez ozdob"
          : params.tone;

  return [
    `Jazyk výstupu (všechny textové pole v JSON): ${params.language}`,
    `Tón: ${params.tone} (${toneHint})`,
    "SEGMENT KLIENTA: Vždy odvoď VÝHRADNĚ z textu webu (např. gynekologická ordinace → healthcare). Nikdy nevnucuj B2B SaaS.",
    "STYL: elegantní, věcný, krátký. Žádná AI vata („digitální doba“, „vizitka“, výčet SEO/marketing).",
    "ZÁKLAD: 1) co firma dělá, 2) jedna konkrétní příležitost, 3) jak pomůžeme, 4) měkké CTA.",
    isAutodetect
      ? "Službu vyber sám: 1 (max. 2) z naší znalostní báze podle webu."
      : `Služba, kterou v tomto e-mailu primárně nabízíš: ${params.selectedOfferedService}`,
  ].join("\n");
}

type SniperUserModelInput =
  | { mode: "prompt"; prompt: string }
  | {
      mode: "messages";
      messages: Array<{
        role: "user";
        content: Array<TextPart | FilePart>;
      }>;
    };

async function generateWithValidation<T>(args: {
  schema: z.ZodType<T>;
  system: string;
  userInput: SniperUserModelInput;
  /** Úprava výstupu před validací (např. odstranění pomlček). */
  normalize?: (obj: T) => T;
  violates: (obj: T) => boolean;
  /** Po vyčerpání pokusů bez validního výstupu — nesmí házet, vrátí použitelná data. */
  buildFallback: (lastNormalized: T | null) => T;
}) {
  let lastNormalized: T | null = null;

  const generateArgs =
    args.userInput.mode === "prompt"
      ? {
          model: google(SNIPER_GEMINI_MODEL),
          schema: args.schema,
          system: args.system,
          prompt: args.userInput.prompt,
        }
      : {
          model: google(SNIPER_GEMINI_MODEL),
          schema: args.schema,
          system: args.system,
          messages: args.userInput.messages,
        };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await generateObject(generateArgs);
      let obj = result.object as T;
      if (args.normalize) {
        obj = args.normalize(obj);
      }
      lastNormalized = obj;
      if (!args.violates(obj)) {
        return obj;
      }
    } catch (error) {
      console.error("SNIPER ERROR:", error);
    }
  }

  return args.buildFallback(lastNormalized);
}

type SniperGenerationInput = {
  session?: Awaited<ReturnType<typeof getSessionUser>> | null;
  author?: SniperAuthorContext;
  workspaceId: string;
  targetUrl: string;
  selectedOfferedService: string;
  language: string;
  tone: string;
  segment: string;
  pdfBase64?: string;
  outreachKind?: "INITIAL" | "FOLLOW_UP" | "BREAKUP";
  priorEmails?: Array<{ kind: string; subject: string; body: string; sentAt: string }>;
};

/**
 * Sdílené jádro generování Sniper e-mailu (sestavení promptu + validace).
 * Používá ho jak `generateEmailContent` (UI), tak `processSingleLead` (Autopilot).
 */
async function runSniperEmailGeneration(
  input: SniperGenerationInput,
): Promise<z.infer<typeof sniperEmailOutputSchema>> {
  const { workspaceId, targetUrl, selectedOfferedService, language, tone, segment, pdfBase64 } =
    input;

  const choice = selectedOfferedService.trim();
  const isAutodetect = choice === SNIPER_AUTODETECT_VALUE;
  const offerForPrompts = isAutodetect ? "" : choice.slice(0, 80);

  const ctx = await loadSniperWorkspaceContext(workspaceId);
  const author =
    input.author ??
    (input.session ? getAuthorFromSession(input.session) : { fullName: "Kolega", firstName: "Kolega" });
  const clientSiteLabel = clientSiteLabelFromUrl(targetUrl);
  const clientWebsiteData = await fetchClientWebsiteSnippet(targetUrl);

  const system = buildSniperSystemPrompt(ctx, author, offerForPrompts, isAutodetect);
  const params: GenerateEmailParams = {
    targetUrl,
    selectedOfferedService,
    language,
    tone,
    segment,
  };
  const pdfBlock = pdfBase64
    ? [
        "",
        "Ve stejné uživatelské zprávě je k dispozici i binární PDF od odesílatele (viz další část application/pdf).",
        "Použij ho jako doplňkový kontext k naší nabídce a formulaci — web klienta zůstává hlavní zdroj o protistraně; PDF nesmí nahradit fakta z webu.",
      ]
    : [];

  const kind = input.outreachKind ?? "INITIAL";
  const prior = input.priorEmails ?? [];
  const outreachBlock =
    kind === "INITIAL"
      ? [
          "",
          "TYP ZPRÁVY: první cold outreach. Piš jako první kontakt — krátce, konkrétně, bez zmínky o předchozí komunikaci.",
        ]
      : kind === "FOLLOW_UP"
        ? [
            "",
            "TYP ZPRÁVY: FOLLOW-UP (navázání na předchozí mail, na který neodpověděli).",
            "Naváž na to, co jsi už psal — nepřepisuj stejný cold pitch. Buď kratší, jemně urgovat, nabídni konkrétní další krok.",
            "Nepiš „posílám follow-up“ ani „připomínám se podruhé“ — piš jako člověk, co se přirozeně ozývá.",
            prior.length
              ? [
                  "HISTORIE NAŠICH ODESLANÝCH MAILŮ (od nejstaršího):",
                  ...prior.map(
                    (m, i) =>
                      `--- #${i + 1} [${m.kind}] ${m.sentAt} | předmět: ${m.subject}\n${m.body.slice(0, 1200)}`,
                  ),
                ].join("\n")
              : "Historie mailů chybí — piš krátký follow-up obecně.",
          ]
        : [
            "",
            "TYP ZPRÁVY: BREAKUP (poslední mail v sekvenci — zdvořile uzavíráme, pokud nemají zájem).",
            "Buď velmi krátký, lidský, bez nátlaku. Dej jim prostor se ozvat, pokud se situace změní. Žádná vina, žádný drama.",
            prior.length
              ? [
                  "HISTORIE NAŠICH ODESLANÝCH MAILŮ:",
                  ...prior.map(
                    (m, i) =>
                      `--- #${i + 1} [${m.kind}] ${m.sentAt} | předmět: ${m.subject}\n${m.body.slice(0, 800)}`,
                  ),
                ].join("\n")
              : "",
          ];

  const userPrompt = [
    `Doména / web klienta (pouze kontext pro tělo a analýzu, do předmětů ji nekopíruj): ${clientSiteLabel}`,
    "",
    "Zde jsou data z webu potenciálního klienta:",
    clientWebsiteData,
    "",
    buildLanguageToneSegmentBlock(params),
    ...pdfBlock,
    ...outreachBlock,
    "",
    "Vygeneruj čistý JSON s následující strukturou (NEPŘIDÁVEJ ŽÁDNÝ MARKDOWN, POUZE JSON přes schéma):",
    "{",
    '  "contact_email": "nalezeny_email (pokud není, vrať null)",',
    '  "contact_phone": "nalezeny_telefon (pokud není, vrať null)",',
    '  "osloveni": "Vhodné oslovení (např. Dobrý den, pane Nováku, nebo jen Dobrý den,).",',
    '  "analyza_klienta": "2 až 4 věty interní shrnutí z webu: 1) o jakou firmu/ordinaci jde, 2) co nabízí, 3) co by se dalo zlepšit (web/prezentace/proces), 4) jak jim naše služba pomůže. Žádné obecné SaaS fráze.",',
    `  "vygenerovane_predmety": ["varianta 1", "varianta 2", "varianta 3", "varianta 4"],`,
    kind === "BREAKUP"
      ? '  "vygenerovany_email": "Tělo BEZ pozdravu. Max 2 krátké odstavce + podpis. Breakup — krátké uzavření, prostor se ozvat později.",'
      : kind === "FOLLOW_UP"
        ? '  "vygenerovany_email": "Tělo BEZ pozdravu. 2 až 3 krátké odstavce. Follow-up navazující na historii, jedno CTA + podpis.",'
        : '  "vygenerovany_email": "Tělo BEZ pozdravu. 3 až 4 krátké odstavce. Konkrétní detail z webu, jedna nabídka, CTA+podpis. Elegantní a věcné — žádná AI vata, žádné domény, žádné pomlčky.",',
    `  "detekovany_segment": "segment z webu, JEDEN z: ${SNIPER_DETECTED_SEGMENTS.join(", ")} (jinak null)",`,
    `  "detekovany_ton": "nejvhodnější tón, JEDEN z: ${SNIPER_DETECTED_TONES.join(", ")} (jinak null)",`,
    `  "detekovany_jazyk": "jazyk webu, JEDEN z: ${SNIPER_DETECTED_LANGUAGES.join(", ")} (jinak null)"`,
    "}",
    "",
    "detekovany_segment urči jen z webu (ordinace → healthcare). E-mail piš podle faktů z webu, ne podle šablony SaaS.",
    "",
    "Důležité k vygenerovane_predmety:",
    `- Pole musí obsahovat ${SNIPER_SUBJECT_VARIANTS_MIN} až ${SNIPER_SUBJECT_VARIANTS_MAX} různých předmětů.`,
    `Každý předmět: ${SNIPER_SUBJECT_MIN_WORDS} až ${SNIPER_SUBJECT_MAX_WORDS} slov, začátek malým písmenem, tón zvědavého člověka co web opravdu četl (ne suchá klíčová slova).`,
    isAutodetect
      ? "Službu, kterou v e-mailu nabízíš, si vyber sám podle analýzy webu (1 až 2 z naší znalostní báze). Doménu ani hostitele z URL nikdy nevkládej do vygenerovane_predmety (viz system prompt: pouze „váš web“, „vaše firma“ apod.)."
      : `Tvoje nabízená služba v tomto e-mailu (propojení světů): „${offerForPrompts}“. Doménu ani hostitele z URL nikdy nevkládej do vygenerovane_predmety (viz system prompt: pouze „váš web“, „vaše firma“ apod.).`,
    "Čtyři varianty předmětu dodrž psychologické vzorce ze system promptu (1 osobní postřeh + web, 2 konkrétní dotaz na jejich službu z webu, 3 propojení jejich světa s naší nabídkou, 4 neformální přímý dotaz).",
  ].join("\n");

  const userInput: SniperUserModelInput = pdfBase64
    ? {
        mode: "messages",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "file", data: pdfBase64, mediaType: "application/pdf" },
            ],
          },
        ],
      }
    : { mode: "prompt", prompt: userPrompt };

  return generateWithValidation({
    schema: sniperEmailOutputSchema,
    system,
    userInput,
    normalize: (obj) => normalizeSniperEmailOutput(obj, offerForPrompts),
    violates: sniperOutputViolatesForbiddenOnly,
    buildFallback: (last) =>
      last
        ? finalizeSniperEmailOutput(last, offerForPrompts, author.fullName)
        : minimalFallbackSniperEmail(clientSiteLabel, offerForPrompts, author.fullName),
  }).then((object) => ({
    ...object,
    detekovany_segment: resolveDetectedSegment(
      clientWebsiteData,
      object.detekovany_segment,
    ),
  }));
}

export async function generateEmailContent(params: GenerateEmailParams) {
  try {
    const { targetUrl, selectedOfferedService, language, tone, segment, pdfData } = params;
    const session = await getSessionUser();
    if (!session.user?.workspaceId) {
      return { error: "Nejste přihlášen." };
    }

    if ((session.workspace?.creditsTotal ?? 0) - (session.workspace?.creditsUsed ?? 0) <= 0) {
      return {
        error: "INSUFFICIENT_CREDITS",
        message: "Nemáte dostatek kreditů pro tuto akci.",
      };
    }

    if (!process.env.GOOGLE_API_KEY) {
      return { error: "Chybí GOOGLE_API_KEY v prostředí." };
    }

    const choice = selectedOfferedService?.trim();
    if (!choice) {
      return { error: "Nebyla vybrána služba." };
    }

    let pdfBase64: string | undefined;
    if (pdfData !== undefined && pdfData !== "") {
      pdfBase64 = preparePdfBase64ForModel(pdfData);
      if (!pdfBase64) {
        return {
          error:
            "Soubor PDF není platný PDF, nebo překračuje limit 5 MB. Zkuste menší soubor nebo jiný export.",
        };
      }
    }

    const workspaceId = session.user.workspaceId;
    const object = await runSniperEmailGeneration({
      session,
      workspaceId,
      targetUrl,
      selectedOfferedService: choice,
      language,
      tone,
      segment,
      pdfBase64,
    });

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        creditsUsed: { increment: 1 },
      } as any,
    });

    return { success: true as const, data: object };
  } catch (error) {
    console.error("SNIPER ERROR:", error);
    return { error: "Generování e-mailu selhalo. Zkuste to prosím znovu." };
  }
}

export type GeneratedLeadEmail =
  | {
      success: true;
      leadId: string;
      companyName: string;
      recipient: string;
      subject: string;
      htmlBody: string;
      textBody: string;
    }
  | { error: string };

/**
 * Vygeneruje Sniper e-mail pro lead bez odeslání (Autopilot fronta / follow-up / breakup).
 * `workspaceId` umožní běh z cronu bez session.
 */
export async function generateEmailForLead(
  leadId: string,
  options?: {
    workspaceId?: string;
    kind?: "INITIAL" | "FOLLOW_UP" | "BREAKUP";
  },
): Promise<GeneratedLeadEmail> {
  try {
    const session = options?.workspaceId ? null : await getSessionUser();
    const workspaceId = options?.workspaceId?.trim() || session?.user?.workspaceId;
    if (!workspaceId) {
      return { error: "Nejste přihlášen." };
    }
    if (!process.env.GOOGLE_API_KEY) {
      return { error: "Chybí GOOGLE_API_KEY v prostředí." };
    }

    const id = leadId?.trim();
    if (!id) {
      return { error: "Chybí ID leadu." };
    }

    const kind = options?.kind ?? "INITIAL";

    const workspaceCredits = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { creditsTotal: true, creditsUsed: true, emailSignature: true },
    });
    if (!workspaceCredits) {
      return { error: "Workspace nenalezen." };
    }
    const creditsLeft =
      (workspaceCredits.creditsTotal ?? 0) - (workspaceCredits.creditsUsed ?? 0);
    if (creditsLeft <= 0) {
      return { error: "Nedostatek kreditů." };
    }

    const lead = await prisma.lead.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        companyName: true,
        domain: true,
        email: true,
        contactEmail: true,
      },
    });
    if (!lead) {
      return { error: "Lead nebyl nalezen." };
    }

    const recipient = (lead.contactEmail ?? lead.email ?? "").trim();
    if (!recipient) {
      return { error: "Lead nemá kontaktní e-mail." };
    }

    const website = (lead.domain ?? "").trim();
    if (!website) {
      return { error: "Lead nemá web k analýze." };
    }
    const targetUrl = /^https?:\/\//i.test(website) ? website : `https://${website}`;

    const priorRows = await prisma.emailQueue.findMany({
      where: { leadId: lead.id, status: "SENT" },
      orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
      take: 6,
      select: {
        kind: true,
        subject: true,
        htmlBody: true,
        sentAt: true,
        createdAt: true,
      },
    });
    const { stripHtmlToText } = await import("@/lib/outreach");
    const priorEmails = priorRows.map((row) => ({
      kind: row.kind,
      subject: row.subject,
      body: stripHtmlToText(row.htmlBody).slice(0, 1500),
      sentAt: (row.sentAt ?? row.createdAt).toISOString().slice(0, 10),
    }));

    const author = session
      ? getAuthorFromSession(session)
      : await getAuthorForWorkspace(workspaceId);

    const object = await runSniperEmailGeneration({
      session,
      author,
      workspaceId,
      targetUrl,
      selectedOfferedService: SNIPER_AUTODETECT_VALUE,
      language: "cs",
      tone: "friendly",
      segment: "auto",
      outreachKind: kind,
      priorEmails,
    });

    const savedSignature = (workspaceCredits.emailSignature ?? "").trim();

    const subject =
      object.vygenerovane_predmety[0]?.trim() ||
      (kind === "BREAKUP"
        ? `Poslední zpráva — ${lead.companyName}`
        : kind === "FOLLOW_UP"
          ? `Ještě jedna myšlenka — ${lead.companyName}`
          : `Nápad pro ${lead.companyName}`);
    const generatedBody = `${object.osloveni}\n\n${object.vygenerovany_email}`;
    const body = appendEmailSignatureIfMissing(generatedBody, savedSignature);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { creditsUsed: { increment: 1 } } as any,
    });

    return {
      success: true,
      leadId: lead.id,
      companyName: lead.companyName,
      recipient,
      subject,
      htmlBody: plainTextToHtml(body),
      textBody: plainTextToMimeText(body),
    };
  } catch (error) {
    console.error("GENERATE LEAD EMAIL ERROR:", error);
    return { error: "Generování e-mailu selhalo (chyba serveru nebo nedostupný web)." };
  }
}

export type ProcessSingleLeadResult =
  | { success: true; leadId: string; subject: string; email: string }
  | { error: string };

/**
 * Autopilot (legacy okamžité odeslání): vygeneruje a rovnou odešle e-mail.
 */
export async function processSingleLead(leadId: string): Promise<ProcessSingleLeadResult> {
  try {
    const session = await getSessionUser();
    const workspaceId = session.user?.workspaceId;
    if (!workspaceId) {
      return { error: "Nejste přihlášen." };
    }

    const generated = await generateEmailForLead(leadId);
    if ("error" in generated) {
      return { error: generated.error };
    }

    const sendResult = await sendEmail({
      to: generated.recipient,
      subject: generated.subject,
      html: generated.htmlBody,
      text: generated.textBody,
      workspaceId,
    });
    if (!sendResult.success) {
      return { error: `Odeslání selhalo: ${sendResult.error}` };
    }

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: generated.leadId },
        data: { status: "CONTACTED" } as any,
      }),
      prisma.activityLog.create({
        data: {
          workspaceId,
          actionType: "EMAIL_SENT",
          title: `E-mail odeslán: ${generated.companyName}`,
          description: generated.subject,
        } as any,
      }),
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { emailsSent: { increment: 1 } } as any,
      }),
    ]);

    revalidatePath("/crm");
    revalidatePath("/");

    return {
      success: true as const,
      leadId: generated.leadId,
      subject: generated.subject,
      email: generated.recipient,
    };
  } catch (error) {
    console.error("AUTOPILOT ERROR:", error);
    return { error: "Zpracování leadu selhalo (chyba serveru nebo nedostupný web)." };
  }
}

export async function generateEmailSubjects(params: GenerateEmailParams) {
  try {
    const { targetUrl, selectedOfferedService, language, tone, segment } = params;
    const session = await getSessionUser();
    if (!session.user?.workspaceId) {
      return { error: "Nejste přihlášen." };
    }

    if (!process.env.GOOGLE_API_KEY) {
      return { error: "Chybí GOOGLE_API_KEY v prostředí." };
    }

    const choice = selectedOfferedService?.trim();
    if (!choice) {
      return { error: "Nebyla vybrána služba." };
    }

    const isAutodetect = choice === SNIPER_AUTODETECT_VALUE;
    const offerForPrompts = isAutodetect ? "" : choice.slice(0, 80);

    const workspaceId = session.user.workspaceId;
    const ctx = await loadSniperWorkspaceContext(workspaceId);
    const author = getAuthorFromSession(session);
    const clientSiteLabel = clientSiteLabelFromUrl(targetUrl);
    const clientWebsiteData = await fetchClientWebsiteSnippet(targetUrl);

    const knowledgeBase = ctx.companyServices
      ? [
          "",
          "PODROBNÝ POPIS NAŠICH SLUŽEB (znalostní báze — čerpej z ní relevantní téma předmětu):",
          ctx.companyServices,
        ]
      : [];

    const system = [
      `Píšeš obchodní e-mail jménem uživatele. Informace o jeho firmě, nabízených službách a hodnotách, které musíš v e-mailu přirozeně použít, najdeš zde:`,
      ctx.companyContext,
      ...knowledgeBase,
      "",
      `Jsi zkušený B2B obchodník. Píšeš jako ${author.fullName} (křestní jméno: ${author.firstName} — správný rod v češtině podle něj). Předměty musí působit, že je píše člověk z praxe, ne robot.`,
      "ÚKOL: Navrhni přesně 3 různé předměty cold e-mailu (pole subjects).",
      "",
      "ZAKÁZANÉ FORMÁTY V PŘEDMĚTECH:",
      "NIKDY syrová URL, doména ani tvar slovo.koncovka (např. „macek.legal“, „prace.cz“). Používej „váš web“, „vaše kancelář“, „vaše firma“, „vaše podnikání“ nebo název firmy bez TLD.",
      "NIKDY neodvozuj identitu odesílatele z e-mailové domény (zakázáno „Jan z Postu“ apod.).",
      "Zakázané prázdné fráze: „zaujal mě váš web“, „pár postřehů k vašemu webu“ bez konkrétního detailu.",
      "",
      "Vygeneruj 3 různé varianty předmětu. Nesmí znít jako levná reklama; musí vzbudit zvědavost a obsahovat konkrétní náznak toho, co je na webu klienta.",
      `Délka každého předmětu: ${SNIPER_SUBJECT_MIN_WORDS} až ${SNIPER_SUBJECT_MAX_WORDS} slov. Žádné suché klíčové dvousloví ani robotický štítek.`,
      "Každý předmět začni malým písmenem.",
      "",
      "Každý z těchto 3 řádků ať vychází z jiného psychologického vzorce (vyber 3 ze čtyř):",
      "1. Konkrétní postřeh k obsahu webu (ne obecné „k vašemu webu“).",
      "2. Konkrétní dotaz na jejich službu nebo způsob práce z textu webu.",
      isAutodetect
        ? "3. Propojení jejich světa s tou naší službou, kterou vybereš podle analýzy webu, nebo neformální přímý dotaz k tématu z webu."
        : `3. Propojení jejich světa s nabídkou „${offerForPrompts}“ nebo neformální přímý dotaz k tématu z webu.`,
      "",
      `ABSOLUTNÍ ZÁKAZ SLOV: „synergie“, „namontujeme“. Další zakázaná slova: ${FORBIDDEN_SUBSTRINGS.filter((w) => w !== "synergie" && w !== "namontujeme").join(", ")}.`,
      `Nikdy nepoužívej fráze jako: ${BANNED_CHEESY_PHRASES.slice(0, 3).map((p) => `„${p}“`).join(", ")}.`,
      "Jakákoli pomlčka (-, –, —) v předmětu je ZAKÁZANÁ; systém zprávu okamžitě smaže. Ber to smrtelně vážně.",
      "Výstup: pouze pole subjects (3 položky) podle schématu.",
    ].join("\n");

    const prompt = [
      `Doména klienta (interní orientace z URL; do předmětů ji nepiš): ${clientSiteLabel}`,
      isAutodetect
        ? "Službu, které se předměty týkají, vyber sám podle analýzy webu klienta (z naší znalostní báze)."
        : `Služba, kterou v tomto e-mailu nabízíš (nase_nabizena_sluzba): ${offerForPrompts}`,
      "",
      "Data z webu klienta:",
      clientWebsiteData,
      "",
      buildLanguageToneSegmentBlock(params),
      "",
      "Vrať JSON se třemi různými předměty (subjects). Každý má 3–7 slov, malé začáteční písmeno, zvědavost podle vzorců v system promptu. Žádná syrová doména ani URL v předmětech.",
    ].join("\n");

    const object = await generateWithValidation({
      schema: emailSubjectsSchema,
      system,
      userInput: { mode: "prompt", prompt },
      normalize: normalizeEmailSubjectsOutput,
      violates: subjectsViolateForbiddenOnly,
      buildFallback: (last) =>
        last
          ? finalizeEmailSubjectsOutput(last)
          : {
              subjects: [
                lowercaseFirstLetterSubject(
                  truncateToMaxWords("dotaz k tomu co píšete na webu", SNIPER_SUBJECT_MAX_WORDS),
                ),
                lowercaseFirstLetterSubject(
                  truncateToMaxWords("rychlý dotaz k vaší praxi online", SNIPER_SUBJECT_MAX_WORDS),
                ),
                lowercaseFirstLetterSubject(
                  truncateToMaxWords(
                    offerForPrompts
                      ? `rychlý dotaz k ${offerForPrompts} podle vašeho webu`
                      : "rychlý dotaz k vašim službám z webu",
                    SNIPER_SUBJECT_MAX_WORDS,
                  ),
                ),
              ],
            },
    });

    return { success: true as const, data: object };
  } catch (error) {
    console.error("SNIPER ERROR:", error);
    return { error: "Generování předmětů selhalo. Zkuste to prosím znovu." };
  }
}
