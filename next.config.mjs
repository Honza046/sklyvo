/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;
