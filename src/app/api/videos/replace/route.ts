import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/url";
import { MAX_VIDEO_SIZE_BYTES } from "@/lib/challenge";
import { prisma } from "@/lib/db";
import {
  buildStoredVideoFileName,
  ensureDailyUploadDirectory,
} from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(getAppUrl("/login", request));
  }

  try {
    const formData = await request.formData();
    const videoId = formData.get("videoId");
    const replacement = formData.get("replacementVideo");

    if (typeof videoId !== "string" || !videoId) {
      throw new Error("Video konnte nicht gefunden werden.");
    }

    if (!(replacement instanceof File) || replacement.size <= 0) {
      throw new Error("Bitte wähle ein neues Video aus.");
    }

    if (replacement.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error("Jede Videodatei darf höchstens 100 MB groß sein.");
    }

    const video = await prisma.dailyVideo.findFirst({
      where: {
        id: videoId,
        dailySubmission: {
          userId: user.id,
        },
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
      throw new Error("Dieses Video gehört nicht zu deinem Account.");
    }

    const { folderPath, safeUserLabel } = await ensureDailyUploadDirectory(
      user.name || user.email,
      video.dailySubmission.challengeDate,
    );

    const storedName = buildStoredVideoFileName({
      challengeDate: video.dailySubmission.challengeDate,
      safeUserLabel,
      partIndex: video.orderIndex,
      originalName: replacement.name,
    });
    const storedPath = path.join(folderPath, storedName);
    const bytes = Buffer.from(await replacement.arrayBuffer());

    await writeFile(storedPath, bytes);

    if (video.storedPath !== storedPath) {
      await rm(video.storedPath, { force: true });
    }

    await prisma.dailyVideo.update({
      where: {
        id: video.id,
      },
      data: {
        originalName: replacement.name,
        storedName,
        storedPath,
        mimeType: replacement.type || "application/octet-stream",
        sizeBytes: replacement.size,
      },
    });

    return NextResponse.redirect(
      getAppUrl("/dashboard?success=Video%20ersetzt", request),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Video konnte nicht ersetzt werden.";

    return NextResponse.redirect(
      getAppUrl(`/dashboard?error=${encodeURIComponent(message)}`, request),
    );
  }
}
