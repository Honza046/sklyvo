-- AlterTable
ALTER TABLE "RadarSettings" ADD COLUMN IF NOT EXISTS "countryCode" TEXT NOT NULL DEFAULT 'CZ';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "countryCode" TEXT;
