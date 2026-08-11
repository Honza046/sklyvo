"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { getSessionUser } from "@/app/actions/auth";
import { assertSafeHttpUrl, safeFetchHtml } from "@/lib/ssrf-guard";
import {
  ONBOARDING_SERVICES,
  PREDEFINED_AUDIENCES,
  PREDEFINED_INDUSTRIES,
} from "@/lib/constants";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const ANALYZE_MODEL =
  process.env.ONBOARDING_GEMINI_MODEL?.trim() ||
  process.env.SNIPER_GEMINI_MODEL?.trim() ||
  "gemini-3.5-flash";

const FETCH_TIMEOUT_MS = 9000;
const FETCH_BODY_MAX = 90_000;
const TEXT_MAX = 4500;

export type CompanyWebsiteAnalysis = {
  companyNameHint: string;
  industry: string;
  customIndustry: string;
  offeredServices: string[];
  targetAudience: string;
  customTarget: string;
  companyContext: string;
  tags: string[];
  summary: string;
  normalizedWebsite: string;
};

const analysisSchema = z.object({
  companyNameHint: z
    .string()
    .describe("Oficiální nebo běžný název firmy z webu, pokud je jasný."),
  industry: z
    .string()
    .describe(
      `Nejbližší obor z: ${PREDEFINED_INDUSTRIES.join(", ")}. Pokud nic nesedí, použij „Jiné“.`,
    ),
  customIndustry: z
    .string()
    .describe("Když industry=Jiné, krátký vlastní obor. Jinak prázdné."),
  offeredServices: z
    .array(z.string())
    .max(8)
    .describe(
      `2–6 služeb. Preferuj položky z: ${ONBOARDING_SERVICES.join(", ")}. Vlastní jen když na webu opravdu jsou.`,
    ),
  targetAudience: z
    .string()
    .describe(
      `Ideální klient z: ${PREDEFINED_AUDIENCES.join(", ")}. Jinak „Jiné“.`,
    ),
  customTarget: z
    .string()
    .describe("Když targetAudience=Jiné, konkrétní popis klienta. Jinak prázdné."),
  tags: z
    .array(z.string())
    .max(8)
    .describe("Krátké tagy (1–3 slova) vystihující firmu, bez hashtagů."),
  companyContext: z
    .string()
    .describe(
      "2–4 věty v 1. osobě (já/my), jak firma o sobě mluví. Konkrétní, bez marketingové omáčky. Bez názvu Sklyvo.",
    ),
  summary: z
    .string()
    .describe("Jedna krátká věta: čemu se firma věnuje."),
});

function extractMeta(html: string, name: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
    "i",
  );
  return (re.exec(html)?.[1] ?? re2.exec(html)?.[1] ?? "").trim();
}

function extractTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return (m?.[1] ?? "").replace(/\s+/g, " ").trim();
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const u = assertSafeHttpUrl(withProtocol);
  if (!u) return null;
  return u.toString().replace(/\/$/, "");
}

function pickIndustry(raw: string): { industry: string; customIndustry: string } {
  const value = raw.trim();
  if ((PREDEFINED_INDUSTRIES as readonly string[]).includes(value)) {
    return { industry: value, customIndustry: "" };
  }
  if (!value || value.toLowerCase() === "jiné") {
    return { industry: "Jiné", customIndustry: "" };
  }
  return { industry: "Jiné", customIndustry: value };
}

function pickAudience(raw: string): {
  targetAudience: string;
  customTarget: string;
} {
  const value = raw.trim();
  if ((PREDEFINED_AUDIENCES as readonly string[]).includes(value)) {
    return { targetAudience: value, customTarget: "" };
  }
  if (!value || value.toLowerCase() === "jiné") {
    return { targetAudience: "Jiné", customTarget: "" };
  }
  return { targetAudience: "Jiné", customTarget: value };
}

export async function analyzeCompanyWebsite(input: {
  website: string;
  companyName?: string;
}): Promise<
  | { success: true; analysis: CompanyWebsiteAnalysis }
  | { error: string }
> {
  const session = await getSessionUser();
  if (!session.user?.id) {
    return { error: "Nejste přihlášen." };
  }

  const normalizedWebsite = normalizeWebsite(input.website);
  if (!normalizedWebsite) {
    return { error: "Zadejte platnou veřejnou URL webu (např. vasefirma.cz)." };
  }

  const fetched = await safeFetchHtml(normalizedWebsite, {
    timeoutMs: FETCH_TIMEOUT_MS,
    maxBodyChars: FETCH_BODY_MAX,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SklyvoOnboarding/1.0; +https://sklyvo.com)",
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "cs,en;q=0.8",
    },
  });

  if (!fetched.ok) {
    return {
      error:
        "Web se nepodařilo načíst. Zkontrolujte URL, nebo pokračujte bez analýzy a vyplňte profil ručně.",
    };
  }

  const html = fetched.html;
  const title = extractTitle(html);
  const description =
    extractMeta(html, "description") || extractMeta(html, "og:description");
  const plain = htmlToPlain(html).slice(0, TEXT_MAX);
  const knownName = (input.companyName ?? "").trim();

  try {
    const { object } = await generateObject({
      model: google(ANALYZE_MODEL),
      schema: analysisSchema,
      prompt: [
        "Analyzuj firmu podle obsahu jejího webu.",
        "Cíl: personalizovat onboarding ve Sklyvu (B2B outreach).",
        "Piš česky. Buď konkrétní podle webu, nevymýšlej služby které tam nejsou.",
        knownName ? `Uživatel zadal název: ${knownName}` : null,
        `URL: ${normalizedWebsite}`,
        title ? `Title: ${title}` : null,
        description ? `Meta: ${description}` : null,
        "--- TEXT WEBU ---",
        plain || "(málo textu)",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const industryPick = pickIndustry(object.industry);
    const audiencePick =
      object.targetAudience === "Jiné" ||
      !(PREDEFINED_AUDIENCES as readonly string[]).includes(object.targetAudience)
        ? pickAudience(
            object.customTarget.trim() || object.targetAudience || "Jiné",
          )
        : { targetAudience: object.targetAudience, customTarget: "" };

    if (industryPick.industry === "Jiné" && !industryPick.customIndustry) {
      industryPick.customIndustry = object.customIndustry.trim() || object.summary.trim();
    }
    if (audiencePick.targetAudience === "Jiné" && !audiencePick.customTarget) {
      audiencePick.customTarget = object.customTarget.trim() || "Firmy a rozhodovatelé";
    }

    const services = Array.from(
      new Set(
        [...object.offeredServices, ...object.tags]
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ).slice(0, 8);

    return {
      success: true,
      analysis: {
        companyNameHint: object.companyNameHint.trim(),
        industry: industryPick.industry,
        customIndustry: industryPick.customIndustry,
        offeredServices: services.length > 0 ? services : ["Konzultace a poradenství"],
        targetAudience: audiencePick.targetAudience,
        customTarget: audiencePick.customTarget,
        companyContext: object.companyContext.trim(),
        tags: object.tags.map((t) => t.trim()).filter(Boolean).slice(0, 8),
        summary: object.summary.trim(),
        normalizedWebsite,
      },
    };
  } catch (error) {
    console.error("analyzeCompanyWebsite:", error);
    return {
      error:
        "Analýza webu teď selhala. Můžete pokračovat a vyplnit profil ručně.",
    };
  }
}
