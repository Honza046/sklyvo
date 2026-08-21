import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { createSessionTokenForUser } from "@/lib/session-cookie";

function resolveOrigin(request: NextRequest): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = resolveOrigin(request);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const oauthErrorCode = url.searchParams.get("error_code");
  const oauthErrorDescription = url.searchParams.get("error_description");
  const next = url.searchParams.get("next")?.startsWith("/")
    ? url.searchParams.get("next")!
    : "/";

  if (oauthError || !code) {
    console.error("auth/callback missing code / provider error:", {
      oauthError,
      oauthErrorCode,
      oauthErrorDescription,
    });

    const loginUrl = new URL("/login", origin);
    const description = (oauthErrorDescription || "").toLowerCase();
    if (description.includes("email")) {
      loginUrl.searchParams.set("oauth_error", "email");
    } else if (oauthError) {
      loginUrl.searchParams.set("oauth_error", "provider");
    } else {
      loginUrl.searchParams.set("oauth_error", "callback");
    }
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "auth/callback: missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY",
    );
    return NextResponse.redirect(
      new URL("/login?oauth_error=exchange", origin),
    );
  }

  // Cookies must be written onto the redirect response (PKCE code verifier + session).
  let response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("auth/callback exchangeCodeForSession:", {
      message: exchangeError.message,
      status: exchangeError.status,
      name: exchangeError.name,
    });
    return NextResponse.redirect(
      new URL("/login?oauth_error=exchange", origin),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error(
      "auth/callback getUser:",
      userError?.message ?? "missing user",
    );
    return NextResponse.redirect(new URL("/login?oauth_error=user", origin));
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const meta = user.user_metadata ?? {};
  const facebookIdentity = user.identities?.find(
    (identity) => identity.provider === "facebook",
  );
  const linkedInIdentity = user.identities?.find(
    (identity) =>
      identity.provider === "linkedin_oidc" || identity.provider === "linkedin",
  );
  const oauthIdentity =
    facebookIdentity || linkedInIdentity || user.identities?.[0];

  let graphEmail: string | null = null;
  let graphName: string | null = null;
  const providerToken = session?.provider_token;
  if (!user.email?.trim() && facebookIdentity && providerToken) {
    try {
      const graphResponse = await fetch(
        `https://graph.facebook.com/me?fields=email,name&access_token=${encodeURIComponent(providerToken)}`,
      );
      if (graphResponse.ok) {
        const graphUser = (await graphResponse.json()) as {
          email?: string;
          name?: string;
        };
        if (typeof graphUser.email === "string" && graphUser.email.trim()) {
          graphEmail = graphUser.email.trim();
        }
        if (typeof graphUser.name === "string" && graphUser.name.trim()) {
          graphName = graphUser.name.trim();
        }
      } else {
        console.error(
          "auth/callback Facebook Graph /me failed:",
          graphResponse.status,
          await graphResponse.text(),
        );
      }
    } catch (error) {
      console.error("auth/callback Facebook Graph /me error:", error);
    }
  }

  // Prefer real provider email; only then fall back to a stable synthetic address.
  const email =
    user.email?.trim() ||
    graphEmail ||
    (typeof meta.email === "string" && meta.email.trim()) ||
    (oauthIdentity
      ? `${oauthIdentity.provider}_${oauthIdentity.id}@oauth.sklyvo.local`
      : null);

  if (!email) {
    console.error("auth/callback getUser: missing email and provider identity");
    return NextResponse.redirect(new URL("/login?oauth_error=email", origin));
  }

  const isSyntheticEmail = email.endsWith("@oauth.sklyvo.local");

  let dbUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  // If Graph later returns a real email, upgrade an existing synthetic Facebook user.
  if (
    !dbUser &&
    graphEmail &&
    facebookIdentity &&
    !graphEmail.endsWith("@oauth.sklyvo.local")
  ) {
    const synthetic = `facebook_${facebookIdentity.id}@oauth.sklyvo.local`;
    const existingSynthetic = await prisma.user.findFirst({
      where: { email: { equals: synthetic, mode: "insensitive" } },
    });
    if (existingSynthetic) {
      dbUser = await prisma.user.update({
        where: { id: existingSynthetic.id },
        data: { email: graphEmail },
      });
    }
  }

  if (!dbUser) {
    const linkedInName = [meta.given_name, meta.family_name]
      .filter(
        (part): part is string =>
          typeof part === "string" && part.trim().length > 0,
      )
      .join(" ")
      .trim();

    const displayName =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      graphName ||
      linkedInName ||
      (isSyntheticEmail ? "Uživatel" : email.split("@")[0]) ||
      "Uživatel";

    const avatarUrl =
      (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
      (typeof meta.picture === "string" && meta.picture.trim()) ||
      undefined;

    const workspace = await prisma.workspace.create({
      data: {
        name: `Prostor - ${displayName}`,
      },
    });

    dbUser = await prisma.user.create({
      data: {
        email,
        name: displayName,
        passwordHash: `__oauth__${randomUUID()}`,
        workspaceId: workspace.id,
        role: "OWNER",
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });
  }

  if (dbUser.disabledAt) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("oauth_error", "disabled");
    return NextResponse.redirect(loginUrl);
  }

  const token = await createSessionTokenForUser(dbUser.id);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  // Prompt user to set a real email when Facebook never provided one.
  if (isSyntheticEmail) {
    response = NextResponse.redirect(new URL("/account?needs_email=1", origin));
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  }

  return response;
}
