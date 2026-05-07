import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session_user_id";

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

  const dbUser = await prisma.user.findFirst({
    where: {
      email: { equals: user.email.trim(), mode: "insensitive" },
    },
  });

  if (!dbUser) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?oauth_error=no_account", url.origin));
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, dbUser.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.redirect(new URL(next, url.origin));
}
