import { PrismaClient } from '@prisma/client'

// Tento kód zajišťuje, že se nám při vývoji (kdy se aplikace neustále obnovuje)
// nevytvoří tisíce připojení k databázi, což by ji shodilo.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma