-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('PERSONAL', 'SHARED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('UPLOAD', 'OFFER', 'CONTRACT');

-- CreateTable
CREATE TABLE "WorkspaceDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "scope" "DocumentScope" NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'UPLOAD',
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceDocument_workspaceId_scope_idx" ON "WorkspaceDocument"("workspaceId", "scope");

-- CreateIndex
CREATE INDEX "WorkspaceDocument_workspaceId_ownerUserId_scope_idx" ON "WorkspaceDocument"("workspaceId", "ownerUserId", "scope");

-- AddForeignKey
ALTER TABLE "WorkspaceDocument" ADD CONSTRAINT "WorkspaceDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceDocument" ADD CONSTRAINT "WorkspaceDocument_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
