import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

/** Bump when Prisma schema changes require a fresh dev client (HMR keeps old singleton). */
const PRISMA_SCHEMA_FINGERPRINT = "workspace-email-connection-v1";

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

/** Dev HMR can keep an outdated client after `prisma generate` — recreate if delegates are missing. */
function isStalePrismaClient(client: PrismaClient | undefined): boolean {
  if (!client) return true;
  const fingerprinted = client as PrismaSingleton;
  if (fingerprinted.__fingerprint !== PRISMA_SCHEMA_FINGERPRINT) {
    return true;
  }
  return (
    !("radarSettings" in client) ||
    !("emailQueue" in client) ||
    !("workspaceEmailConnection" in client)
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
