import path from "node:path";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import { canEditSubmissionBeforeReview } from "@/lib/submission";

export const runtime = "nodejs";

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return redirectTo(getAppUrl("/login", request));
  }

  try {
    const formData = await request.formData();
    const challengeDate = formData.get("challengeDate");

    if (typeof challengeDate !== "string" || !challengeDate) {
      throw new Error("Der Claim konnte nicht gefunden werden.");
    }

    const submission = await prisma.dailySubmission.findUnique({
      where: {
        userId_challengeDate: {
          challengeDate,
          userId: user.id,
        },
      },
      include: {
        videos: {
          orderBy: {
            orderIndex: "asc",
          },
        },
        workoutReviews: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!submission) {
      throw new Error("Dieser Claim gehört nicht zu deinem Account.");
    }

    if (
      !canEditSubmissionBeforeReview({
        challengeDate: submission.challengeDate,
        reviewCount: submission.workoutReviews.length,
      })
    ) {
      throw new Error("Dieser Claim kann nicht mehr bearbeitet oder gelöscht werden.");
    }

    for (const video of submission.videos) {
      await rm(video.storedPath, { force: true });
    }

    if (submission.videos[0]?.storedPath) {
      await rm(path.dirname(submission.videos[0].storedPath), {
        recursive: true,
        force: true,
      });
    }

    await prisma.dailySubmission.delete({
      where: {
        id: submission.id,
      },
    });

    return redirectTo(getAppUrl("/dashboard?success=Workout-Claim%20gel%C3%B6scht", request));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Claim konnte nicht gelöscht werden.";

    return redirectTo(getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request));
  }
}
