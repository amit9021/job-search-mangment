-- CreateEnum
CREATE TYPE "OutreachContext" AS ENUM ('JOB_OPPORTUNITY', 'CODE_REVIEW', 'CHECK_IN', 'REFERRAL_REQUEST', 'OTHER');

-- AlterTable: Contact archival flags
ALTER TABLE "Contact"
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable: Outreach context
ALTER TABLE "Outreach"
  ADD COLUMN "context" "OutreachContext" NOT NULL DEFAULT 'OTHER';
