export const DEFAULT_SNIPER_SYSTEM_PROMPT =
  "Píšeš jako konkrétní člověk (1. osoba jednotného čísla: já), ne jako firemní leták. Primárně nabízíš redesign a tvorbu webů a e-shopů na míru (včetně Shopify). AI a automatizaci jen když to z webu klienta dává smysl. Nikdy nepiš „My v Venegardu…“ ani „se specializujeme na…“ — Venegard patří do podpisu. Přirozená čeština, konkrétní nabídka, žádná marketingová vata.";

const FORBIDDEN_WORDS_MARKER = "\n\n---VENEGARD_FORBIDDEN_WORDS---\n";

export function serializeSystemPromptWithForbiddenWords(
  systemPrompt: string,
  forbiddenWords: string,
): string {
  const basePrompt = systemPrompt.trim();
  const blacklist = forbiddenWords.trim();

  if (!blacklist) {
    return basePrompt.length > 0 ? basePrompt : "";
  }

  const promptBody = basePrompt.length > 0 ? basePrompt : DEFAULT_SNIPER_SYSTEM_PROMPT;
  return `${promptBody}${FORBIDDEN_WORDS_MARKER}${blacklist}`;
}

export function parseStoredAiBehaviorSettings(storedSystemPrompt: string | null | undefined): {
  systemPrompt: string;
  forbiddenWords: string;
} {
  const raw = storedSystemPrompt?.trim() ?? "";
  if (!raw) {
    return { systemPrompt: DEFAULT_SNIPER_SYSTEM_PROMPT, forbiddenWords: "" };
  }

  const markerIndex = raw.indexOf(FORBIDDEN_WORDS_MARKER);
  if (markerIndex === -1) {
    return { systemPrompt: raw, forbiddenWords: "" };
  }

  const systemPrompt = raw.slice(0, markerIndex).trim() || DEFAULT_SNIPER_SYSTEM_PROMPT;
  const forbiddenWords = raw.slice(markerIndex + FORBIDDEN_WORDS_MARKER.length).trim();
  return { systemPrompt, forbiddenWords };
}

export function parseForbiddenWordsFromStoredSystemPrompt(
  storedSystemPrompt: string | null | undefined,
): string[] {
  const { forbiddenWords } = parseStoredAiBehaviorSettings(storedSystemPrompt);
  if (!forbiddenWords) return [];

  return Array.from(
    new Set(
      forbiddenWords
        .split(/[,;\n]+/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}
