import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildStoredVideoFileName, ensureDailyUploadDirectory } from "@/lib/storage";

export interface PersistedSubmissionVideo {
  mimeType: string;
  orderIndex: number;
  originalName: string;
  sizeBytes: number;
  storedName: string;
  storedPath: string;
}

export interface StoredSubmissionVideoTarget {
  orderIndex: number;
  storedPath: string;
}

export async function persistSubmissionVideos(input: {
  challengeDate: string;
  displayNames: string[];
  files: File[];
  startIndex?: number;
  userLabel: string;
}) {
  const { folderPath, safeUserLabel } = await ensureDailyUploadDirectory(
    input.userLabel,
    input.challengeDate,
  );
  const startIndex = input.startIndex ?? 0;
  const persistedFiles: PersistedSubmissionVideo[] = [];

  for (const [index, file] of input.files.entries()) {
    const originalName = input.displayNames[index] ?? file.name;
    const orderIndex = startIndex + index;
    const storedName = buildStoredVideoFileName({
      challengeDate: input.challengeDate,
      safeUserLabel,
      partIndex: orderIndex,
      originalName,
    });
    const storedPath = path.join(folderPath, storedName);
    const bytes = Buffer.from(await file.arrayBuffer());

    await writeFile(storedPath, bytes);

    persistedFiles.push({
      mimeType: file.type || "application/octet-stream",
      orderIndex,
      originalName,
      sizeBytes: file.size,
      storedName,
      storedPath,
    });
  }

  return persistedFiles;
}

export async function persistReplacementSubmissionVideo(input: {
  challengeDate: string;
  displayName: string;
  file: File;
  target: StoredSubmissionVideoTarget;
  userLabel: string;
}) {
  const { folderPath, safeUserLabel } = await ensureDailyUploadDirectory(
    input.userLabel,
    input.challengeDate,
  );
  const originalName = input.displayName || input.file.name;
  const storedName = buildStoredVideoFileName({
    challengeDate: input.challengeDate,
    safeUserLabel,
    partIndex: input.target.orderIndex,
    originalName,
  });
  const storedPath = path.join(folderPath, storedName);
  const bytes = Buffer.from(await input.file.arrayBuffer());

  await writeFile(storedPath, bytes);

  return {
    mimeType: input.file.type || "application/octet-stream",
    orderIndex: input.target.orderIndex,
    originalName,
    sizeBytes: input.file.size,
    storedName,
    storedPath,
  } satisfies PersistedSubmissionVideo;
}

export async function removeReplacedSubmissionVideo(
  previousStoredPath: string,
  nextStoredPath: string,
) {
  if (previousStoredPath === nextStoredPath) {
    return;
  }

  await rm(previousStoredPath, { force: true });
}
