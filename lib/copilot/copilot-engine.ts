import {
 appendAction,
 parseCopilotActions,
 type CopilotAction,
} from "@/lib/copilot/action-links";
import {
 buildEmailSetupGuide,
 EMAIL_SETUP_SETTINGS_PATH,
 isEmailSetupQuestion,
 type CopilotGuideResponse,
} from "@/lib/copilot/setup-knowledge";

export type CopilotAssistantReply = {
 content: string;
 guide?: CopilotGuideResponse;
 actions: CopilotAction[];
};

export type SlashCommand = {
 id: string;
 label: string;
 description: string;
 message: string;
};

type Translator = (key: string, params?: Record<string, string>) => string;

function buildPageContextMessage(pathname: string, language: "cz" | "en" | "es" | "de"): string {
 const labels: Record<string, Record<typeof language, string>> = {
 "/": { cz: "Přehled (dashboard)", en: "Overview (dashboard)", es: "Resumen", de: "Übersicht" },
 "/settings": {
 cz: "Pracovní prostor (nastavení)",
 en: "Workspace (settings)",
 es: "Espacio de trabajo",
 de: "Arbeitsbereich",
 },
 "/autopilot": {
 cz: "Autopilot",
 en: "Autopilot",
 es: "Autopilot",
 de: "Autopilot",
 },
 };

 if (pathname === "/" || pathname === "/dashboard") {
 return labels["/"][language];
 }
 if (pathname.startsWith("/settings") || pathname === "/pracovni-prostor") {
 return labels["/settings"][language];
 }
 if (pathname.startsWith("/autopilot")) {
 return labels["/autopilot"][language];
 }

 return pathname;
}

export function buildSystemContextMessage(pathname: string, language: "cz" | "en" | "es" | "de"): string {
 const pageLabel = buildPageContextMessage(pathname, language);
 if (language === "cz") {
 return `Uživatel se právě nachází na stránce: ${pageLabel}.`;
 }
 if (language === "de") {
 return `Der Benutzer befindet sich auf der Seite: ${pageLabel}.`;
 }
 if (language === "es") {
 return `El usuario está en la página: ${pageLabel}.`;
 }
 return `User is currently on page: ${pageLabel}.`;
}

export function getContextualPrompts(_pathname: string, t: Translator): string[] {
 return [t("copilot.prompt1"), t("copilot.prompt2"), t("copilot.prompt3")];
}

export function getSlashCommands(t: Translator): SlashCommand[] {
 return [
 {
 id: "status",
 label: "/status",
 description: t("copilot.slash.statusDesc"),
 message: t("copilot.slash.statusMessage"),
 },
 {
 id: "kredity",
 label: "/kredity",
 description: t("copilot.slash.creditsDesc"),
 message: t("copilot.slash.creditsMessage"),
 },
 {
 id: "stop",
 label: "/stop",
 description: t("copilot.slash.stopDesc"),
 message: t("copilot.slash.stopMessage"),
 },
 ];
}

function isApiKeysQuestion(input: string): boolean {
 const n = input.toLowerCase();
 return n.includes("api") || n.includes("webhook") || n.includes("integrac") || n.includes("klíč");
}

function isFunnelQuestion(input: string): boolean {
 const n = input.toLowerCase();
 return n.includes("trychtýř") || n.includes("funnel") || n.includes("konverz") || n.includes("metrik");
}

function isAutopilotCampaignQuestion(input: string): boolean {
 const n = input.toLowerCase();
 return (
 n.includes("kampaň") ||
 n.includes("kampan") ||
 n.includes("spustit") ||
 n.includes("autopilot") ||
 n.includes("automatiz")
 );
}

function isCreditsQuestion(input: string): boolean {
 const n = input.toLowerCase();
 return n.includes("kredit") || n.includes("tarif") || n.includes("předplat") || n.includes("billing");
}

function isStopQuestion(input: string): boolean {
 const n = input.toLowerCase();
 return n.includes("/stop") || n.includes("zastavit") || n.includes("nouzov") || n.includes("pause");
}

export function resolveCopilotResponse(
 question: string,
 pathname: string,
 language: "cz" | "en" | "es" | "de",
 t: Translator,
): CopilotAssistantReply {
 const trimmed = question.trim();

 if (isEmailSetupQuestion(trimmed) || (pathname.startsWith("/autopilot") && isAutopilotCampaignQuestion(trimmed))) {
 const guide = buildEmailSetupGuide(language);
 const withAction = appendAction(guide.intro, EMAIL_SETUP_SETTINGS_PATH, t("copilot.openEmailSettings"));
 const parsed = parseCopilotActions(withAction);
 return { content: parsed.text, guide, actions: parsed.actions };
 }

 if (
 (pathname.startsWith("/settings") || pathname === "/pracovni-prostor") &&
 isApiKeysQuestion(trimmed)
 ) {
 const raw = appendAction(t("copilot.replies.apiKeys"), "/settings#integrations", t("copilot.actions.openIntegrations"));
 const parsed = parseCopilotActions(raw);
 return { content: parsed.text, actions: parsed.actions };
 }

 if ((pathname === "/" || pathname === "/dashboard") && isFunnelQuestion(trimmed)) {
 const parsed = parseCopilotActions(t("copilot.replies.funnel"));
 return { content: parsed.text, actions: parsed.actions };
 }

 if (isCreditsQuestion(trimmed) || trimmed.toLowerCase().includes("/kredity")) {
 const raw = appendAction(t("copilot.replies.credits"), "/settings#credits", t("copilot.actions.openCredits"));
 const parsed = parseCopilotActions(raw);
 return { content: parsed.text, actions: parsed.actions };
 }

 if (isStopQuestion(trimmed)) {
 const raw = appendAction(t("copilot.replies.stop"), "/autopilot", t("copilot.actions.openAutopilot"));
 const parsed = parseCopilotActions(raw);
 return { content: parsed.text, actions: parsed.actions };
 }

 if (trimmed.toLowerCase().includes("/status") || trimmed.toLowerCase().includes("stav autopilota")) {
 const raw = appendAction(t("copilot.replies.status"), EMAIL_SETUP_SETTINGS_PATH, t("copilot.openEmailSettings"));
 const parsed = parseCopilotActions(raw);
 return { content: parsed.text, actions: parsed.actions };
 }

 if (pathname.startsWith("/autopilot")) {
 const raw = appendAction(t("copilot.replies.autopilotPage"), EMAIL_SETUP_SETTINGS_PATH, t("copilot.openEmailSettings"));
 const parsed = parseCopilotActions(raw);
 return { content: parsed.text, actions: parsed.actions };
 }

 if (pathname.startsWith("/settings") || pathname === "/pracovni-prostor") {
 const parsed = parseCopilotActions(t("copilot.replies.workspacePage"));
 return { content: parsed.text, actions: parsed.actions };
 }

 const parsed = parseCopilotActions(t("copilot.fallback"));
 return { content: parsed.text, actions: parsed.actions };
}
