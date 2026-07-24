import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/recovery",
  "/obnova-hesla",
  "/update-password",
  "/auth/callback",
  "/api/access-state",
]);

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/integrations/google-sheets/callback") ||
    pathname.startsWith("/api/email/google/callback")
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    // #region agent log
    fetch('http://127.0.0.1:7935/ingest/cd58245d-3cee-42b5-b476-9501fa947d37',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc49be'},body:JSON.stringify({sessionId:'dc49be',runId:'pre-fix',hypothesisId:'B',location:'middleware.ts:public',message:'Public path allowed',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.next();
  }

  const userId = request.cookies.get("session_user_id")?.value;
  if (!userId) {
    // #region agent log
    fetch('http://127.0.0.1:7935/ingest/cd58245d-3cee-42b5-b476-9501fa947d37',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc49be'},body:JSON.stringify({sessionId:'dc49be',runId:'pre-fix',hypothesisId:'B',location:'middleware.ts:redirect-login',message:'Unauthenticated redirect to login',data:{pathname,isObnovaHesla:pathname.startsWith('/obnova-hesla')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.redirect(new URL("/login", origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
