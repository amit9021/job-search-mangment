-- Create enums
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "JobStage" AS ENUM ('APPLIED', 'HR', 'TECH', 'OFFER', 'REJECTED', 'DORMANT');
CREATE TYPE "ContactStrength" AS ENUM ('WEAK', 'MEDIUM', 'STRONG');
CREATE TYPE "OutreachChannel" AS ENUM ('LINKEDIN', 'EMAIL', 'PHONE', 'OTHER');
CREATE TYPE "OutreachOutcome" AS ENUM ('NONE', 'POSITIVE', 'NEGATIVE', 'NO_RESPONSE');
CREATE TYPE "ReferralKind" AS ENUM ('INTRO', 'REFERRAL', 'SENT_CV');
CREATE TYPE "EventStatus" AS ENUM ('PLANNED', 'ATTENDED');

-- Users
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Jobs
CREATE TABLE "Job" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "heat" INTEGER NOT NULL,
  "deadline" TIMESTAMP WITH TIME ZONE,
  "stage" "JobStage" NOT NULL DEFAULT 'APPLIED',
  "lastTouchAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "Job_heat_updatedAt_idx" ON "Job" ("heat", "updatedAt");
CREATE INDEX "Job_deadline_idx" ON "Job" ("deadline");

-- JobApplication
CREATE TABLE "JobApplication" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "jobId" TEXT NOT NULL REFERENCES "Job"("id") ON DELETE CASCADE,
  "dateSent" TIMESTAMP WITH TIME ZONE NOT NULL,
  "tailoringScore" INTEGER NOT NULL,
  "cvVersionId" TEXT
);

-- JobStatusHistory
CREATE TABLE "JobStatusHistory" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "jobId" TEXT NOT NULL REFERENCES "Job"("id") ON DELETE CASCADE,
  "stage" "JobStage" NOT NULL,
  "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "note" TEXT
);

-- Contacts
CREATE TABLE "Contact" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "company" TEXT,
  "role" TEXT,
  "strength" "ContactStrength" NOT NULL DEFAULT 'WEAK',
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX "Contact_strength_idx" ON "Contact" ("strength");

-- Outreach
CREATE TABLE "Outreach" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "jobId" TEXT REFERENCES "Job"("id") ON DELETE SET NULL,
  "contactId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL,
  "channel" "OutreachChannel" NOT NULL,
  "messageType" TEXT NOT NULL,
  "personalizationScore" INTEGER NOT NULL,
  "outcome" "OutreachOutcome" NOT NULL DEFAULT 'NONE',
  "content" TEXT,
  "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- FollowUp
CREATE TABLE "FollowUp" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "jobId" TEXT REFERENCES "Job"("id") ON DELETE SET NULL,
  "contactId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL,
  "dueAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "sentAt" TIMESTAMP WITH TIME ZONE,
  "attemptNo" INTEGER NOT NULL,
  "note" TEXT
);
CREATE INDEX "FollowUp_dueAt_idx" ON "FollowUp" ("dueAt");

-- Referral
CREATE TABLE "Referral" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contactId" TEXT NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
  "jobId" TEXT REFERENCES "Job"("id") ON DELETE SET NULL,
  "kind" "ReferralKind" NOT NULL,
  "at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "note" TEXT
);

-- Projects
CREATE TABLE "Project" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "repoUrl" TEXT NOT NULL,
  "stack" TEXT,
  "spotlight" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- CodeReview
CREATE TABLE "CodeReview" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "contactId" TEXT NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
  "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "reviewedAt" TIMESTAMP WITH TIME ZONE,
  "summary" TEXT,
  "qualityScore" INTEGER
);

-- Event
CREATE TABLE "Event" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "location" TEXT,
  "topic" TEXT,
  "status" "EventStatus" NOT NULL DEFAULT 'PLANNED',
  "targetsMinConversations" INTEGER
);

-- EventContact
CREATE TABLE "EventContact" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
  "contactId" TEXT NOT NULL REFERENCES "Contact"("id") ON DELETE CASCADE,
  "followupDueAt" TIMESTAMP WITH TIME ZONE
);

-- BoostTask
CREATE TABLE "BoostTask" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "impactScore" INTEGER NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "doneAt" TIMESTAMP WITH TIME ZONE
);

-- MetricSnapshot
CREATE TABLE "MetricSnapshot" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "kpiName" TEXT NOT NULL,
  "value" INTEGER NOT NULL
);

-- Recommendation
CREATE TABLE "Recommendation" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "resolvedAt" TIMESTAMP WITH TIME ZONE
);

-- Notification
CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "kind" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "dueAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "sentAt" TIMESTAMP WITH TIME ZONE,
  "jobId" TEXT REFERENCES "Job"("id") ON DELETE SET NULL,
  "contactId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL
);
CREATE INDEX "Notification_dueAt_idx" ON "Notification" ("dueAt");
