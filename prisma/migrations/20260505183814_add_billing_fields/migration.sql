/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,placeId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "value" INTEGER DEFAULT 0,
ALTER COLUMN "domain" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "offeredServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subscriptionPeriodEnd" TIMESTAMP(3),
ALTER COLUMN "subscriptionStatus" SET DEFAULT 'FREE',
ALTER COLUMN "trialEndsAt" DROP NOT NULL,
ALTER COLUMN "trialEndsAt" DROP DEFAULT,
ALTER COLUMN "planTier" SET DEFAULT 'NONE',
ALTER COLUMN "creditsTotal" SET DEFAULT 10;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_createdAt_idx" ON "ActivityLog"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Lead_workspaceId_domain_idx" ON "Lead"("workspaceId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_workspaceId_placeId_key" ON "Lead"("workspaceId", "placeId");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
