import {
  createSignedOAuthState,
  verifySignedOAuthState,
} from "@/lib/oauth-state";

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

  return {
    appUrl,
    clientId,
    clientSecret,
    redirectUri,
    scope: GOOGLE_WORKSPACE_SCOPES,
  };
}

export function encodeGoogleOAuthState(
  workspaceId: string,
  returnPath?: string | null,
) {
  return createSignedOAuthState({
    kind: "google_sheets",
    workspaceId,
    returnPath,
  });
}

export function decodeGoogleOAuthState(state: string | null): {
  workspaceId: string | null;
  returnPath: string;
} {
  const claims = verifySignedOAuthState(state, "google_sheets");
  if (!claims) {
    return { workspaceId: null, returnPath: "/settings#integrations" };
  }
  return {
    workspaceId: claims.workspaceId,
    returnPath: claims.returnPath || "/settings#integrations",
  };
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
