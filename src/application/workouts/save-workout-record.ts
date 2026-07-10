import { type WorkoutReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeSets, type ParsedSubmissionInput } from "@/lib/submission";
import type { PersistedSubmissionVideo } from "@/lib/submission-videos";

type ReplacementVideo = PersistedSubmissionVideo & {
  targetId: string;
  previousStoredPath: string;
};

export async function saveWorkoutRecord(input: {
  userId: string;
  existingSubmissionId?: string;
  parsed: ParsedSubmissionInput;
  reviewStatus: WorkoutReviewStatus;
  appendedVideos: PersistedSubmissionVideo[];
  replacementVideo: ReplacementVideo | null;
}) {
  const { parsed, appendedVideos } = input;
  const relationData = {
    videos: appendedVideos.length
      ? { createMany: { data: appendedVideos } }
      : undefined,
    extraEntries: {
      deleteMany: {},
      createMany: parsed.extraEntries.length
        ? { data: parsed.extraEntries }
        : undefined,
    },
  };
  const updateData = {
    notes: parsed.notes || null,
    pushupSets: serializeSets(parsed.pushupSets),
    reviewStatus: input.reviewStatus,
    reviewedAt: null,
    situpSets: serializeSets(parsed.situpSets),
    status: "COMPLETED" as const,
    submittedAt: new Date(),
    verifiedPushupTotal: null,
    verifiedSitupTotal: null,
    ...relationData,
  };

  if (input.existingSubmissionId) {
    await prisma.$transaction(async (tx) => {
      await tx.dailySubmission.update({
        where: { id: input.existingSubmissionId },
        data: updateData,
      });
      if (input.replacementVideo) {
        await tx.dailyVideo.update({
          where: { id: input.replacementVideo.targetId },
          data: {
            mimeType: input.replacementVideo.mimeType,
            originalName: input.replacementVideo.originalName,
            sizeBytes: input.replacementVideo.sizeBytes,
            storedName: input.replacementVideo.storedName,
            storedPath: input.replacementVideo.storedPath,
          },
        });
      }
    });
    return;
  }

  await prisma.dailySubmission.upsert({
    where: {
      userId_challengeDate: {
        challengeDate: parsed.challengeDate,
        userId: input.userId,
      },
    },
    update: updateData,
    create: {
      challengeDate: parsed.challengeDate,
      notes: parsed.notes || null,
      pushupSets: serializeSets(parsed.pushupSets),
      reviewStatus: input.reviewStatus,
      situpSets: serializeSets(parsed.situpSets),
      status: "COMPLETED",
      submittedAt: new Date(),
      userId: input.userId,
      videos: relationData.videos,
      extraEntries: parsed.extraEntries.length
        ? { createMany: { data: parsed.extraEntries } }
        : undefined,
    },
  });
}
