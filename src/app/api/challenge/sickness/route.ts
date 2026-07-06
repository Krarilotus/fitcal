import { NextResponse } from "next/server";
import {
  RegistrationApprovalDecision,
  RegistrationStatus,
} from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import {
  CHALLENGE_START_DATE,
  addDaysToDateKey,
  differenceInDays,
  isWithinChallenge,
} from "@/lib/challenge";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/i18n";
import { getPreferredLocale } from "@/lib/preferences";
import { canSubmitSicknessClaims } from "@/lib/participation-policy";

const MAX_SICKNESS_RANGE_DAYS = 31;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function buildDateRange(
  startDate: string,
  endDate: string,
  messages: ReturnType<typeof getDictionary>["api"]["sickness"],
) {
  if (!DATE_KEY_PATTERN.test(startDate) || !DATE_KEY_PATTERN.test(endDate)) {
    throw new Error(messages.invalidRange);
  }

  if (!isWithinChallenge(startDate) || !isWithinChallenge(endDate)) {
    throw new Error(messages.rangeOutsideChallenge);
  }

  const rangeLength = differenceInDays(startDate, endDate) + 1;

  if (rangeLength < 1) {
    throw new Error(messages.endBeforeStart);
  }

  if (rangeLength > MAX_SICKNESS_RANGE_DAYS) {
    throw new Error(messages.rangeTooLong.replace("{days}", String(MAX_SICKNESS_RANGE_DAYS)));
  }

  return Array.from({ length: rangeLength }, (_, index) => addDaysToDateKey(startDate, index));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const locale = await getPreferredLocale();
  const messages = getDictionary(locale).api.sickness;

  if (!user) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  if (!canSubmitSicknessClaims(user)) {
    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(messages.lightDisabled)}`, request),
    );
  }

  try {
    const formData = await request.formData();
    const fallbackDate = String(formData.get("challengeDate") || "");
    const startDate = String(formData.get("startDate") || fallbackDate);
    const endDate = String(formData.get("endDate") || startDate);
    const consent = String(formData.get("consent") || "");
    const notes = String(formData.get("notes") || "").trim();
    const dateKeys = buildDateRange(startDate, endDate, messages);

    if (dateKeys.some((dateKey) => dateKey < CHALLENGE_START_DATE)) {
      throw new Error(messages.onlyWithinChallenge);
    }

    if (consent !== "on") {
      throw new Error(messages.consentRequired);
    }

    const reviewers = await prisma.user.findMany({
      where: {
        id: {
          not: user.id,
        },
        registrationStatus: RegistrationStatus.APPROVED,
        isLightParticipant: false,
      },
      select: {
        id: true,
      },
    });

    if (reviewers.length === 0) {
      throw new Error(messages.noReviewers);
    }

    const existingSubmissions = await prisma.dailySubmission.findMany({
      where: {
        userId: user.id,
        challengeDate: {
          in: dateKeys,
        },
      },
      include: {
        videos: true,
      },
    });

    const blockedSubmission = existingSubmissions.find((submission) =>
      submission.videos.length > 0 ||
      submission.status === "COMPLETED" ||
      submission.status === "JOKER"
    );

    if (blockedSubmission) {
      throw new Error(
        messages.blockedSubmission.replace("{date}", blockedSubmission.challengeDate),
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const challengeDate of dateKeys) {
        const submission = await tx.dailySubmission.upsert({
          where: {
            userId_challengeDate: {
              userId: user.id,
              challengeDate,
            },
          },
          update: {
            status: "SICK_PENDING",
            reviewStatus: "NOT_REQUIRED",
            verifiedPushupTotal: null,
            verifiedSitupTotal: null,
            reviewedAt: null,
            pushupSets: "[0,0]",
            situpSets: "[0,0]",
            notes: notes || messages.defaultNotes,
            submittedAt: new Date(),
          },
          create: {
            userId: user.id,
            challengeDate,
            status: "SICK_PENDING",
            reviewStatus: "NOT_REQUIRED",
            pushupSets: "[0,0]",
            situpSets: "[0,0]",
            notes: notes || messages.defaultNotes,
            submittedAt: new Date(),
          },
          select: {
            id: true,
          },
        });

        await tx.sicknessVerification.deleteMany({
          where: {
            dailySubmissionId: submission.id,
          },
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

    return NextResponse.redirect(
      getAppUrl(`/dashboard?success=${encodeURIComponent(
        dateKeys.length === 1
          ? messages.successSingle
          : messages.successMultiple.replace("{days}", String(dateKeys.length)),
      )}`, request),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.saveFailed;

    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request),
    );
  }
}
