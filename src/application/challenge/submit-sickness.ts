import { RegistrationApprovalDecision, RegistrationStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import {
  addDaysToDateKey,
  differenceInDays,
  isWithinChallenge,
} from "@/lib/challenge";
import { prisma } from "@/lib/db";
import { canSubmitSicknessClaims } from "@/lib/participation-policy";
import { failure, success, type Result } from "@/application/shared/result";

const MAX_SICKNESS_RANGE_DAYS = 31;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type SubmitSicknessError =
  | "SICKNESS_NOT_AVAILABLE"
  | "INVALID_RANGE"
  | "RANGE_OUTSIDE_CHALLENGE"
  | "END_BEFORE_START"
  | "RANGE_TOO_LONG"
  | "CONSENT_REQUIRED"
  | "NO_REVIEWERS"
  | "BLOCKED_SUBMISSION";

function buildDateRange(startDate: string, endDate: string) {
  if (!DATE_KEY_PATTERN.test(startDate) || !DATE_KEY_PATTERN.test(endDate)) {
    return failure("INVALID_RANGE" as const);
  }
  if (!isWithinChallenge(startDate) || !isWithinChallenge(endDate)) {
    return failure("RANGE_OUTSIDE_CHALLENGE" as const);
  }
  const rangeLength = differenceInDays(startDate, endDate) + 1;
  if (rangeLength < 1) return failure("END_BEFORE_START" as const);
  if (rangeLength > MAX_SICKNESS_RANGE_DAYS) {
    return failure("RANGE_TOO_LONG" as const, { days: MAX_SICKNESS_RANGE_DAYS });
  }
  return success(
    Array.from({ length: rangeLength }, (_, index) =>
      addDaysToDateKey(startDate, index),
    ),
  );
}

export async function submitSickness(input: {
  user: CurrentUser;
  startDate: string;
  endDate: string;
  consent: boolean;
  notes: string;
  defaultNotes: string;
}): Promise<Result<{ dateKeys: string[] }, SubmitSicknessError>> {
  if (!canSubmitSicknessClaims(input.user)) return failure("SICKNESS_NOT_AVAILABLE");
  const dateRange = buildDateRange(input.startDate, input.endDate);
  if (!dateRange.ok) return dateRange;
  if (!input.consent) return failure("CONSENT_REQUIRED");

  const reviewers = await prisma.user.findMany({
    where: {
      id: { not: input.user.id },
      registrationStatus: RegistrationStatus.APPROVED,
      isLightParticipant: false,
    },
    select: { id: true },
  });
  if (!reviewers.length) return failure("NO_REVIEWERS");

  const existingSubmissions = await prisma.dailySubmission.findMany({
    where: {
      userId: input.user.id,
      challengeDate: { in: dateRange.value },
    },
    include: { videos: true },
  });
  const blocked = existingSubmissions.find((submission) =>
    submission.videos.length > 0 ||
    submission.status === "COMPLETED" ||
    submission.status === "JOKER",
  );
  if (blocked) return failure("BLOCKED_SUBMISSION", { date: blocked.challengeDate });

  await prisma.$transaction(async (tx) => {
    for (const challengeDate of dateRange.value) {
      const submission = await tx.dailySubmission.upsert({
        where: { userId_challengeDate: { userId: input.user.id, challengeDate } },
        update: {
          status: "SICK_PENDING",
          reviewStatus: "NOT_REQUIRED",
          verifiedPushupTotal: null,
          verifiedSitupTotal: null,
          reviewedAt: null,
          pushupSets: "[0,0]",
          situpSets: "[0,0]",
          notes: input.notes || input.defaultNotes,
          submittedAt: new Date(),
        },
        create: {
          userId: input.user.id,
          challengeDate,
          status: "SICK_PENDING",
          reviewStatus: "NOT_REQUIRED",
          pushupSets: "[0,0]",
          situpSets: "[0,0]",
          notes: input.notes || input.defaultNotes,
          submittedAt: new Date(),
        },
        select: { id: true },
      });
      await tx.sicknessVerification.deleteMany({
        where: { dailySubmissionId: submission.id },
      });
      await tx.sicknessVerification.createMany({
        data: reviewers.map((reviewer) => ({
          dailySubmissionId: submission.id,
          reviewerUserId: reviewer.id,
          decision: RegistrationApprovalDecision.PENDING,
          notes: null,
          decidedAt: null,
        })),
      });
    }
  });

  return success({ dateKeys: dateRange.value });
}
