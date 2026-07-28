-- AlterTable
ALTER TABLE "EmailQueue" ADD COLUMN IF NOT EXISTS "senderUserId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailQueue_senderUserId_idx" ON "EmailQueue"("senderUserId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserEmailConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailConnectionProvider",
    "status" "EmailConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "senderName" TEXT,
    "senderEmail" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecret" TEXT,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEmailConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserEmailConnection_userId_key" ON "UserEmailConnection"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserEmailConnection_userId_fkey'
  ) THEN
    ALTER TABLE "UserEmailConnection"
      ADD CONSTRAINT "UserEmailConnection_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
