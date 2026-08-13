import { NextResponse } from "next/server";
import { getMicrosoftOAuthUrl } from "@/app/actions/microsoft";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnPath = url.searchParams.get("return") || "/settings/integrations";
  const result = await getMicrosoftOAuthUrl(returnPath);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.redirect(result.url);
}
