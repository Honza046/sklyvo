import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseOAuthState(raw: string | null): { userId?: string; workspaceId?: string } {
  const value = (raw ?? "").trim();
  if (!value) return {};
  if (value.startsWith("user:")) {
    return { userId: value.slice("user:".length).trim() || undefined };
  }
  // Legacy: state = workspaceId
  return { workspaceId: value };
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settingsUrl = new URL("/settings", appUrl);
  settingsUrl.hash = "email-integration";

  const code = request.nextUrl.searchParams.get("code");
  const state = parseOAuthState(request.nextUrl.searchParams.get("state"));
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    settingsUrl.searchParams.set("emailError", encodeURIComponent("Google připojení bylo zrušeno."));
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || (!state.userId && !state.workspaceId)) {
    settingsUrl.searchParams.set(
      "emailError",
      encodeURIComponent("Chybí autorizační kód od Google."),
    );
    return NextResponse.redirect(settingsUrl);
  }

  const clientId = process.env.GOOGLE_EMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_EMAIL_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_EMAIL_REDIRECT_URI?.trim() || `${appUrl}/api/email/google/callback`;

  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set(
      "emailError",
      encodeURIComponent("Google OAuth není na serveru nakonfigurován."),
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
        "emailError",
        encodeURIComponent(tokenJson.error_description ?? "Google token exchange selhal."),
      );
      return NextResponse.redirect(settingsUrl);
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileResponse.json()) as { email?: string; name?: string };

    const expiresAt =
      typeof tokenJson.expires_in === "number"
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

    if (state.userId) {
      const user = await prisma.user.findUnique({
        where: { id: state.userId },
        select: { id: true },
      });
      if (!user) {
        settingsUrl.searchParams.set(
          "emailError",
          encodeURIComponent("Uživatel pro Google propojení nebyl nalezen."),
        );
        return NextResponse.redirect(settingsUrl);
      }

      const existing = await prisma.userEmailConnection.findUnique({
        where: { userId: state.userId },
        select: { googleRefreshToken: true },
      });
      const refreshToken = tokenJson.refresh_token ?? existing?.googleRefreshToken ?? null;

      await prisma.userEmailConnection.upsert({
        where: { userId: state.userId },
        create: {
          userId: state.userId,
          provider: "GOOGLE",
          status: "CONNECTED",
          senderName: profile.name?.trim() || null,
          senderEmail: profile.email?.trim() || null,
          googleAccessToken: tokenJson.access_token,
          googleRefreshToken: refreshToken,
          googleTokenExpiresAt: expiresAt,
          connectedAt: new Date(),
          lastError: null,
        },
        update: {
          provider: "GOOGLE",
          status: "CONNECTED",
          senderName: profile.name?.trim() || null,
          senderEmail: profile.email?.trim() || null,
          smtpHost: null,
          smtpPort: null,
          smtpSecret: null,
          googleAccessToken: tokenJson.access_token,
          ...(tokenJson.refresh_token ? { googleRefreshToken: tokenJson.refresh_token } : {}),
          googleTokenExpiresAt: expiresAt,
          connectedAt: new Date(),
          lastError: null,
        },
      });
    } else if (state.workspaceId) {
      // Legacy workspace-level OAuth (starší odkazy)
      const existing = await prisma.workspaceEmailConnection.findUnique({
        where: { workspaceId: state.workspaceId },
        select: { googleRefreshToken: true },
      });
      const refreshToken = tokenJson.refresh_token ?? existing?.googleRefreshToken ?? null;

      await prisma.workspaceEmailConnection.upsert({
        where: { workspaceId: state.workspaceId },
        create: {
          workspaceId: state.workspaceId,
          provider: "GOOGLE",
          status: "CONNECTED",
          senderName: profile.name?.trim() || null,
          senderEmail: profile.email?.trim() || null,
          googleAccessToken: tokenJson.access_token,
          googleRefreshToken: refreshToken,
          googleTokenExpiresAt: expiresAt,
          connectedAt: new Date(),
          lastError: null,
        },
        update: {
          provider: "GOOGLE",
          status: "CONNECTED",
          senderName: profile.name?.trim() || null,
          senderEmail: profile.email?.trim() || null,
          smtpHost: null,
          smtpPort: null,
          smtpSecret: null,
          googleAccessToken: tokenJson.access_token,
          ...(tokenJson.refresh_token ? { googleRefreshToken: tokenJson.refresh_token } : {}),
          googleTokenExpiresAt: expiresAt,
          connectedAt: new Date(),
          lastError: null,
        },
      });
    }

    settingsUrl.searchParams.set("emailConnected", "google");
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error("Google email OAuth callback:", error);
    settingsUrl.searchParams.set(
      "emailError",
      encodeURIComponent("Nepodařilo se dokončit Google propojení."),
    );
    return NextResponse.redirect(settingsUrl);
  }
}
