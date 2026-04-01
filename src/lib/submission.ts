import { z } from "zod";
import {
  MAX_SETS_PER_EXERCISE,
  MAX_VIDEO_FILES_PER_DAY,
  MAX_VIDEO_SIZE_BYTES,
  getRequiredReps,
} from "@/lib/challenge";

export const dailySubmissionSchema = z.object({
  challengeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pushupSet1: z.coerce.number().int().min(0).max(10000),
  pushupSet2: z.coerce.number().int().min(0).max(10000),
  situpSet1: z.coerce.number().int().min(0).max(10000),
  situpSet2: z.coerce.number().int().min(0).max(10000),
  extraPushups: z.coerce.number().int().min(0).max(10000),
  extraSitups: z.coerce.number().int().min(0).max(10000),
  notes: z.string().trim().max(1000).optional().default(""),
});

export interface ParsedSubmissionInput {
  challengeDate: string;
  pushupSets: [number, number];
  situpSets: [number, number];
  extraPushups: number;
  extraSitups: number;
  notes: string;
}

export function parseSubmissionInput(formData: FormData): ParsedSubmissionInput {
  const parsed = dailySubmissionSchema.parse({
    challengeDate: formData.get("challengeDate"),
    pushupSet1: formData.get("pushupSet1"),
    pushupSet2: formData.get("pushupSet2"),
    situpSet1: formData.get("situpSet1"),
    situpSet2: formData.get("situpSet2"),
    extraPushups: formData.get("extraPushups"),
    extraSitups: formData.get("extraSitups"),
    notes: formData.get("notes"),
  });

  return {
    challengeDate: parsed.challengeDate,
    pushupSets: [parsed.pushupSet1, parsed.pushupSet2],
    situpSets: [parsed.situpSet1, parsed.situpSet2],
    extraPushups: parsed.extraPushups,
    extraSitups: parsed.extraSitups,
    notes: parsed.notes || "",
  };
}

export function assertSubmissionMatchesRules(input: ParsedSubmissionInput) {
  if (input.pushupSets.length > MAX_SETS_PER_EXERCISE || input.situpSets.length > MAX_SETS_PER_EXERCISE) {
    throw new Error("Es sind maximal zwei Sets pro Uebung erlaubt.");
  }

  const target = getRequiredReps(input.challengeDate);
  const pushupTotal = input.pushupSets.reduce((sum, current) => sum + current, 0);
  const situpTotal = input.situpSets.reduce((sum, current) => sum + current, 0);

  if (pushupTotal < target + input.extraPushups) {
    throw new Error("Die Liegestuetz-Sets decken Ziel und Extras noch nicht ab.");
  }

  if (situpTotal < target + input.extraSitups) {
    throw new Error("Die Situp-Sets decken Ziel und Extras noch nicht ab.");
  }
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
