import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CHALLENGE_START_DATE, canSubmitForDate } from "@/lib/challenge";
import { buildStoredVideoFileName, ensureDailyUploadDirectory } from "@/lib/storage";
import {
  assertSubmissionMatchesRules,
  getVideoFiles,
  parseSubmissionInput,
  serializeSets,
} from "@/lib/submission";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const formData = await request.formData();
    const parsed = parseSubmissionInput(formData);

    if (parsed.challengeDate < CHALLENGE_START_DATE || !canSubmitForDate(parsed.challengeDate)) {
      throw new Error("Uploads sind nur für heute und gestern erlaubt.");
    }

    if (!user.isLightParticipant) {
      assertSubmissionMatchesRules(parsed);
    }

    const persistedFiles = [];

    if (!user.isLightParticipant) {
      const files = getVideoFiles(formData);
      const { folderPath, safeUserLabel } = await ensureDailyUploadDirectory(
        user.name || user.email,
        parsed.challengeDate,
      );

      await rm(folderPath, { recursive: true, force: true });
      const freshDirectory = await ensureDailyUploadDirectory(
        user.name || user.email,
        parsed.challengeDate,
      );

      for (const [index, file] of files.entries()) {
        const storedName = buildStoredVideoFileName({
          challengeDate: parsed.challengeDate,
          safeUserLabel,
          partIndex: index,
          originalName: file.name,
        });
        const storedPath = path.join(freshDirectory.folderPath, storedName);
        const bytes = Buffer.from(await file.arrayBuffer());

        await writeFile(storedPath, bytes);

        persistedFiles.push({
          originalName: file.name,
          storedName,
          storedPath,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          orderIndex: index,
        });
      }
    }

    const existing = await prisma.dailySubmission.findUnique({
      where: {
        userId_challengeDate: {
          userId: user.id,
          challengeDate: parsed.challengeDate,
        },
      },
      include: {
        videos: true,
      },
    });

    if (existing) {
      await prisma.sicknessVerification.deleteMany({
        where: {
          dailySubmissionId: existing.id,
        },
      });
      await prisma.workoutReview.deleteMany({
        where: {
          dailySubmissionId: existing.id,
        },
      });
      await prisma.dailyVideo.deleteMany({
        where: {
          dailySubmissionId: existing.id,
        },
      });
    }

    await prisma.dailySubmission.upsert({
      where: {
        userId_challengeDate: {
          userId: user.id,
          challengeDate: parsed.challengeDate,
        },
      },
      update: {
        status: "COMPLETED",
        reviewStatus: user.isLightParticipant ? "NOT_REQUIRED" : "PENDING",
        verifiedPushupTotal: null,
        verifiedSitupTotal: null,
        reviewedAt: null,
        pushupSets: serializeSets(parsed.pushupSets),
        situpSets: serializeSets(parsed.situpSets),
        notes: parsed.notes || null,
        submittedAt: new Date(),
        videos: {
          createMany: {
            data: persistedFiles,
          },
        },
      },
      create: {
        userId: user.id,
        challengeDate: parsed.challengeDate,
        status: "COMPLETED",
        reviewStatus: user.isLightParticipant ? "NOT_REQUIRED" : "PENDING",
        pushupSets: serializeSets(parsed.pushupSets),
        situpSets: serializeSets(parsed.situpSets),
        notes: parsed.notes || null,
        submittedAt: new Date(),
        videos: {
          createMany: {
            data: persistedFiles,
          },
        },
      },
    });

    return NextResponse.redirect(
      new URL(
        user.isLightParticipant
          ? "/dashboard?success=Eintrag%20gespeichert"
          : "/dashboard?success=Trainingstag%20gespeichert",
        request.url,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Submission konnte nicht gespeichert werden.";

    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
