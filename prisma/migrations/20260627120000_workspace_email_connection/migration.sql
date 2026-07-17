-- CreateEnum
CREATE TYPE "EmailConnectionProvider" AS ENUM ('GOOGLE', 'OUTLOOK_SMTP', 'CUSTOM_SMTP');

-- CreateEnum
CREATE TYPE "EmailConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "WorkspaceEmailConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceEmailConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceEmailConnection_workspaceId_key" ON "WorkspaceEmailConnection"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceEmailConnection" ADD CONSTRAINT "WorkspaceEmailConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
