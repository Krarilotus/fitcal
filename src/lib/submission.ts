import { WorkoutReviewStatus } from "@prisma/client";
import { z } from "zod";
import {
  MAX_SETS_PER_EXERCISE,
  MAX_VIDEO_FILES_PER_DAY,
  MAX_VIDEO_SIZE_BYTES,
  canSubmitForDate,
} from "@/lib/challenge";

export const dailySubmissionSchema = z.object({
  challengeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pushupSet1: z.coerce.number().int().min(0).max(10000).default(0),
  pushupSet2: z.coerce.number().int().min(0).max(10000).default(0),
  situpSet1: z.coerce.number().int().min(0).max(10000).default(0),
  situpSet2: z.coerce.number().int().min(0).max(10000).default(0),
  notes: z.string().trim().max(1000).optional().default(""),
});

function getSetValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value == null || value === "" ? 0 : value;
}

export interface ParsedSubmissionInput {
  challengeDate: string;
  pushupSets: [number, number];
  situpSets: [number, number];
  notes: string;
}

export function parseSubmissionInput(formData: FormData): ParsedSubmissionInput {
  const parsed = dailySubmissionSchema.parse({
    challengeDate: formData.get("challengeDate"),
    pushupSet1: getSetValue(formData, "pushupSet1"),
    pushupSet2: getSetValue(formData, "pushupSet2"),
    situpSet1: getSetValue(formData, "situpSet1"),
    situpSet2: getSetValue(formData, "situpSet2"),
    notes: formData.get("notes"),
  });

  return {
    challengeDate: parsed.challengeDate,
    pushupSets: [parsed.pushupSet1, parsed.pushupSet2],
    situpSets: [parsed.situpSet1, parsed.situpSet2],
    notes: parsed.notes || "",
  };
}

export function getVideoFiles(formData: FormData) {
  const files = formData
    .getAll("videos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length < 1 || files.length > MAX_VIDEO_FILES_PER_DAY) {
    throw new Error("Bitte lade zwischen 1 und 4 Videos hoch.");
  }

  for (const file of files) {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error("Jede Videodatei darf hoechstens 100 MB gross sein.");
    }
  }

  return files;
}

export function getVideoDisplayNames(formData: FormData, files: File[]) {
  return files.map((file, index) => {
    const rawValue = formData.get(`videoDisplayName${index}`);

    if (typeof rawValue !== "string") {
      return file.name;
    }

    const trimmed = rawValue.trim();

    if (!trimmed) {
      return file.name;
    }

    const lastDotIndex = file.name.lastIndexOf(".");
    const extension = lastDotIndex >= 0 ? file.name.slice(lastDotIndex) : "";
    const hasExtension = /\.[A-Za-z0-9]{1,8}$/.test(trimmed);
    const normalizedBase = trimmed.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();

    if (!normalizedBase) {
      return file.name;
    }

    const withExtension = hasExtension ? normalizedBase : `${normalizedBase}${extension}`;

    return withExtension.slice(0, 120);
  });
}

export function serializeSets(sets: number[]) {
  return JSON.stringify(sets);
}

export function deserializeSets(value: string) {
  const parsed = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    return [0, 0];
  }

  return parsed
    .map((item) => Number(item) || 0)
    .slice(0, MAX_SETS_PER_EXERCISE) as number[];
}

export function getSetsTotal(value: string) {
  return deserializeSets(value).reduce((sum, item) => sum + item, 0);
}

export function getSubmissionTotals(submission: {
  pushupSets: string;
  situpSets: string;
  verifiedPushupTotal?: number | null;
  verifiedSitupTotal?: number | null;
}) {
  const pushupTotal = getSetsTotal(submission.pushupSets);
  const situpTotal = getSetsTotal(submission.situpSets);

  return {
    pushupTotal,
    situpTotal,
    effectivePushupTotal: submission.verifiedPushupTotal ?? pushupTotal,
    effectiveSitupTotal: submission.verifiedSitupTotal ?? situpTotal,
  };
}

export function preservesSubmissionWithoutVideos(reviewStatus: WorkoutReviewStatus) {
  return (
    reviewStatus === WorkoutReviewStatus.APPROVED ||
    reviewStatus === WorkoutReviewStatus.NOT_REQUIRED
  );
}

export function canEditSubmissionBeforeReview(input: {
  challengeDate: string;
  reviewCount: number;
}) {
  return canSubmitForDate(input.challengeDate) && input.reviewCount === 0;
}
