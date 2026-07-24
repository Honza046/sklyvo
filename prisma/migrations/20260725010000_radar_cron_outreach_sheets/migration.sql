-- LeadStatus: BREAK_UP
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'BREAK_UP';

-- LeadSource enum
DO $$ BEGIN
  CREATE TYPE "LeadSource" AS ENUM ('RADAR', 'SNIPER', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- OutreachKind enum
DO $$ BEGIN
  CREATE TYPE "OutreachKind" AS ENUM ('INITIAL', 'FOLLOW_UP', 'BREAKUP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- RadarSettings: last scheduled cron run
ALTER TABLE "RadarSettings" ADD COLUMN IF NOT EXISTS "lastScheduledRunAt" TIMESTAMP(3);

-- Lead: author, source, outreach schedule
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "author" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "source" "LeadSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextOutreachAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextOutreachKind" "OutreachKind";

CREATE INDEX IF NOT EXISTS "Lead_workspaceId_source_idx" ON "Lead"("workspaceId", "source");
CREATE INDEX IF NOT EXISTS "Lead_workspaceId_nextOutreachAt_idx" ON "Lead"("workspaceId", "nextOutreachAt");

-- EmailQueue: kind + sentAt
ALTER TABLE "EmailQueue" ADD COLUMN IF NOT EXISTS "kind" "OutreachKind" NOT NULL DEFAULT 'INITIAL';
ALTER TABLE "EmailQueue" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);

-- Google Sheets connection
CREATE TABLE IF NOT EXISTS "WorkspaceGoogleSheetsConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "EmailConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiresAt" TIMESTAMP(3),
    "googleAccountEmail" TEXT,
    "spreadsheetId" TEXT,
    "spreadsheetUrl" TEXT,
    "spreadsheetTitle" TEXT,
    "sheetName" TEXT NOT NULL DEFAULT 'CRM',
    "splitBySource" BOOLEAN NOT NULL DEFAULT false,
    "archiveSpreadsheetId" TEXT,
    "archiveSpreadsheetUrl" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceGoogleSheetsConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceGoogleSheetsConnection_workspaceId_key"
  ON "WorkspaceGoogleSheetsConnection"("workspaceId");

DO $$ BEGIN
  ALTER TABLE "WorkspaceGoogleSheetsConnection"
    ADD CONSTRAINT "WorkspaceGoogleSheetsConnection_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
