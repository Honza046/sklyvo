"use server";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getSessionUser, getWorkspaceAccessState } from "@/app/actions/auth";
import {
  parseCopilotActions,
  appendAction,
  type CopilotAction,
} from "@/lib/copilot/action-links";
import { SKLYVO_PRODUCT_KNOWLEDGE } from "@/lib/copilot/product-knowledge";
import {
  buildEmailSetupGuide,
  EMAIL_SETUP_SETTINGS_PATH,
  isEmailSetupQuestion,
  type CopilotGuideResponse,
} from "@/lib/copilot/setup-knowledge";
import { buildSystemContextMessage } from "@/lib/copilot/copilot-engine";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const COPILOT_MODEL =
  process.env.COPILOT_GEMINI_MODEL?.trim() ||
  process.env.SNIPER_GEMINI_MODEL?.trim() ||
  "gemini-3.5-flash";

export type CopilotChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskCopilotResult = {
  content: string;
  actions: CopilotAction[];
  guide?: CopilotGuideResponse;
  error?: string;
};

function languageInstruction(language: "cz" | "en" | "es" | "de"): string {
  if (language === "en") return "Reply in English.";
  if (language === "de") return "Antworte auf Deutsch.";
  if (language === "es") return "Responde en español.";
  return "Odpovídej česky.";
}

function buildSystemPrompt(
  pathname: string,
  language: "cz" | "en" | "es" | "de",
): string {
  const pageContext = buildSystemContextMessage(pathname, language);
  return [
    "Jsi Skly Bot, AI asistent ve Sklyvu (B2B outreach app).",
    "Pomáháš s Sklyvem: Sniper, Radar, CRM, Autopilot, kredity, napojení e-mailu, nastavení.",
    "Nikdy se nepředstavuj jako „produktový asistent“ a neříkej fráze typu „pomoc s produktem“ / „help with the product“.",
    "Na pozdrav (ahoj, čau…) odpověz krátce a přirozeně. Co řeší ve Sklyvu (např. e-mail, Autopilot, kredity). Bez marketingového pitchu.",
    "Buď konkrétní k otázce. Nekopíruj dlouhé návody, pokud uživatel nechce krok za krokem.",
    "Piš stručně (max ~8 vět nebo krátké odrážky). Tón: kamarádský, věcný.",
    "NEPOUŽÍVEJ Markdown: žádné **tučné**, *kurzívu*, # nadpisy ani `backticky`. Piš obyčejný text. Odrážky klidně s „-“.",
    "Nepoužívej dlouhé pomlčky (—) v odpovědích. Piš věty s tečkou nebo čárkou.",
    "Když pomůže navigace, přidej na konec tag [ACTION: /cesta|Text tlačítka].",
    "Příklad: [ACTION: /settings#email-integration|Otevřít nastavení e-mailu]",
    "Nevymýšlej funkce, které ve Sklyvu nejsou. Pokud nevíš, řekni to a navrhni /help (Podpora).",
    languageInstruction(language),
    pageContext,
    "",
    "=== Co umí Sklyvo ===",
    SKLYVO_PRODUCT_KNOWLEDGE,
  ].join("\n");
}

export async function askCopilot(input: {
  question: string;
  pathname: string;
  language: "cz" | "en" | "es" | "de";
  history?: CopilotChatMessage[];
}): Promise<AskCopilotResult> {
  const session = await getSessionUser();
  if (!session.user?.id) {
    return {
      content: "Pro chat se Skly Botem se musíte přihlásit.",
      actions: [],
      error: "unauthenticated",
    };
  }

  const access = await getWorkspaceAccessState();
  if (access.isBlocked) {
    return {
      content:
        "Váš trial nebo předplatné není aktivní. Obnovte tarif v nastavení účtu.",
      actions: [{ path: "/account", label: "Otevřít účet" }],
      error: "blocked",
    };
  }

  const { consumeRateLimit, RATE_LIMITS } = await import("@/lib/rate-limit");
  const limited = await consumeRateLimit({
    key: `copilot:${session.user.id}`,
    ...RATE_LIMITS.copilot,
  });
  if (!limited.ok) {
    return {
      content: `Překročen limit zpráv. Zkuste to znovu za cca ${limited.retryAfterSec} s.`,
      actions: [],
      error: "rate_limited",
    };
  }

  const question = input.question.trim();
  if (!question) {
    return { content: "", actions: [], error: "empty" };
  }

  if (!process.env.GOOGLE_API_KEY) {
    return {
      content:
        "AI asistent teď není dostupný (chybí API klíč). Zkuste to později nebo otevřete Podporu.",
      actions: [{ path: "/help", label: "Otevřít Podporu" }],
      error: "missing_api_key",
    };
  }

  const history = (input.history ?? []).slice(-10);
  const messages = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: question },
  ];

  try {
    const { text } = await generateText({
      model: google(COPILOT_MODEL),
      system: buildSystemPrompt(input.pathname, input.language),
      messages,
      temperature: 0.4,
      maxOutputTokens: 900,
    });

    const raw = (text ?? "").trim();
    if (!raw) {
      return {
        content: "Nepodařilo se sestavit odpověď. Zkuste otázku přeformulovat.",
        actions: [],
        error: "empty_model",
      };
    }

    const parsed = parseCopilotActions(raw);
    const wantsEmailGuide =
      isEmailSetupQuestion(question) &&
      /krok|step|app password|heslo aplikace|oauth|smtp|propoj/i.test(
        question + " " + raw,
      );

    let guide: CopilotGuideResponse | undefined;
    let content = parsed.text;
    let actions = parsed.actions;

    if (wantsEmailGuide && actions.length === 0) {
      guide = buildEmailSetupGuide(input.language);
      const withAction = appendAction(
        content || guide.intro,
        EMAIL_SETUP_SETTINGS_PATH,
        input.language === "en"
          ? "Open email settings"
          : input.language === "de"
            ? "E-Mail-Einstellungen öffnen"
            : input.language === "es"
              ? "Abrir ajustes de e-mail"
              : "Otevřít nastavení e-mailu",
      );
      const again = parseCopilotActions(withAction);
      content = again.text;
      actions = again.actions;
    }

    return { content, actions, guide };
  } catch (err) {
    console.error("[askCopilot]", err);
    return {
      content:
        "Teď se mi nepodařilo odpovědět (chyba AI). Zkuste to znovu za chvíli, nebo se podívejte do Nápovědy.",
      actions: [{ path: "/help", label: "Otevřít nápovědu" }],
      error: "model_error",
    };
  }
}
