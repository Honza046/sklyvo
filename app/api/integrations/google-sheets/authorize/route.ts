import { NextResponse } from "next/server";
import { getGoogleSheetsOAuthUrl } from "@/app/actions/google-sheets";

export async function GET() {
  const result = await getGoogleSheetsOAuthUrl();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settingsUrl = new URL("/settings", appUrl);
  settingsUrl.hash = "integrations";

  if ("error" in result && result.error) {
    settingsUrl.searchParams.set(
      "sheetsError",
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
