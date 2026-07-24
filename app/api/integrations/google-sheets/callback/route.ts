import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetsOAuthConfig } from "@/lib/google-sheets-oauth";
import {
  createCrmSpreadsheet,
  writeVenegardCrmWorkbook,
} from "@/lib/google-sheets-sync";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { appUrl, clientId, clientSecret, redirectUri } = getGoogleSheetsOAuthConfig();
  const settingsUrl = new URL("/settings", appUrl);
  settingsUrl.hash = "integrations";

  const code = request.nextUrl.searchParams.get("code");
  const workspaceId = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    settingsUrl.searchParams.set(
      "sheetsError",
      encodeURIComponent("Google Sheets připojení bylo zrušeno."),
    );
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !workspaceId) {
    settingsUrl.searchParams.set(
      "sheetsError",
      encodeURIComponent("Chybí autorizační kód od Google."),
    );
    return NextResponse.redirect(settingsUrl);
  }

  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set(
      "sheetsError",
      encodeURIComponent("Google Sheets OAuth není na serveru nakonfigurován."),
    );
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenJson.access_token) {
      settingsUrl.searchParams.set(
        "sheetsError",
        encodeURIComponent(tokenJson.error_description ?? "Google token exchange selhal."),
      );
      return NextResponse.redirect(settingsUrl);
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileResponse.json()) as { email?: string };

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    const title = `Venegard CRM – ${workspace?.name?.trim() || "workspace"}`;
    const sheetName = "Vše";
    const created = await createCrmSpreadsheet(tokenJson.access_token, title);

    await writeVenegardCrmWorkbook({
      accessToken: tokenJson.access_token,
      spreadsheetId: created.spreadsheetId,
      workspaceId,
    });

    const expiresAt =
      typeof tokenJson.expires_in === "number"
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

    const existing = await prisma.workspaceGoogleSheetsConnection.findUnique({
      where: { workspaceId },
      select: { googleRefreshToken: true },
    });
    const refreshToken =
      tokenJson.refresh_token ?? existing?.googleRefreshToken ?? null;

    await prisma.workspaceGoogleSheetsConnection.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        status: "CONNECTED",
        googleAccessToken: tokenJson.access_token,
        googleRefreshToken: refreshToken,
        googleTokenExpiresAt: expiresAt,
        googleAccountEmail: profile.email?.trim() || null,
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        spreadsheetTitle: title,
        sheetName,
        syncEnabled: true,
        lastSyncedAt: new Date(),
        lastError: null,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        googleAccessToken: tokenJson.access_token,
        ...(tokenJson.refresh_token
          ? { googleRefreshToken: tokenJson.refresh_token }
          : refreshToken
            ? { googleRefreshToken: refreshToken }
            : {}),
        googleTokenExpiresAt: expiresAt,
        googleAccountEmail: profile.email?.trim() || null,
        spreadsheetId: created.spreadsheetId,
        spreadsheetUrl: created.spreadsheetUrl,
        spreadsheetTitle: title,
        sheetName,
        syncEnabled: true,
        lastSyncedAt: new Date(),
        lastError: null,
        connectedAt: new Date(),
      },
    });

    settingsUrl.searchParams.set("sheetsConnected", "1");
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error("Google Sheets OAuth callback:", error);
    settingsUrl.searchParams.set(
      "sheetsError",
      encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Nepodařilo se dokončit Google Sheets propojení.",
      ),
    );
    return NextResponse.redirect(settingsUrl);
  }
}
