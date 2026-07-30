-- AlterTable
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_tags_gin_idx" ON "Lead" USING GIN ("tags");
