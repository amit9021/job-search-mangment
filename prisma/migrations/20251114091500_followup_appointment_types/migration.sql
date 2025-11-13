-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('STANDARD', 'APPOINTMENT');

-- CreateEnum
CREATE TYPE "FollowUpAppointmentMode" AS ENUM ('MEETING', 'ZOOM', 'PHONE', 'ON_SITE', 'OTHER');

-- AlterTable
ALTER TABLE "FollowUp"
  ADD COLUMN "type" "FollowUpType" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "appointmentMode" "FollowUpAppointmentMode";
