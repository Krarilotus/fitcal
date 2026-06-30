import path from "node:path";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { prisma } from "@/lib/db";
import { preservesSubmissionWithoutVideos } from "@/lib/submission";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";

export const runtime = "nodejs";

function successRedirect(request: Request, message: string) {
  return NextResponse.redirect(dashboardMessageUrl(request, "success", message), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).videos;

  if (!user || user.isLightParticipant) {
    return NextResponse.redirect(getAppUrl("/login", request), { status: 303 });
  }

  try {
    const formData = await request.formData();
    const videoId = formData.get("videoId");

    if (typeof videoId !== "string" || !videoId) {
      throw new Error(messages.missing);
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
      throw new Error(messages.notYours);
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
        messages.lastDeletedClaimRemoved,
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

    return successRedirect(request, messages.deleted);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.deleteFailed;

    return NextResponse.redirect(dashboardMessageUrl(request, "error", message), {
      status: 303,
    });
  }
}
