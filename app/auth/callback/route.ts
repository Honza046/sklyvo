import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

function resolveOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
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
  const next = url.searchParams.get("next")?.startsWith("/")
    ? url.searchParams.get("next")!
    : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?oauth_error=callback", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("auth/callback: missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY");
    return NextResponse.redirect(new URL("/login?oauth_error=exchange", origin));
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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("auth/callback exchangeCodeForSession:", {
      message: exchangeError.message,
      status: exchangeError.status,
      name: exchangeError.name,
    });
    return NextResponse.redirect(new URL("/login?oauth_error=exchange", origin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email?.trim()) {
    console.error("auth/callback getUser:", userError?.message ?? "missing email");
    return NextResponse.redirect(new URL("/login?oauth_error=user", origin));
  }

  const email = user.email.trim();
  const meta = user.user_metadata ?? {};

  let dbUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (!dbUser) {
    const displayName =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      email.split("@")[0] ||
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

  const token = await createSessionToken(dbUser.id);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  return response;
}
