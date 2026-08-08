import { NextResponse } from "next/server";

/**
 * Best-effort connection locale for the auth language toggle.
 * On Vercel / Cloudflare the country header is set from the edge IP.
 * (Node runtime — Edge bundling was crashing related middleware with __dirname.)
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
