import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(
  request: Request,
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
      dailySubmission: user.isLightParticipant
        ? {
            userId: user.id,
          }
        : {
            OR: [
              {
                userId: user.id,
              },
              {
                status: "COMPLETED",
                user: {
                  registrationStatus: "APPROVED",
                  isLightParticipant: false,
                },
              },
            ],
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
    const fileStat = await stat(video.storedPath);
    const fileSize = fileStat.size || video.sizeBytes;
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());

      if (!match) {
        return new Response("Ungültiger Range-Header.", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const start =
        match[1] === "" ? 0 : Math.max(0, Math.min(fileSize - 1, Number.parseInt(match[1], 10)));
      const end =
        match[2] === ""
          ? fileSize - 1
          : Math.max(start, Math.min(fileSize - 1, Number.parseInt(match[2], 10)));

      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= fileSize) {
        return new Response("Ungültiger Range-Header.", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const stream = createReadStream(video.storedPath, { start, end });

      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Type": video.mimeType || "application/octet-stream",
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(video.originalName)}`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const stream = createReadStream(video.storedPath);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Type": video.mimeType || "application/octet-stream",
        "Content-Length": String(fileSize),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(video.originalName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Datei konnte nicht gelesen werden.", { status: 404 });
  }
}
