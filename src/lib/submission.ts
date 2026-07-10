import { WorkoutReviewStatus } from "@prisma/client";
import { z } from "zod";
import {
  MAX_VIDEO_FILES_PER_DAY,
  MAX_VIDEO_SIZE_BYTES,
} from "@/lib/challenge";
import { getMaxSetsPerExercise, type ParticipationModeInput } from "@/lib/participation-policy";
import {
  parseWorkoutExtraEntries,
  type WorkoutExtraInput,
} from "@/lib/workout-extras";

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
  extraEntries: ParsedSubmissionExtra[];
  pushupSets: number[];
  situpSets: number[];
  notes: string;
}

export type ParsedSubmissionExtra = WorkoutExtraInput;

function getSetValues(formData: FormData, key: string, maxSets: number) {
  const values = formData.getAll(key);
  return values.slice(0, maxSets).map((value) => {
    const parsed = Number(value || 0);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000) throw new Error("Invalid set value");
    return parsed;
  });
}

export function parseSubmissionInput(formData: FormData, mode: ParticipationModeInput = { isLightParticipant: false }): ParsedSubmissionInput {
  const parsed = dailySubmissionSchema.parse({
    challengeDate: formData.get("challengeDate"),
    pushupSet1: getSetValue(formData, "pushupSet1"), pushupSet2: getSetValue(formData, "pushupSet2"),
    situpSet1: getSetValue(formData, "situpSet1"), situpSet2: getSetValue(formData, "situpSet2"),
    notes: formData.get("notes"),
  });

  const pushupSets = getSetValues(formData, "pushupSet", getMaxSetsPerExercise(mode));
  const situpSets = getSetValues(formData, "situpSet", getMaxSetsPerExercise(mode));

  return {
    challengeDate: parsed.challengeDate,
    extraEntries: parseWorkoutExtraEntries(formData),
    pushupSets: pushupSets.length ? pushupSets : [parsed.pushupSet1, parsed.pushupSet2],
    situpSets: situpSets.length ? situpSets : [parsed.situpSet1, parsed.situpSet2],
    notes: parsed.notes || "",
  };
}

export function getVideoFiles(
  formData: FormData,
  messages: {
    videoCount: string;
    videoTooLarge: string;
  } = {
    videoCount: "Bitte lade zwischen 1 und 4 Videos hoch.",
    videoTooLarge: "Jede Videodatei darf höchstens 100 MB groß sein.",
  },
) {
  const files = formData
    .getAll("videos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length < 1 || files.length > MAX_VIDEO_FILES_PER_DAY) {
    throw new Error(messages.videoCount);
  }

  for (const file of files) {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error(messages.videoTooLarge);
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
    .slice(0, 100) as number[];
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
  return input.reviewCount === 0;
}
