import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Service worker was flashing Safari’s “This page couldn’t load” before every visit.
  // Keep PWA tooling in-repo, but don’t register a SW until that’s fixed.
  disable: true,
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const isProd = process.env.NODE_ENV === "production";

/**
 * Browser hardening. HSTS + upgrade-insecure-requests only in production —
 * on http://localhost they force HTTPS subresources and CSS/JS die.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com https://login.microsoftonline.com https://*.supabase.co",
      // Next hydration + Stripe.js still need inline/eval in practice without nonces.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // http/ws needed for local Next HMR; production traffic is https/wss anyway.
      "connect-src 'self' https: http: wss: ws:",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://login.microsoftonline.com https://*.supabase.co",
      "worker-src 'self' blob:",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serwist injects webpack config; Next 16 defaults to Turbopack for `next dev`.
  // Pin root to Backend so the parent Sklyvo lockfile isn't treated as the workspace.
  turbopack: {
    root: import.meta.dirname,
  },
  // Localhost vs 127.0.0.1 — bez toho Next 16 blokuje client JS / HMR a onboarding tlačítka „nefungují“.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Native modul — Turbopack ho nesmí balit do SSR chunků.
  serverExternalPackages: ["sharp"],
  // Noto Sans TTFs used by offer PDF generation (Czech diacritics)
  outputFileTracingIncludes: {
    "/app/**/*": ["./lib/fonts/**/*"],
  },
  // Skrýt Next.js badge „N / Rendering“ vlevo dole (není to chatbot).
  devIndicators: false,
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
    serverActions: {
      /** Base64 PDF v `generateEmailContent` — výchozí limit Next je příliš malý. */
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async rewrites() {
    /**
     * Vercel: soubory v `/api/*.py` jsou samostatné serverless funkce — směrování
     * `/api/sniper` → Python řeší platforma, Next rewrite v produkci nepotřebuješ.
     *
     * Dev: pokud někde zůstane relativní `fetch("/api/sniper")`, pošli to na FastAPI
     * na stejné cestě `/api/sniper` (uvicorn musí mít v `sniper.py` i @app.post("/api/sniper")).
     */
    const backend = (process.env.SKLYVO_API_URL || process.env.VENEGARD_API_URL || "http://127.0.0.1:8000").replace(
      /\/$/,
      "",
    );
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);
