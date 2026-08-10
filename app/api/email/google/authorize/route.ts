import { NextResponse } from "next/server";
import { getGoogleEmailOAuthUrl } from "@/app/actions/email-connection";

export async function GET() {
  const result = await getGoogleEmailOAuthUrl();
  if ("error" in result && result.error) {
    const settingsUrl = new URL(
      "/settings",
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    );
    settingsUrl.hash = "email-integration";
    settingsUrl.searchParams.set(
      "emailError",
      encodeURIComponent(result.error),
    );
    return NextResponse.redirect(settingsUrl);
  }

  if (!result.url) {
    return NextResponse.json(
      { error: "OAuth URL nebyla vytvořena." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(result.url);
}
