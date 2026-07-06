import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CHALLENGE_START_DATE,
  canApplyJokerToDay,
  getChallengeOverview,
} from "@/lib/challenge";
import { getSubmissionTotals } from "@/lib/submission";
import { removeStoredSubmissionVideos } from "@/lib/submission-videos";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import { canUseChallengeJokers } from "@/lib/participation-policy";

export const runtime = "nodejs";

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

function buildChallengeRecords(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).challenge;

  if (!user) {
    return redirectTo(getAppUrl("/login", request));
  }

  if (!canUseChallengeJokers(user)) {
    return redirectTo(
      dashboardMessageUrl(request, "error", messages.jokerLightDisabled),
    );
  }

  const formData = await request.formData();
  const challengeDate = String(formData.get("challengeDate") || "");

  if (!challengeDate || challengeDate < CHALLENGE_START_DATE) {
    return redirectTo(
      dashboardMessageUrl(request, "error", messages.jokerCannotApply),
    );
  }

  const overview = getChallengeOverview({
    joinedChallengeDate:
      user.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
    records: buildChallengeRecords(user),
    hasStudentDiscount: user.isStudentDiscount,
    isLightParticipant: user.isLightParticipant,
  });

  const targetDay = overview.days.find((day) => day.challengeDate === challengeDate);

  if (
    !targetDay ||
    !canApplyJokerToDay({
      challengeDate,
      isLightParticipant: user.isLightParticipant,
      jokerBalance: overview.jokerBalance,
      status: targetDay.status,
    })
  ) {
    return redirectTo(
      dashboardMessageUrl(
        request,
        "error",
        overview.jokerBalance < 1
          ? messages.jokerNoneLeft
          : messages.jokerCannotApply,
      ),
    );
  }

  const existingSubmission = await prisma.dailySubmission.findUnique({
    where: {
      userId_challengeDate: {
        userId: user.id,
        challengeDate,
      },
    },
    select: {
      id: true,
      videos: {
        select: {
          storedPath: true,
        },
      },
    },
  });

  if (existingSubmission) {
    await removeStoredSubmissionVideos(
      existingSubmission.videos.map((video) => video.storedPath),
    );
  }

  await prisma.$transaction(async (tx) => {
    if (existingSubmission) {
      await tx.sicknessVerification.deleteMany({
        where: {
          dailySubmissionId: existingSubmission.id,
        },
      });
      await tx.workoutReview.deleteMany({
        where: {
          dailySubmissionId: existingSubmission.id,
        },
      });
      await tx.dailyVideo.deleteMany({
        where: {
          dailySubmissionId: existingSubmission.id,
        },
      });
    }

    await tx.dailySubmission.upsert({
      where: {
        userId_challengeDate: {
          userId: user.id,
          challengeDate,
        },
      },
      update: {
        status: "JOKER",
        reviewStatus: "NOT_REQUIRED",
        verifiedPushupTotal: null,
        verifiedSitupTotal: null,
        reviewedAt: null,
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes: messages.jokerNotes,
        submittedAt: new Date(),
      },
      create: {
        userId: user.id,
        challengeDate,
        status: "JOKER",
        reviewStatus: "NOT_REQUIRED",
        pushupSets: "[0,0]",
        situpSets: "[0,0]",
        notes: messages.jokerNotes,
        submittedAt: new Date(),
      },
    });
  });

  return redirectTo(dashboardMessageUrl(request, "success", messages.jokerSaved));
}
