ALTER TABLE "DailySubmissionExtra" ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "DailySubmissionExtra_dailySubmissionId_orderIndex_idx" ON "DailySubmissionExtra"("dailySubmissionId", "orderIndex");
