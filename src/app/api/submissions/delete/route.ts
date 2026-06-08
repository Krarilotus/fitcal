import path from "node:path";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import { canEditSubmissionBeforeReview } from "@/lib/submission";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";

export const runtime = "nodejs";

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).submissions;

  if (!user) {
    return redirectTo(getAppUrl("/login", request));
  }

  try {
    const formData = await request.formData();
    const challengeDate = formData.get("challengeDate");

    if (typeof challengeDate !== "string" || !challengeDate) {
      throw new Error(messages.claimMissing);
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
      throw new Error(messages.claimNotYours);
    }

    if (
      !canEditSubmissionBeforeReview({
        challengeDate: submission.challengeDate,
        reviewCount: submission.workoutReviews.length,
      })
    ) {
      throw new Error(messages.claimDeleteLocked);
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

    return redirectTo(dashboardMessageUrl(request, "success", messages.claimDeleted));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.claimDeleteFailed;

    return redirectTo(dashboardMessageUrl(request, "error", message));
  }
}
