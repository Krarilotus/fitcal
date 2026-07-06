import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { MAX_VIDEO_SIZE_BYTES } from "@/lib/challenge";
import { prisma } from "@/lib/db";
import {
  persistReplacementSubmissionVideo,
  removeReplacedSubmissionVideo,
} from "@/lib/submission-videos";
import { dashboardMessageUrl, getApiMessages } from "@/lib/i18n-api";
import { canUploadWorkoutVideos } from "@/lib/participation-policy";

export const runtime = "nodejs";

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const messages = (await getApiMessages()).videos;

  if (!user || !canUploadWorkoutVideos(user)) {
    return redirectTo(getAppUrl("/login", request));
  }

  try {
    const formData = await request.formData();
    const videoId = formData.get("videoId");
    const replacement = formData.get("replacementVideo");

    if (typeof videoId !== "string" || !videoId) {
      throw new Error(messages.missing);
    }

    if (!(replacement instanceof File) || replacement.size <= 0) {
      throw new Error(messages.chooseReplacement);
    }

    if (replacement.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error(messages.tooLarge);
    }

    const video = await prisma.dailyVideo.findFirst({
      where: {
        dailySubmission: {
          userId: user.id,
        },
        id: videoId,
      },
      include: {
        dailySubmission: {
          select: {
            challengeDate: true,
          },
        },
      },
    });

    if (!video) {
      throw new Error(messages.notYours);
    }

    const persistedReplacement = await persistReplacementSubmissionVideo({
      challengeDate: video.dailySubmission.challengeDate,
      displayName: replacement.name,
      file: replacement,
      target: {
        orderIndex: video.orderIndex,
        storedPath: video.storedPath,
      },
      userLabel: user.name || user.email,
    });

    await prisma.dailyVideo.update({
      where: {
        id: video.id,
      },
      data: {
        mimeType: persistedReplacement.mimeType,
        originalName: persistedReplacement.originalName,
        sizeBytes: persistedReplacement.sizeBytes,
        storedName: persistedReplacement.storedName,
        storedPath: persistedReplacement.storedPath,
      },
    });

    await removeReplacedSubmissionVideo(video.storedPath, persistedReplacement.storedPath);

    return redirectTo(dashboardMessageUrl(request, "success", messages.replaced));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : messages.replaceFailed;

    return redirectTo(dashboardMessageUrl(request, "error", message));
  }
}
