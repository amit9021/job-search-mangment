-- CreateTable: Tasks for execution tracking
CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Todo',
  "priority" TEXT NOT NULL DEFAULT 'Med',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "dueAt" TIMESTAMP(3),
  "startAt" TIMESTAMP(3),
  "recurrence" TEXT,
  "source" TEXT NOT NULL DEFAULT 'Manual',
  "links" JSONB,
  "checklist" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- Indexes to help list views
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");
CREATE INDEX "Task_status_idx" ON "Task"("status");
