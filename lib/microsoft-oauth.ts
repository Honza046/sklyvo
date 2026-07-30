const MS_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "User.Read",
  "Files.ReadWrite",
  "Files.Read.All",
].join(" ");

export function getMicrosoftOAuthConfig() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim() || "";
  const tenant =
    process.env.MICROSOFT_TENANT_ID?.trim() || "common";
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI?.trim() ||
    `${appUrl}/api/integrations/microsoft/callback`;

  return {
    appUrl,
    clientId,
    clientSecret,
    tenant,
    redirectUri,
    scope: MS_SCOPES,
    authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
  };
}

export function encodeMicrosoftOAuthState(
  workspaceId: string,
  returnPath?: string | null,
) {
  const path = (returnPath || "").trim();
  if (!path || path === "/settings") return workspaceId;
  return `${workspaceId}|${encodeURIComponent(path)}`;
}

export function decodeMicrosoftOAuthState(state: string | null): {
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

export function buildMicrosoftAuthorizeUrl(
  workspaceId: string,
  loginHint?: string | null,
  returnPath?: string | null,
) {
  const { clientId, redirectUri, scope, authorizeUrl } = getMicrosoftOAuthConfig();
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope,
    state: encodeMicrosoftOAuthState(workspaceId, returnPath),
    prompt: "consent",
  });

  const hint = loginHint?.trim();
  if (hint) params.set("login_hint", hint);

  return `${authorizeUrl}?${params.toString()}`;
}
