import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/components/sklyvo/app-ui.css";
import { AppProviders } from "@/components/app-providers";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { UnregisterServiceWorker } from "@/components/unregister-service-worker";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const APP_NAME = "Sklyvo";
const APP_DEFAULT_TITLE = "Sklyvo";
const APP_TITLE_TEMPLATE = "%s · Sklyvo";
const APP_DESCRIPTION = "Sklyvo je nástroj na hledání a oslovování klientů";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/brand/sklyvo-mark.png", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/brand/sklyvo-mark.png", type: "image/png" }],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#02a7ff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body
        className={`${jakarta.variable} ${jetbrains.variable} min-h-dvh font-sans`}
        style={{
          fontFamily: "var(--font-jakarta), Helvetica, Arial, sans-serif",
        }}
      >
        <UnregisterServiceWorker />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
