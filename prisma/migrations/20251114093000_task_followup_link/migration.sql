-- AlterTable
ALTER TABLE "Task" ADD COLUMN "followUpId" TEXT UNIQUE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
