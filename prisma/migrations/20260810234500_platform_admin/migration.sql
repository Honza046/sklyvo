-- Platform admin: disable users + audit log
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorUserId_idx" ON "AdminAuditLog"("actorUserId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");
