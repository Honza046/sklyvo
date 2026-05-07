import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"; // Přidali jsme import
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Outreach Agent",
  description: "Digitální agentura — Sniper, Radar, CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ODSTRANĚNO: className="dark" z tagu html
    <html lang="cs" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrains.variable} min-h-screen font-sans`}
      >
        {/* PŘIDÁNO: ThemeProvider obalující celou aplikaci */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light" // Nastavil jsem výchozí na tvůj oblíbený světlý clean look
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        
        {/* Tímto aktivujeme vyskakovací notifikace v celé appce */}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}