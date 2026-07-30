import { NextRequest, NextResponse } from "next/server";
import {
  decodeGoogleOAuthState,
  getGoogleSheetsOAuthConfig,
} from "@/lib/google-sheets-oauth";
import {
  createCrmSpreadsheet,
  writeVenegardCrmWorkbook,
} from "@/lib/google-sheets-sync";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { appUrl, clientId, clientSecret, redirectUri } = getGoogleSheetsOAuthConfig();

  const code = request.nextUrl.searchParams.get("code");
  const rawState = request.nextUrl.searchParams.get("state");
  const { workspaceId, returnPath } = decodeGoogleOAuthState(rawState);
  const oauthError = request.nextUrl.searchParams.get("error");

  const redirectBase = new URL(returnPath.split("#")[0] || "/settings", appUrl);
  if (returnPath.includes("#")) {
    redirectBase.hash = returnPath.split("#")[1] || "";
  } else if (returnPath.startsWith("/settings")) {
    redirectBase.hash = "integrations";
  }

  if (oauthError) {
    redirectBase.searchParams.set(
      "sheetsError",
      encodeURIComponent("Google připojení bylo zrušeno."),
    );
    return NextResponse.redirect(redirectBase);
  }

  if (!code || !workspaceId) {
    redirectBase.searchParams.set(
      "sheetsError",
      encodeURIComponent("Chybí autorizační kód od Google."),
    );
    return NextResponse.redirect(redirectBase);
  }

  if (!clientId || !clientSecret) {
    redirectBase.searchParams.set(
      "sheetsError",
      encodeURIComponent("Google OAuth není na serveru nakonfigurován."),
    );
    return NextResponse.redirect(redirectBase);
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
      redirectBase.searchParams.set(
        "sheetsError",
        encodeURIComponent(tokenJson.error_description ?? "Google token exchange selhal."),
      );
      return NextResponse.redirect(redirectBase);
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileResponse.json()) as { email?: string };

    const existing = await prisma.workspaceGoogleSheetsConnection.findUnique({
      where: { workspaceId },
      select: {
        googleRefreshToken: true,
        spreadsheetId: true,
        spreadsheetUrl: true,
        spreadsheetTitle: true,
        sheetName: true,
      },
    });

    let spreadsheetId = existing?.spreadsheetId ?? null;
    let spreadsheetUrl = existing?.spreadsheetUrl ?? null;
    let spreadsheetTitle = existing?.spreadsheetTitle ?? null;
    const sheetName = existing?.sheetName || "Vše";

    if (!spreadsheetId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });
      const title = `Venegard CRM – ${workspace?.name?.trim() || "workspace"}`;
      const created = await createCrmSpreadsheet(tokenJson.access_token, title);
      await writeVenegardCrmWorkbook({
        accessToken: tokenJson.access_token,
        spreadsheetId: created.spreadsheetId,
        workspaceId,
      });
      spreadsheetId = created.spreadsheetId;
      spreadsheetUrl = created.spreadsheetUrl;
      spreadsheetTitle = title;
    }

    const expiresAt =
      typeof tokenJson.expires_in === "number"
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

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
        spreadsheetId,
        spreadsheetUrl,
        spreadsheetTitle,
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
        spreadsheetId,
        spreadsheetUrl,
        spreadsheetTitle,
        sheetName,
        lastError: null,
        connectedAt: new Date(),
      },
    });

    redirectBase.searchParams.set("googleConnected", "1");
    return NextResponse.redirect(redirectBase);
  } catch (error) {
    console.error("Google Sheets OAuth callback:", error);
    redirectBase.searchParams.set(
      "sheetsError",
      encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Nepodařilo se dokončit Google propojení.",
      ),
    );
    return NextResponse.redirect(redirectBase);
  }
}
