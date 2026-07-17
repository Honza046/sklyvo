export type CopilotAction = {
  path: string;
  label: string;
};

const ACTION_PATTERN = /\[ACTION:\s*([^\]|]+)(?:\|([^\]]+))?\]/g;

/** Map legacy / conceptual routes to real app paths. */
export function normalizeCopilotActionPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  const [pathPart, queryPart] = trimmed.split("?");
  const params = new URLSearchParams(queryPart ?? "");
  const section = params.get("section");

  let path = pathPart;
  if (path === "/pracovni-prostor") path = "/settings";
  if (path === "/dashboard") path = "/";

  if (section === "email") {
    return "/settings#email-integration";
  }

  return trimmed.startsWith("/") ? trimmed.replace("/pracovni-prostor", "/settings") : `/${trimmed}`;
}

export function parseCopilotActions(content: string): {
  text: string;
  actions: CopilotAction[];
} {
  const actions: CopilotAction[] = [];
  let index = 0;

  const text = content.replace(ACTION_PATTERN, (_, rawPath: string, rawLabel?: string) => {
    const path = normalizeCopilotActionPath(rawPath);
    const label = (rawLabel ?? defaultActionLabel(path)).trim();
    actions.push({ path, label });
    return `__ACTION_${index++}__`;
  });

  return { text: text.trim(), actions };
}

function defaultActionLabel(path: string): string {
  if (path.includes("email-integration") || path.includes("section=email")) {
    return "⚙️ Otevřít nastavení e-mailu";
  }
  if (path.startsWith("/settings")) {
    return "⚙️ Otevřít pracovní prostor";
  }
  if (path.startsWith("/autopilot")) {
    return "🚀 Otevřít Autopilot";
  }
  if (path === "/") {
    return "📊 Otevřít přehled";
  }
  return "↗ Přejít";
}

export function appendAction(content: string, path: string, label: string): string {
  return `${content}\n\n[ACTION: ${path}|${label}]`;
}
