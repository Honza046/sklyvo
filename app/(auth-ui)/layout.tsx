import { headers } from "next/headers";
import type { Viewport } from "next";
import { AuthChrome } from "@/components/sklyvo/auth-shell";
import { AuthPageFrame } from "@/components/sklyvo/auth-page-frame";
import { resolveRegionalLocale } from "@/lib/sklyvo/locale";

export const viewport: Viewport = {
  themeColor: "#08090a",
};

export default async function AuthUiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const initialRegional = resolveRegionalLocale({
    country:
      requestHeaders.get("x-vercel-ip-country") ??
      requestHeaders.get("cf-ipcountry") ??
      requestHeaders.get("x-country-code"),
    acceptLanguage: requestHeaders.get("accept-language"),
  });

  return (
    <AuthPageFrame initialRegional={initialRegional}>
      <AuthChrome>{children}</AuthChrome>
    </AuthPageFrame>
  );
}
