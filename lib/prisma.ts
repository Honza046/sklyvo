import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

/** Bump when Prisma schema changes require a fresh dev client (HMR keeps old singleton). */
const PRISMA_SCHEMA_FINGERPRINT = "outreach-autopilot-power-toggles-v1";

type PrismaSingleton = PrismaClient & {
  __fingerprint?: string;
};

const prismaClientSingleton = (): PrismaClient => {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter }) as PrismaSingleton;
  client.__fingerprint = PRISMA_SCHEMA_FINGERPRINT;
  return client;
};

declare global {
  var prisma: undefined | PrismaClient;
}

function leadModelHasAuthorField(client: PrismaClient): boolean {
  try {
    const runtime = (client as unknown as {
      _runtimeDataModel?: { models?: Record<string, { fields?: Record<string, unknown> }> };
    })._runtimeDataModel;
    const fields = runtime?.models?.Lead?.fields;
    if (!fields) return true;
    return "author" in fields;
  } catch {
    return true;
  }
}

/** Dev HMR can keep an outdated client after `prisma generate` — recreate if delegates are missing. */
function isStalePrismaClient(client: PrismaClient | undefined): boolean {
  if (!client) return true;
  const fingerprinted = client as PrismaSingleton;
  if (fingerprinted.__fingerprint !== PRISMA_SCHEMA_FINGERPRINT) {
    return true;
  }
  if (!leadModelHasAuthorField(client)) {
    return true;
  }
  return (
    !("radarSettings" in client) ||
    !("emailQueue" in client) ||
    !("workspaceEmailConnection" in client) ||
    !("workspaceGoogleSheetsConnection" in client)
  );
}

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return globalThis.prisma ?? prismaClientSingleton();
  }

  if (isStalePrismaClient(globalThis.prisma)) {
    globalThis.prisma = prismaClientSingleton();
  }

  return globalThis.prisma!;
}

export const prisma: PrismaClient = getPrismaClient();
