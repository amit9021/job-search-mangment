-- CreateTable
CREATE TABLE "JobNote" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "userId" TEXT,
  CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobNote_jobId_idx" ON "JobNote" ("jobId");
CREATE INDEX "JobNote_userId_idx" ON "JobNote" ("userId");

-- AddForeignKey
ALTER TABLE "JobNote"
  ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobNote"
  ADD CONSTRAINT "JobNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
