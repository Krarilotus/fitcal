import path from "node:path";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import { preservesSubmissionWithoutVideos } from "@/lib/submission";

export const runtime = "nodejs";

function successRedirect(request: Request, search: string) {
  return NextResponse.redirect(getAppUrl(`/dashboard?success=${search}`, request), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(getAppUrl("/login", request), { status: 303 });
  }

  try {
    const formData = await request.formData();
    const videoId = formData.get("videoId");

    if (typeof videoId !== "string" || !videoId) {
      throw new Error("Video konnte nicht gefunden werden.");
    }

    const video = await prisma.dailyVideo.findFirst({
      where: {
        id: videoId,
        dailySubmission: {
          userId: user.id,
        },
      },
      select: {
        id: true,
        storedPath: true,
        dailySubmission: {
          select: {
            id: true,
            reviewStatus: true,
            _count: {
              select: {
                videos: true,
              },
            },
          },
        },
      },
    });

    if (!video) {
      throw new Error("Dieses Video gehört nicht zu deinem Account.");
    }

    const isLastVideo = video.dailySubmission._count.videos <= 1;
    const shouldDeleteSubmission =
      isLastVideo &&
      !preservesSubmissionWithoutVideos(video.dailySubmission.reviewStatus);

    await rm(video.storedPath, { force: true });

    if (shouldDeleteSubmission) {
      await prisma.dailySubmission.delete({
        where: {
          id: video.dailySubmission.id,
        },
      });

      await rm(path.dirname(video.storedPath), { recursive: true, force: true });

      return successRedirect(
        request,
        "Letztes%20Video%20gel%C3%B6scht%2C%20Workout-Claim%20entfernt",
      );
    }

    await prisma.dailyVideo.delete({
      where: {
        id: video.id,
      },
    });

    const remainingVideos = await prisma.dailyVideo.count({
      where: {
        dailySubmissionId: video.dailySubmission.id,
      },
    });

    if (remainingVideos === 0) {
      await rm(path.dirname(video.storedPath), { recursive: true, force: true });
    }

    return successRedirect(request, "Video%20gel%C3%B6scht");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video konnte nicht gelöscht werden.";

    return NextResponse.redirect(getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request), {
      status: 303,
    });
  }
}
