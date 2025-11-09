-- Add user ownership columns to core tables
ALTER TABLE "Company" ADD COLUMN "userId" TEXT;
ALTER TABLE "Job" ADD COLUMN "userId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "userId" TEXT;
ALTER TABLE "Task" ADD COLUMN "userId" TEXT;
ALTER TABLE "GrowthReview" ADD COLUMN "userId" TEXT;
ALTER TABLE "GrowthEvent" ADD COLUMN "userId" TEXT;
ALTER TABLE "GrowthBoostTask" ADD COLUMN "userId" TEXT;
ALTER TABLE "ProjectHighlight" ADD COLUMN "userId" TEXT;

-- Backfill ownership to the first known user when available
DO $$
DECLARE
  owner_id TEXT;
BEGIN
  SELECT "id" INTO owner_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;
  IF owner_id IS NOT NULL THEN
    UPDATE "Company" SET "userId" = owner_id WHERE "userId" IS NULL;
    UPDATE "Job" SET "userId" = owner_id WHERE "userId" IS NULL;
    UPDATE "Contact" SET "userId" = owner_id WHERE "userId" IS NULL;
    UPDATE "Task" SET "userId" = owner_id WHERE "userId" IS NULL;
    UPDATE "GrowthReview" SET "userId" = owner_id WHERE "userId" IS NULL;
    UPDATE "GrowthEvent" SET "userId" = owner_id WHERE "userId" IS NULL;
    UPDATE "GrowthBoostTask" SET "userId" = owner_id WHERE "userId" IS NULL;
    UPDATE "ProjectHighlight" SET "userId" = owner_id WHERE "userId" IS NULL;
  END IF;
END $$;

-- Create indexes for ownership lookups
CREATE INDEX IF NOT EXISTS "Company_userId_idx" ON "Company"("userId");
CREATE INDEX IF NOT EXISTS "Job_userId_idx" ON "Job"("userId");
CREATE INDEX IF NOT EXISTS "Contact_userId_idx" ON "Contact"("userId");
CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "GrowthReview_userId_idx" ON "GrowthReview"("userId");
CREATE INDEX IF NOT EXISTS "GrowthEvent_userId_idx" ON "GrowthEvent"("userId");
CREATE INDEX IF NOT EXISTS "GrowthBoostTask_userId_idx" ON "GrowthBoostTask"("userId");
CREATE INDEX IF NOT EXISTS "ProjectHighlight_userId_idx" ON "ProjectHighlight"("userId");

-- Wire up foreign keys
ALTER TABLE "Company"
  ADD CONSTRAINT "Company_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Job"
  ADD CONSTRAINT "Job_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrowthReview"
  ADD CONSTRAINT "GrowthReview_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrowthEvent"
  ADD CONSTRAINT "GrowthEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GrowthBoostTask"
  ADD CONSTRAINT "GrowthBoostTask_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectHighlight"
  ADD CONSTRAINT "ProjectHighlight_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
