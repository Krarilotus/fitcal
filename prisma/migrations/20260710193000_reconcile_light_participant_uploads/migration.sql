-- Light participants own self-reported workout entries only.
-- Remove mode-incompatible artifacts that may have been created by earlier UI/API regressions.
DELETE FROM "DailyVideo"
WHERE "dailySubmissionId" IN (
  SELECT "DailySubmission"."id"
  FROM "DailySubmission"
  INNER JOIN "User" ON "User"."id" = "DailySubmission"."userId"
  WHERE "User"."isLightParticipant" = true
);

DELETE FROM "WorkoutReview"
WHERE "dailySubmissionId" IN (
  SELECT "DailySubmission"."id"
  FROM "DailySubmission"
  INNER JOIN "User" ON "User"."id" = "DailySubmission"."userId"
  WHERE "User"."isLightParticipant" = true
);

DELETE FROM "SicknessVerification"
WHERE "dailySubmissionId" IN (
  SELECT "DailySubmission"."id"
  FROM "DailySubmission"
  INNER JOIN "User" ON "User"."id" = "DailySubmission"."userId"
  WHERE "User"."isLightParticipant" = true
);

UPDATE "DailySubmission"
SET
  "status" = 'COMPLETED',
  "reviewStatus" = 'NOT_REQUIRED',
  "verifiedPushupTotal" = NULL,
  "verifiedSitupTotal" = NULL,
  "reviewedAt" = NULL,
  "submittedAt" = COALESCE("submittedAt", "updatedAt"),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "userId" IN (
  SELECT "id"
  FROM "User"
  WHERE "isLightParticipant" = true
)
AND "status" <> 'COMPLETED';
