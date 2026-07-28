-- AlterEnum
CREATE TYPE "ContactedVia" AS ENUM ('SNIPER', 'AUTOPILOT_SNIPER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "contactedVia" "ContactedVia";
