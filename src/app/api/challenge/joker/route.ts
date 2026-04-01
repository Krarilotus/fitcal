import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canSubmitForDate,
  countJokersForMonth,
  getMonthKey,
} from "@/lib/challenge";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!user.challengeEnrollment) {
    return NextResponse.redirect(
      new URL("/dashboard?error=Bitte%20zuerst%20die%20Challenge%20aktivieren", request.url),
    );
  }

  const formData = await request.formData();
  const challengeDate = String(formData.get("challengeDate") || "");

  if (
    !challengeDate ||
    challengeDate < user.challengeEnrollment.joinedChallengeDate ||
    !canSubmitForDate(challengeDate)
  ) {
    return NextResponse.redirect(
      new URL("/dashboard?error=Der%20Tag%20kann%20nicht%20mehr%20gejokert%20werden", request.url),
    );
  }

  const monthKey = getMonthKey(challengeDate);
  const existingEntries = await prisma.dailySubmission.findMany({
    where: {
      userId: user.id,
      challengeDate: {
        startsWith: monthKey,
      },
    },
    select: {
      challengeDate: true,
      status: true,
      extraPushups: true,
      extraSitups: true,
    },
  });

  if (countJokersForMonth(existingEntries, monthKey) >= 2) {
    return NextResponse.redirect(
      new URL("/dashboard?error=Monatliches%20Joker-Kontingent%20ist%20bereits%20aufgebraucht", request.url),
    );
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
      extraPushups: 0,
      extraSitups: 0,
      notes: "Joker genutzt",
      submittedAt: new Date(),
    },
    create: {
      userId: user.id,
      challengeDate,
      status: "JOKER",
      pushupSets: "[0,0]",
      situpSets: "[0,0]",
      extraPushups: 0,
      extraSitups: 0,
      notes: "Joker genutzt",
      submittedAt: new Date(),
    },
  });

  return NextResponse.redirect(new URL("/dashboard?success=Joker%20gespeichert", request.url));
}
