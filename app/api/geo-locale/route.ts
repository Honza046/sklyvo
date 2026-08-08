import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Best-effort connection locale for the auth language toggle.
 * On Vercel / Cloudflare the country header is set from the edge IP.
 */
export async function GET(request: Request) {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country-code") ??
    null;

  const acceptLanguage = request.headers.get("accept-language");

  return NextResponse.json({
    country: country && country !== "XX" ? country.toUpperCase() : null,
    acceptLanguage,
  });
}
