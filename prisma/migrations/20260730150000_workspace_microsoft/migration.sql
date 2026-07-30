-- CreateTable
CREATE TABLE "WorkspaceMicrosoftConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "EmailConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "msAccessToken" TEXT,
    "msRefreshToken" TEXT,
    "msTokenExpiresAt" TIMESTAMP(3),
    "msAccountEmail" TEXT,
    "msDisplayName" TEXT,
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMicrosoftConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMicrosoftConnection_workspaceId_key" ON "WorkspaceMicrosoftConnection"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceMicrosoftConnection" ADD CONSTRAINT "WorkspaceMicrosoftConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
