import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";

function successRedirectUrl(user: { isLightParticipant: boolean }, request: Request) {
  return getAppUrl(
    user.isLightParticipant
      ? "/dashboard?success=Eintrag%20gespeichert"
      : "/dashboard?success=Trainingstag%20gespeichert",
    request,
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        recentlySaved: false,
        redirectUrl: getAppUrl("/login", request),
      },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const challengeDate = searchParams.get("challengeDate")?.trim() ?? "";
  const sinceValue = Number(searchParams.get("since"));
  const since = Number.isFinite(sinceValue) ? new Date(sinceValue) : null;

  if (!challengeDate) {
    return NextResponse.json(
      {
        ok: false,
        recentlySaved: false,
      },
      { status: 400 },
    );
  }

  const submission = await prisma.dailySubmission.findUnique({
    where: {
      userId_challengeDate: {
        userId: user.id,
        challengeDate,
      },
    },
    select: {
      submittedAt: true,
    },
  });

  const recentlySaved =
    Boolean(submission?.submittedAt) &&
    (!since || submission!.submittedAt!.getTime() >= since.getTime() - 3000);

  return NextResponse.json({
    ok: true,
    recentlySaved,
    submittedAt: submission?.submittedAt?.toISOString() ?? null,
    redirectUrl: recentlySaved ? successRedirectUrl(user, request) : null,
  });
}
