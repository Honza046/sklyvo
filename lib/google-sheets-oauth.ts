const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
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

  return { appUrl, clientId, clientSecret, redirectUri, scope: SHEETS_SCOPES };
}

export function buildGoogleSheetsAuthorizeUrl(
  workspaceId: string,
  loginHint?: string | null,
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
    state: workspaceId,
  });

  const hint = loginHint?.trim();
  if (hint) {
    params.set("login_hint", hint);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
