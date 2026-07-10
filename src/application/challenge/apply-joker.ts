import {
  CHALLENGE_START_DATE,
  canApplyJokerToDay,
  getChallengeOverview,
} from "@/lib/challenge";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canUseChallengeJokers } from "@/lib/participation-policy";
import { getSubmissionTotals } from "@/lib/submission";
import { removeStoredSubmissionVideos } from "@/lib/submission-videos";
import { failure, success, type Result } from "@/application/shared/result";

export type ApplyJokerError =
  | "JOKER_NOT_AVAILABLE"
  | "JOKER_NONE_LEFT"
  | "JOKER_CANNOT_APPLY";

function buildChallengeRecords(user: CurrentUser) {
  return user.dailySubmissions.map((submission) => {
    const totals = getSubmissionTotals(submission);
    return {
      challengeDate: submission.challengeDate,
      status: submission.status,
      pushupTotal: totals.effectivePushupTotal,
      situpTotal: totals.effectiveSitupTotal,
    };
  });
}

export async function applyJoker(input: {
  user: CurrentUser;
  challengeDate: string;
  notes: string;
}): Promise<Result<void, ApplyJokerError>> {
  const { user, challengeDate, notes } = input;

  if (!canUseChallengeJokers(user)) return failure("JOKER_NOT_AVAILABLE");
  if (!challengeDate || challengeDate < CHALLENGE_START_DATE) {
    return failure("JOKER_CANNOT_APPLY");
  }

  const overview = getChallengeOverview({
    joinedChallengeDate:
      user.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
    records: buildChallengeRecords(user),
    hasStudentDiscount: user.isStudentDiscount,
    isLightParticipant: user.isLightParticipant,
  });
  const targetDay = overview.days.find((day) => day.challengeDate === challengeDate);

  if (!targetDay || !canApplyJokerToDay({
    challengeDate,
    isLightParticipant: user.isLightParticipant,
    jokerBalance: overview.jokerBalance,
    status: targetDay.status,
  })) {
    return failure(overview.jokerBalance < 1 ? "JOKER_NONE_LEFT" : "JOKER_CANNOT_APPLY");
  }

  const existingSubmission = await prisma.dailySubmission.findUnique({
    where: { userId_challengeDate: { userId: user.id, challengeDate } },
    select: { id: true, videos: { select: { storedPath: true } } },
  });

  if (existingSubmission) {
    await removeStoredSubmissionVideos(
      existingSubmission.videos.map((video) => video.storedPath),
    );
  }

  await prisma.$transaction(async (tx) => {
    if (existingSubmission) {
      const submissionFilter = { dailySubmissionId: existingSubmission.id };
      await tx.sicknessVerification.deleteMany({ where: submissionFilter });
      await tx.workoutReview.deleteMany({ where: submissionFilter });
      await tx.dailyVideo.deleteMany({ where: submissionFilter });
    }

    await tx.dailySubmission.upsert({
      where: { userId_challengeDate: { userId: user.id, challengeDate } },
      update: {
        status: "JOKER",
        reviewStatus: "NOT_REQUIRED",
        verifiedPushupTotal: null,
        verifiedSitupTotal: null,
        reviewedAt: null,
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes,
        submittedAt: new Date(),
      },
      create: {
        userId: user.id,
        challengeDate,
        status: "JOKER",
        reviewStatus: "NOT_REQUIRED",
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes,
        submittedAt: new Date(),
      },
    });
  });

  return success(undefined);
}
