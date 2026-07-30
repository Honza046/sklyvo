import { NextRequest, NextResponse } from "next/server";
import {
  decodeMicrosoftOAuthState,
  getMicrosoftOAuthConfig,
} from "@/lib/microsoft-oauth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { appUrl, clientId, clientSecret, redirectUri, tokenUrl } =
    getMicrosoftOAuthConfig();

  const code = request.nextUrl.searchParams.get("code");
  const rawState = request.nextUrl.searchParams.get("state");
  const { workspaceId, returnPath } = decodeMicrosoftOAuthState(rawState);
  const oauthError = request.nextUrl.searchParams.get("error");

  const redirectBase = new URL(returnPath.split("#")[0] || "/settings", appUrl);
  if (returnPath.includes("#")) {
    redirectBase.hash = returnPath.split("#")[1] || "";
  } else if (returnPath.startsWith("/settings")) {
    redirectBase.hash = "integrations";
  }

  if (oauthError) {
    redirectBase.searchParams.set(
      "msError",
      encodeURIComponent("Microsoft připojení bylo zrušeno."),
    );
    return NextResponse.redirect(redirectBase);
  }

  if (!code || !workspaceId) {
    redirectBase.searchParams.set(
      "msError",
      encodeURIComponent("Chybí autorizační kód od Microsoftu."),
    );
    return NextResponse.redirect(redirectBase);
  }

  if (!clientId || !clientSecret) {
    redirectBase.searchParams.set(
      "msError",
      encodeURIComponent("Microsoft OAuth není na serveru nakonfigurován."),
    );
    return NextResponse.redirect(redirectBase);
  }

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
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
        "msError",
        encodeURIComponent(tokenJson.error_description ?? "Microsoft token exchange selhal."),
      );
      return NextResponse.redirect(redirectBase);
    }

    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await profileResponse.json()) as {
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };

    const expiresAt =
      typeof tokenJson.expires_in === "number"
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null;

    const existing = await prisma.workspaceMicrosoftConnection.findUnique({
      where: { workspaceId },
      select: { msRefreshToken: true },
    });
    const refreshToken =
      tokenJson.refresh_token ?? existing?.msRefreshToken ?? null;

    await prisma.workspaceMicrosoftConnection.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        status: "CONNECTED",
        msAccessToken: tokenJson.access_token,
        msRefreshToken: refreshToken,
        msTokenExpiresAt: expiresAt,
        msAccountEmail:
          profile.mail?.trim() || profile.userPrincipalName?.trim() || null,
        msDisplayName: profile.displayName?.trim() || null,
        lastError: null,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        msAccessToken: tokenJson.access_token,
        ...(tokenJson.refresh_token
          ? { msRefreshToken: tokenJson.refresh_token }
          : refreshToken
            ? { msRefreshToken: refreshToken }
            : {}),
        msTokenExpiresAt: expiresAt,
        msAccountEmail:
          profile.mail?.trim() || profile.userPrincipalName?.trim() || null,
        msDisplayName: profile.displayName?.trim() || null,
        lastError: null,
        connectedAt: new Date(),
      },
    });

    redirectBase.searchParams.set("msConnected", "1");
    return NextResponse.redirect(redirectBase);
  } catch (error) {
    console.error("Microsoft OAuth callback:", error);
    redirectBase.searchParams.set(
      "msError",
      encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Nepodařilo se dokončit Microsoft propojení.",
      ),
    );
    return NextResponse.redirect(redirectBase);
  }
}
