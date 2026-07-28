import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/")
    ? url.searchParams.get("next")!
    : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?oauth_error=callback", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("auth/callback exchangeCodeForSession:", exchangeError);
    return NextResponse.redirect(new URL("/login?oauth_error=exchange", url.origin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email?.trim()) {
    return NextResponse.redirect(new URL("/login?oauth_error=user", url.origin));
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

  const cookieStore = await cookies();
  const token = await createSessionToken(dbUser.id);
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());

  return NextResponse.redirect(new URL(next, url.origin));
}
