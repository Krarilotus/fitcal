import path from "node:path";
import { rm } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { canEditSubmissionBeforeReview } from "@/lib/submission";
import { failure, success, type Result } from "@/application/shared/result";
import { logger } from "@/lib/logger";

export type DeleteWorkoutError =
  | "WORKOUT_DATE_MISSING"
  | "WORKOUT_NOT_FOUND"
  | "WORKOUT_LOCKED";

export async function deleteWorkout(input: {
  userId: string;
  challengeDate: string;
}): Promise<Result<void, DeleteWorkoutError>> {
  if (!input.challengeDate) return failure("WORKOUT_DATE_MISSING");

  const submission = await prisma.dailySubmission.findUnique({
    where: {
      userId_challengeDate: {
        challengeDate: input.challengeDate,
        userId: input.userId,
      },
    },
    include: {
      videos: { orderBy: { orderIndex: "asc" } },
      workoutReviews: { select: { id: true } },
    },
  });

  if (!submission) return failure("WORKOUT_NOT_FOUND");
  if (!canEditSubmissionBeforeReview({
    challengeDate: submission.challengeDate,
    reviewCount: submission.workoutReviews.length,
  })) return failure("WORKOUT_LOCKED");

  await prisma.dailySubmission.delete({ where: { id: submission.id } });

  try {
    for (const video of submission.videos) {
      await rm(video.storedPath, { force: true });
    }
    if (submission.videos[0]?.storedPath) {
      await rm(path.dirname(submission.videos[0].storedPath), {
        recursive: true,
        force: true,
      });
    }
  } catch (error) {
    logger.error("storage.workout_cleanup_failed", {
      error: error instanceof Error ? error.message : String(error),
      submissionId: submission.id,
    });
  }

  return success(undefined);
}
