"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/actions/auth";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});
const FORBIDDEN_WORDS = ["synergie", "namontujeme"] as const;
const DASH_REGEX = /[-‐‑‒–—―]/;

const emailOutputSchema = z.object({
  subjects: z.array(z.string().min(1)).length(3),
  body: z.string().min(1),
});

const emailSubjectsSchema = z.object({
  subjects: z.array(z.string().min(1)).length(3),
});

export type GenerateEmailParams = {
  targetUrl: string;
  /** Název služby z workspace.offeredServices (Single Source of Truth) */
  selectedOfferedService: string;
  language: string;
  tone: string;
  segment: string;
};

function normalizeOfferedServicesList(list: string[] | null | undefined) {
  return Array.from(new Set((list ?? []).map((s) => String(s).trim()).filter(Boolean)));
}

function textViolatesRules(text: string) {
  const lowered = text.toLowerCase();
  return FORBIDDEN_WORDS.some((word) => lowered.includes(word)) || DASH_REGEX.test(text);
}

function outputViolatesRules(output: { subjects: string[]; body?: string }) {
  if (output.subjects.some((subject) => textViolatesRules(subject))) return true;
  if (output.body && textViolatesRules(output.body)) return true;
  return false;
}

async function generateWithValidation<T extends { subjects: string[]; body?: string }>(args: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: args.schema,
        system: args.system,
        prompt: args.prompt,
      });
      if (outputViolatesRules(result.object)) {
        throw new Error("AI output porušil pravidla zakázaných slov nebo pomlček.");
      }
      return result.object;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Nepodařilo se vygenerovat validní výstup.");
}

export async function generateEmailContent(params: GenerateEmailParams) {
  const { targetUrl, selectedOfferedService, language, tone, segment } = params;
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

  const allowed = normalizeOfferedServicesList(session.workspace?.offeredServices);
  if (!allowed.includes(choice)) {
    return {
      error: "Neplatná nebo neuložená služba. Obnovte stránku nebo upravte nabízené služby v nastavení.",
    };
  }

  const companyName =
    session.workspace?.companyName?.trim() ||
    session.workspace?.name ||
    "Neznámá firma";
  const offeredServices = allowed;
  const offeredServicesPrompt =
    offeredServices.length > 0
      ? `Firma, pro kterou píšeš, nabízí tyto konkrétní služby: ${offeredServices.join(", ")}. Tyto služby musíš v e-mailu přirozeně zohlednit jako řešení pro klienta.`
      : "Uživatel nemá definované nabízené služby, drž se vybrané služby v parametru.";

  try {
    const object = await generateWithValidation({
      schema: emailOutputSchema,
      system: [
        "Jsi elitní B2B copywriter pro cold outreach e-maily.",
        "Vytvoř výstup pouze podle schématu: subjects (přesně 3 položky) a body.",
        "subjects musí být 3 chytlavé předměty vhodné pro obchodní oslovení.",
        "body je plné tělo e-mailu se strukturou: oslovení, krátká relevance, hodnota služby, CTA.",
        "Dodrž jazyk přesně podle parametru language.",
        "Dodrž tón přesně podle parametru tone.",
        "Přizpůsob text segmentu podle parametru segment.",
        "V textu nikdy nepoužívej slova: synergie, namontujeme.",
        "V textu nepoužívej žádné pomlčky ani varianty dash znaků.",
        "Zachovej konkrétnost, stručnost a přirozenost bez klišé.",
      ].join(" "),
      prompt: [
        `Target URL: ${targetUrl || "nebyla zadána"}`,
        `Typ nabídky (vybraná služba k prodeji v tomto e-mailu): ${choice}`,
        `Popis služby: samostatný popis v systému není; vycházej z názvu služby, kontextu firmy a segmentu.`,
        `Firma: ${companyName}`,
        `Tón: ${tone}`,
        `Jazyk: ${language}`,
        `Segment: ${segment}`,
        offeredServicesPrompt,
      ].join("\n"),
    });

    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: {
        creditsUsed: { increment: 1 },
      } as any,
    });

    return { success: true as const, data: object };
  } catch (error) {
    console.error("generateEmailContent:", error);
    return { error: "Generování e-mailu selhalo. Zkuste to prosím znovu." };
  }
}

export async function generateEmailSubjects(params: GenerateEmailParams) {
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

  const allowed = normalizeOfferedServicesList(session.workspace?.offeredServices);
  if (!allowed.includes(choice)) {
    return {
      error: "Neplatná nebo neuložená služba. Obnovte stránku nebo upravte nabízené služby v nastavení.",
    };
  }

  const companyName =
    session.workspace?.companyName?.trim() ||
    session.workspace?.name ||
    "Neznámá firma";
  const offeredServices = allowed;
  const offeredServicesPrompt =
    offeredServices.length > 0
      ? `Firma, pro kterou píšeš, nabízí tyto konkrétní služby: ${offeredServices.join(", ")}. Předměty musí tyto služby přirozeně zohlednit jako řešení pro klienta.`
      : "Uživatel nemá definované nabízené služby, drž se vybrané služby v parametru.";

  try {
    const object = await generateWithValidation({
      schema: emailSubjectsSchema,
      system: [
        "Jsi elitní B2B copywriter pro cold outreach e-maily.",
        "Vrať pouze pole subjects s přesně třemi chytlavými předměty.",
        "Nevytvářej body ani jiná pole.",
        "Dodrž jazyk přesně podle parametru language.",
        "Dodrž tón přesně podle parametru tone.",
        "Přizpůsob text segmentu podle parametru segment.",
        "V textu nikdy nepoužívej slova: synergie, namontujeme.",
        "V textu nepoužívej žádné pomlčky ani varianty dash znaků.",
        "Předměty musí být konkrétní, obchodní a bez klišé.",
      ].join(" "),
      prompt: [
        `Target URL: ${targetUrl || "nebyla zadána"}`,
        `Typ nabídky (vybraná služba k prodeji v tomto e-mailu): ${choice}`,
        `Popis služby: samostatný popis v systému není; vycházej z názvu služby, kontextu firmy a segmentu.`,
        `Firma: ${companyName}`,
        `Tón: ${tone}`,
        `Jazyk: ${language}`,
        `Segment: ${segment}`,
        offeredServicesPrompt,
      ].join("\n"),
    });

    return { success: true as const, data: object };
  } catch (error) {
    console.error("generateEmailSubjects:", error);
    return { error: "Generování předmětů selhalo. Zkuste to prosím znovu." };
  }
}
