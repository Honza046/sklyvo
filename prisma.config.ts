import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * URL pro Prisma CLI (migrate, introspect, atd.).
 * Pokud je nastavené DIRECT_URL (např. přímé připojení mimo pooler), použije se pro migrace.
 */
function prismaCliDatasourceUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  return env("DATABASE_URL");
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
