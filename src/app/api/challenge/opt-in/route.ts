import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CHALLENGE_START_DATE, getBerlinDateKey } from "@/lib/challenge";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const joinedChallengeDate = (() => {
    const today = getBerlinDateKey();
    return today < CHALLENGE_START_DATE ? CHALLENGE_START_DATE : today;
  })();

  await prisma.challengeEnrollment.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
      optedInAt: new Date(),
      joinedChallengeDate,
    },
  });

  return NextResponse.redirect(new URL("/dashboard?success=Challenge%20aktiviert", request.url));
}
