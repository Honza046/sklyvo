export type CopilotAction = {
 path: string;
 label: string;
};

const ACTION_PATTERN = /\[ACTION:\s*([^\]|]+)(?:\|([^\]]+))?\]/g;

const ALLOWED_PREFIXES = [
 "/",
 "/settings",
 "/crm",
 "/radar",
 "/sniper",
 "/autopilot",
 "/help",
 "/account",
 "/pracovni-prostor",
 "/dashboard",
] as const;

function isAllowedAppPath(path: string): boolean {
 if (!path.startsWith("/")) return false;
 if (path.startsWith("//")) return false;
 if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return false; // http:, javascript:
 const bare = path.split(/[?#]/)[0] || "/";
 if (bare === "/") return true;
 return ALLOWED_PREFIXES.some((prefix) => {
 if (prefix === "/") return false;
 return bare === prefix || bare.startsWith(`${prefix}/`);
 });
}

/** Map legacy / conceptual routes to real app paths. Rejects open redirects. */
export function normalizeCopilotActionPath(rawPath: string): string | null {
 const trimmed = rawPath.trim();
 if (!trimmed || trimmed.startsWith("//") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
 return null;
 }

 const [pathPart, queryPart] = trimmed.split("?");
 const hashIdx = trimmed.indexOf("#");
 const hash = hashIdx >= 0 ? trimmed.slice(hashIdx) : "";
 const params = new URLSearchParams(queryPart?.split("#")[0] ?? "");
 const section = params.get("section");

 let path = pathPart.split("#")[0];
 if (path === "/pracovni-prostor") path = "/settings";
 if (path === "/dashboard") path = "/";

 if (section === "email") {
 return "/settings/outreach";
 }

 let normalized = path.startsWith("/") ? path : `/${path}`;
 normalized = normalized.replace("/pracovni-prostor", "/settings");

 if (hash.includes("#email-integration") || trimmed.includes("#email-integration")) {
 return "/settings/outreach";
 }
 if (hash.includes("#integrations") || trimmed.includes("#integrations")) {
 return "/settings/integrations";
 }
 if (hash.includes("#credits") || trimmed.includes("#credits")) {
 return "/account";
 }

 if (hash && !normalized.includes("#")) {
 normalized = `${normalized}${hash}`;
 }

 if (!isAllowedAppPath(normalized.split("#")[0] || "/")) {
 return null;
 }

 return normalized;
}

export function parseCopilotActions(content: string): {
 text: string;
 actions: CopilotAction[];
} {
 const actions: CopilotAction[] = [];
 let index = 0;

 const text = content.replace(ACTION_PATTERN, (_, rawPath: string, rawLabel?: string) => {
 const path = normalizeCopilotActionPath(rawPath);
 if (!path) return "";
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
