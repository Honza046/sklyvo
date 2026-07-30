const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function getGoogleSheetsOAuthConfig() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const clientId =
    process.env.GOOGLE_SHEETS_CLIENT_ID?.trim() ||
    process.env.GOOGLE_EMAIL_CLIENT_ID?.trim() ||
    "";
  const clientSecret =
    process.env.GOOGLE_SHEETS_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_EMAIL_CLIENT_SECRET?.trim() ||
    "";
  const redirectUri =
    process.env.GOOGLE_SHEETS_REDIRECT_URI?.trim() ||
    `${appUrl}/api/integrations/google-sheets/callback`;

  return { appUrl, clientId, clientSecret, redirectUri, scope: GOOGLE_WORKSPACE_SCOPES };
}

/** Encode workspace + optional return path into OAuth `state`. */
export function encodeGoogleOAuthState(workspaceId: string, returnPath?: string | null) {
  const path = (returnPath || "").trim();
  if (!path || path === "/settings") return workspaceId;
  return `${workspaceId}|${encodeURIComponent(path)}`;
}

export function decodeGoogleOAuthState(state: string | null): {
  workspaceId: string | null;
  returnPath: string;
} {
  if (!state) return { workspaceId: null, returnPath: "/settings#integrations" };
  const sep = state.indexOf("|");
  if (sep === -1) {
    return { workspaceId: state, returnPath: "/settings#integrations" };
  }
  const workspaceId = state.slice(0, sep);
  let returnPath = "/settings#integrations";
  try {
    returnPath = decodeURIComponent(state.slice(sep + 1)) || returnPath;
  } catch {
    // keep default
  }
  if (!returnPath.startsWith("/")) {
    returnPath = "/settings#integrations";
  }
  return { workspaceId, returnPath };
}

export function buildGoogleSheetsAuthorizeUrl(
  workspaceId: string,
  loginHint?: string | null,
  returnPath?: string | null,
) {
  const { clientId, redirectUri, scope } = getGoogleSheetsOAuthConfig();
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    // consent alone; avoid select_account — Safari often breaks the account picker UI
    prompt: "consent",
    scope,
    state: encodeGoogleOAuthState(workspaceId, returnPath),
  });

  const hint = loginHint?.trim();
  if (hint) {
    params.set("login_hint", hint);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
