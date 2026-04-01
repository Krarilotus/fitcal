import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string }> | { videoId: string } },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Nicht angemeldet.", { status: 401 });
  }

  const { videoId } = await context.params;

  const video = await prisma.dailyVideo.findFirst({
    where: {
      id: videoId,
      dailySubmission: {
        userId: user.id,
      },
    },
    select: {
      originalName: true,
      storedPath: true,
      mimeType: true,
      sizeBytes: true,
    },
  });

  if (!video) {
    return new Response("Video nicht gefunden.", { status: 404 });
  }

  try {
    const bytes = await readFile(video.storedPath);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": video.mimeType || "application/octet-stream",
        "Content-Length": String(video.sizeBytes),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(video.originalName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Datei konnte nicht gelesen werden.", { status: 404 });
  }
}
