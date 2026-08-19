import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

 // Bump when schema changes require a fresh client
 const PRISMA_SCHEMA_FINGERPRINT = "lead-replied-at-v3";

type PrismaSingleton = PrismaClient & {
 __fingerprint?: string;
};

declare global {
 // eslint-disable-next-line no-var
 var prisma: undefined | PrismaClient;
 // eslint-disable-next-line no-var
 var __prismaPool: undefined | Pool;
}

function generatedSchemaHasLeadField(field: string): boolean {
 try {
 const lead = Prisma.dmmf.datamodel.models.find((model) => model.name === "Lead");
 return Boolean(lead?.fields.some((f) => f.name === field));
 } catch {
 return true;
 }
}

function runtimeModelHasField(client: PrismaClient, model: string, field: string): boolean {
 try {
 const runtime = (
 client as unknown as {
 _runtimeDataModel?: {
 models?: Record<
 string,
 {
 fields?:
 | Record<string, unknown>
 | Array<{ name?: string }>
 }
 >;
 };
 }
 )._runtimeDataModel;
 const fields = runtime?.models?.[model]?.fields;
 if (!fields) return false;
 if (Array.isArray(fields)) {
 return fields.some((f) => f?.name === field);
 }
 return field in fields;
 } catch {
 return false;
 }
}

function disposePrismaClient(client: PrismaClient | undefined) {
 if (!client) return;
 void client.$disconnect().catch(() => undefined);
}

const prismaClientSingleton = (): PrismaClient => {
 const prevClient = globalThis.prisma;
 const prevPool = globalThis.__prismaPool;

 // Nejdřív nový pool + client, teprve pak úklid starého
 // (jinak in-flight requesty dostanou "Cannot use a pool after calling end")
 const pool = new Pool({ connectionString });
 const adapter = new PrismaPg(pool);
 const client = new PrismaClient({ adapter }) as PrismaSingleton;
 client.__fingerprint = PRISMA_SCHEMA_FINGERPRINT;

 globalThis.__prismaPool = pool;
 globalThis.prisma = client;

 if (prevClient || prevPool) {
 setTimeout(() => {
 disposePrismaClient(prevClient);
 if (prevPool && prevPool !== globalThis.__prismaPool) {
 void prevPool.end().catch(() => undefined);
 }
 }, 2_000);
 }

 return client;
};

function runtimeHasModelDelegate(client: PrismaClient, model: string): boolean {
 try {
 const delegate = (client as unknown as Record<string, unknown>)[model];
 if (!delegate || typeof delegate !== "object") return false;
 const methods = delegate as Record<string, unknown>;
 return typeof methods.findMany === "function" && typeof methods.create === "function";
 } catch {
 return false;
 }
}

/** Dev HMR can keep an outdated client after `prisma generate` — recreate if schema drifted. */
function isStalePrismaClient(client: PrismaClient | undefined): boolean {
 if (!client) return true;

 const fingerprinted = client as PrismaSingleton;
 if (fingerprinted.__fingerprint !== PRISMA_SCHEMA_FINGERPRINT) {
 return true;
 }

 // Generated package itself is behind (should not happen after prisma generate).
 if (!generatedSchemaHasLeadField("repliedAt")) {
   return true;
 }

 if (!generatedSchemaHasLeadField("websiteVisitedAt")) {
   return true;
 }

 if (!runtimeModelHasField(client, "Lead", "websiteVisitedAt")) {
 return true;
 }
 if (!runtimeModelHasField(client, "Lead", "author")) {
 return true;
 }
 if (!runtimeModelHasField(client, "Lead", "faviconUrl")) {
 return true;
 }
 if (!runtimeModelHasField(client, "Lead", "source")) {
 return true;
 }
 if (!runtimeModelHasField(client, "RadarSettings", "radarCronEnabled")) {
 return true;
 }
 if (!runtimeModelHasField(client, "RadarSettings", "emailSendCronEnabled")) {
 return true;
 }
 if (!runtimeModelHasField(client, "RadarSettings", "minCompaniesPerRun")) {
 return true;
 }
 if (!runtimeModelHasField(client, "Lead", "linkedinUrl")) {
   return true;
 }
 if (!runtimeModelHasField(client, "Lead", "repliedAt")) {
   return true;
 }
 if (!runtimeModelHasField(client, "RadarSettings", "sourcePlaces")) {
 return true;
 }
 if (!runtimeModelHasField(client, "User", "disabledAt")) {
 return true;
 }

 return (
 !runtimeHasModelDelegate(client, "radarSettings") ||
 !runtimeHasModelDelegate(client, "emailQueue") ||
 !runtimeHasModelDelegate(client, "userEmailConnection") ||
 !runtimeHasModelDelegate(client, "workspaceEmailConnection") ||
 !runtimeHasModelDelegate(client, "workspaceGoogleSheetsConnection") ||
 !runtimeHasModelDelegate(client, "workspaceMicrosoftConnection") ||
 !runtimeHasModelDelegate(client, "workspaceFakturoidConnection") ||
 !runtimeHasModelDelegate(client, "workspaceDocument") ||
 !runtimeHasModelDelegate(client, "adminAuditLog")
 );
}

function resetPrismaSingleton() {
 disposePrismaClient(globalThis.prisma);
 if (globalThis.__prismaPool) {
   void globalThis.__prismaPool.end().catch(() => undefined);
 }
 globalThis.prisma = undefined;
 globalThis.__prismaPool = undefined;
}

function isRepliedAtValidationError(error: unknown): boolean {
 return (
   error instanceof Prisma.PrismaClientValidationError &&
   error.message.includes("Unknown argument `repliedAt`")
 );
}

/** Dev safety net — po prisma generate obnoví singleton, když runtime ještě nezná repliedAt. */
export async function runPrismaQuery<T>(fn: () => Promise<T>): Promise<T> {
 try {
   return await fn();
 } catch (error) {
   if (process.env.NODE_ENV !== "production" && isRepliedAtValidationError(error)) {
     resetPrismaSingleton();
     return fn();
   }
   throw error;
 }
}

function getPrismaClient(): PrismaClient {
 if (process.env.NODE_ENV === "production") {
 if (!globalThis.prisma) {
 globalThis.prisma = prismaClientSingleton();
 }
 return globalThis.prisma;
 }

 if (isStalePrismaClient(globalThis.prisma)) {
 globalThis.prisma = prismaClientSingleton();
 }

 return globalThis.prisma!;
}

/**
 * Always resolve through getPrismaClient() so HMR / prisma generate
 * cannot leave callers stuck on a stale singleton export.
 *
 * Important: Reflect.get must use the real client as receiver so Prisma
 * model getters (userEmailConnection, lead, …) keep the correct `this`.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
 get(_target, prop) {
 const client = getPrismaClient();
 const value = Reflect.get(client, prop, client);
 return typeof value === "function" ? value.bind(client) : value;
 },
});
