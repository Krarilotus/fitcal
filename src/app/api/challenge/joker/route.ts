import { NextResponse } from "next/server";
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
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user.isLightParticipant) {
    return NextResponse.redirect(
      new URL("/dashboard?error=Die%20Light-Variante%20nutzt%20keine%20Joker", request.url),
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
      new URL("/dashboard?error=Der%20Tag%20kann%20nicht%20mehr%20gejokert%20werden", request.url),
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
      new URL(
        "/dashboard?error=Kein%20angesparter%20Joker%20mehr%20frei",
        request.url,
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
      pushupSets: "[0,0]",
      situpSets: "[0,0]",
      notes: "Joker genutzt",
      submittedAt: new Date(),
    },
    create: {
      userId: user.id,
      challengeDate,
      status: "JOKER",
      pushupSets: "[0,0]",
      situpSets: "[0,0]",
      notes: "Joker genutzt",
      submittedAt: new Date(),
    },
  });

  return NextResponse.redirect(new URL("/dashboard?success=Joker%20gespeichert", request.url));
}
