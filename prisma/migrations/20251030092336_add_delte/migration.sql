-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Job_archived_idx" ON "Job"("archived");
