-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "linkedinUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- Migrate existing company strings to Company table
INSERT INTO "Company" ("id", "name", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    "company",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "company" FROM "Contact" WHERE "company" IS NOT NULL AND "company" != '') AS distinct_companies;

-- Add new columns to Contact
ALTER TABLE "Contact" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "email" TEXT;
ALTER TABLE "Contact" ADD COLUMN "phone" TEXT;
ALTER TABLE "Contact" ADD COLUMN "linkedinUrl" TEXT;
ALTER TABLE "Contact" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "Contact" ADD COLUMN "location" TEXT;
ALTER TABLE "Contact" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Link existing contacts to their companies
UPDATE "Contact" c
SET "companyId" = comp."id"
FROM "Company" comp
WHERE c."company" = comp."name" AND c."company" IS NOT NULL;

-- Add indexes to Contact
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");
CREATE INDEX "Contact_name_idx" ON "Contact"("name");

-- Add FK constraint
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new columns to Job
ALTER TABLE "Job" ADD COLUMN "companyId" TEXT;

-- Create index on Job
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- Add FK constraint for Job
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old company column from Contact (keep it in Job for now for backward compatibility)
ALTER TABLE "Contact" DROP COLUMN "company";
