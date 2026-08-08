import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * URL for Prisma CLI (migrate, introspect, generate).
 * Prefer DIRECT_URL for migrations when using a pooler.
 * Generate does not connect, so a placeholder is fine when env is missing
 * (e.g. Vercel install before secrets are wired).
 */
function prismaCliDatasourceUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  return "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: prismaCliDatasourceUrl(),
  },
});
