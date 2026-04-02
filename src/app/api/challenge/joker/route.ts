import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CHALLENGE_START_DATE,
  canSubmitForDate,
  countUsedJokers,
  getAccruedJokerAllowance,
  isFreeChallengeDay,
} from "@/lib/challenge";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  if (user.isLightParticipant) {
    return NextResponse.redirect(
      getAppUrl("/dashboard?error=Die%20Light-Variante%20nutzt%20keine%20Joker", request),
    );
  }

  const formData = await request.formData();
  const challengeDate = String(formData.get("challengeDate") || "");

  if (
    !challengeDate ||
    challengeDate < CHALLENGE_START_DATE ||
    isFreeChallengeDay(challengeDate) ||
    !canSubmitForDate(challengeDate)
  ) {
    return NextResponse.redirect(
      getAppUrl("/dashboard?error=Der%20Tag%20kann%20nicht%20mehr%20gejokert%20werden", request),
    );
  }

  const existingEntries = await prisma.dailySubmission.findMany({
    where: {
      userId: user.id,
      challengeDate: {
        lte: challengeDate,
      },
    },
    select: {
      challengeDate: true,
      status: true,
    },
  });

  const jokerAllowance = getAccruedJokerAllowance(
    user.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
    challengeDate,
  );

  if (countUsedJokers(existingEntries, challengeDate) >= jokerAllowance) {
    return NextResponse.redirect(
      getAppUrl(
        "/dashboard?error=Kein%20angesparter%20Joker%20mehr%20frei",
        request,
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
    },
  });

  if (existingSubmission) {
    await prisma.sicknessVerification.deleteMany({
      where: {
        dailySubmissionId: existingSubmission.id,
      },
    });
    await prisma.workoutReview.deleteMany({
      where: {
        dailySubmissionId: existingSubmission.id,
      },
    });
  }

  await prisma.dailySubmission.upsert({
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
      notes: "Joker genutzt",
      submittedAt: new Date(),
    },
    create: {
      userId: user.id,
      challengeDate,
      status: "JOKER",
      reviewStatus: "NOT_REQUIRED",
      pushupSets: "[0,0]",
      situpSets: "[0,0]",
      notes: "Joker genutzt",
      submittedAt: new Date(),
    },
  });

  return NextResponse.redirect(getAppUrl("/dashboard?success=Joker%20gespeichert", request));
}
