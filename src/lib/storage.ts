import { mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_UPLOAD_ROOT = "./data/uploads";

function slugifySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function getUploadRoot() {
  return process.env.UPLOAD_BASE_DIR || process.env.FITCAL_UPLOAD_DIR || DEFAULT_UPLOAD_ROOT;
}

export async function ensureDailyUploadDirectory(
  userLabel: string,
  challengeDate: string,
) {
  const safeUserLabel = slugifySegment(userLabel) || "participant";
  const folderPath = path.join(getUploadRoot(), safeUserLabel, challengeDate);

  await mkdir(folderPath, { recursive: true });

  return {
    folderPath,
    safeUserLabel,
  };
}

export function buildStoredVideoFileName(input: {
  challengeDate: string;
  safeUserLabel: string;
  partIndex: number;
  originalName: string;
}) {
  const extension = path.extname(input.originalName) || ".mp4";

  return `${input.challengeDate}__${input.safeUserLabel}__part-${String(
    input.partIndex + 1,
  ).padStart(2, "0")}${extension.toLowerCase()}`;
}
