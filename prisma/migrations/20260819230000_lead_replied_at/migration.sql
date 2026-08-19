ALTER TABLE "Lead" ADD COLUMN "repliedAt" TIMESTAMP(3);

UPDATE "Lead"
SET "repliedAt" = "updatedAt"
WHERE status = 'REPLIED' AND "repliedAt" IS NULL;

CREATE INDEX "Lead_workspaceId_repliedAt_idx" ON "Lead"("workspaceId", "repliedAt");
