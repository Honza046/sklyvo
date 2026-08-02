import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serwist injects webpack config; Next 16 defaults to Turbopack for `next dev`.
  // Empty turbopack config silences the conflict (SW is disabled in development).
  turbopack: {},
  // Native modul — Turbopack ho nesmí balit do SSR chunků.
  serverExternalPackages: ["sharp"],
  // Skrýt Next.js badge „N / Rendering“ vlevo dole (není to chatbot).
  devIndicators: false,
  experimental: {
    serverActions: {
      /** Base64 PDF v `generateEmailContent` — výchozí limit Next je příliš malý. */
      bodySizeLimit: "8mb",
    },
  },
  async rewrites() {
    /**
     * Vercel: soubory v `/api/*.py` jsou samostatné serverless funkce — směrování
     * `/api/sniper` → Python řeší platforma, Next rewrite v produkci nepotřebuješ.
     *
     * Dev: pokud někde zůstane relativní `fetch("/api/sniper")`, pošli to na FastAPI
     * na stejné cestě `/api/sniper` (uvicorn musí mít v `sniper.py` i @app.post("/api/sniper")).
     */
    const backend = (process.env.VENEGARD_API_URL || "http://127.0.0.1:8000").replace(
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
