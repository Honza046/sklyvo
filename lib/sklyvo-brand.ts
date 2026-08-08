/**
 * Single source of truth for Sklyvo product branding in system e-mails & UI.
 * Override via env in production without code changes.
 */

function trimEnv(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

export const SKLYVO_BRAND = {
  name: "Sklyvo",
  companyName: trimEnv("SKLYVO_COMPANY_NAME") ?? "Venegard s.r.o.",
  supportEmail: trimEnv("SKLYVO_SUPPORT_EMAIL") ?? "podpora@venegard.com",
  phone: trimEnv("SKLYVO_PHONE") ?? "+420 605 875 808",
  websiteLabel: trimEnv("SKLYVO_WEBSITE_LABEL") ?? "sklyvo.com",
  websiteUrl: trimEnv("SKLYVO_WEBSITE_URL") ?? "https://sklyvo.com",
  address: trimEnv("SKLYVO_COMPANY_ADDRESS") ?? "",
  brandColor: "#02a7ff",
  brandColorDark: "#0290e0",
  ink: "#1a2332",
  muted: "#64748b",
} as const;

export function getAppBaseUrl(): string {
  const explicit =
    trimEnv("NEXT_PUBLIC_APP_URL") ||
    trimEnv("APP_URL") ||
    trimEnv("NEXTAUTH_URL");
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = trimEnv("VERCEL_URL");
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

export function getBrandLogoUrl(): string {
  return `${getAppBaseUrl()}/brand/sklyvo-mark.png`;
}

export function getAccountSettingsUrl(): string {
  return `${getAppBaseUrl()}/account`;
}

export function getHelpUrl(): string {
  return `${getAppBaseUrl()}/help`;
}
