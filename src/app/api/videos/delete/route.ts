import path from "node:path";
import { rm } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
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
        dailySubmissionId: true,
      },
    });

    if (!video) {
      throw new Error("Dieses Video gehört nicht zu deinem Account.");
    }

    await rm(video.storedPath, { force: true });

    await prisma.dailyVideo.delete({
      where: {
        id: video.id,
      },
    });

    const remainingVideos = await prisma.dailyVideo.count({
      where: {
        dailySubmissionId: video.dailySubmissionId,
      },
    });

    if (remainingVideos === 0) {
      await rm(path.dirname(video.storedPath), { recursive: true, force: true });
    }

    return NextResponse.redirect(new URL("/dashboard?success=Video%20gelöscht", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video konnte nicht gelöscht werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
