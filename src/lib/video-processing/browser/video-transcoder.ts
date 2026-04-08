import {
  buildVideoCompressionPlan,
  deriveRetryCompressionPlan,
  shouldCompressVideoBeforeUpload,
  type VideoCompressionPlan,
} from "@/lib/video-processing/compression-policy";
import {
  DISCARD_AUDIO_ON_TRANSCODE,
  TARGET_UPLOAD_VIDEO_BYTES,
  TARGET_VIDEO_BITRATE_MODE,
  TARGET_VIDEO_CODEC,
  TARGET_VIDEO_CONTENT_HINT,
  TARGET_VIDEO_CONTAINER_EXTENSION,
  TARGET_VIDEO_FPS,
  TARGET_VIDEO_HARDWARE_ACCELERATION,
  TARGET_VIDEO_KEYFRAME_INTERVAL_SECONDS,
  TARGET_VIDEO_LATENCY_MODE,
  TARGET_VIDEO_MIME_TYPE,
} from "@/lib/video-processing/constants";
import { readBrowserVideoMetadata } from "@/lib/video-processing/browser/video-metadata";
import { assertBrowserVideoCompressionSupport } from "@/lib/video-processing/browser/video-compression-support";
import type { PreparedUploadVideo } from "@/lib/video-processing/upload-form-data";

type MediabunnyModule = typeof import("mediabunny");

export type VideoPreparationErrorCode =
  | "encoder_load_failed"
  | "compression_failed"
  | "compression_too_large";

export class VideoPreparationError extends Error {
  code: VideoPreparationErrorCode;

  constructor(code: VideoPreparationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "VideoPreparationError";
  }
}

export interface TranscodeProgressUpdate {
  currentFileIndex: number;
  currentFileName: string;
  totalFiles: number;
  value: number;
}

export interface PrepareUploadVideosOptions {
  files: File[];
  onEncoderLoadStart?: () => void;
  onEncodingProgress?: (update: TranscodeProgressUpdate) => void;
  onEncodingStart?: (update: Omit<TranscodeProgressUpdate, "value">) => void;
  onEncoderReady?: () => void;
  totalFiles: number;
}

let sharedMediabunnyModulePromise: Promise<MediabunnyModule> | null = null;

async function getMediabunnyModule() {
  sharedMediabunnyModulePromise ??= import("mediabunny");
  return sharedMediabunnyModulePromise;
}

function sanitizeBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || "video";
}

function buildOutputFileName(fileName: string) {
  return `${sanitizeBaseName(fileName)}.${TARGET_VIDEO_CONTAINER_EXTENSION}`;
}

function describeDiscardReason(reason: string) {
  switch (reason) {
    case "no_encodable_target_codec":
      return "Kein passender hardwarebeschleunigter Video-Encoder verfuegbar.";
    case "undecodable_source_codec":
      return "Das Ausgangsvideo kann in diesem Browser nicht dekodiert werden.";
    case "unknown_source_codec":
      return "Das Videoformat des Ausgangsvideos ist unbekannt.";
    default:
      return "Die lokale Videokompression konnte fuer dieses Video nicht vorbereitet werden.";
  }
}

function buildVideoConversionOptions(plan: VideoCompressionPlan) {
  return {
    bitrate: plan.totalBitrateKbps * 1000,
    bitrateMode: TARGET_VIDEO_BITRATE_MODE,
    codec: TARGET_VIDEO_CODEC,
    contentHint: TARGET_VIDEO_CONTENT_HINT,
    fit: "contain" as const,
    forceTranscode: true,
    frameRate: TARGET_VIDEO_FPS,
    hardwareAcceleration: TARGET_VIDEO_HARDWARE_ACCELERATION,
    height: plan.outputHeight,
    keyFrameInterval: TARGET_VIDEO_KEYFRAME_INTERVAL_SECONDS,
    latencyMode: TARGET_VIDEO_LATENCY_MODE,
    width: plan.outputWidth,
  };
}

async function transcodeAttemptWithMediabunny(
  mediabunny: MediabunnyModule,
  file: File,
  plan: VideoCompressionPlan,
  onProgress?: (value: number) => void,
) {
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } =
    mediabunny;

  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

  const conversion = await Conversion.init({
    audio: DISCARD_AUDIO_ON_TRANSCODE
      ? { discard: true }
      : undefined,
    input,
    output,
    showWarnings: false,
    video: buildVideoConversionOptions(plan),
  });

  if (!conversion.isValid) {
    const [firstDiscardedTrack] = conversion.discardedTracks;
    throw new Error(describeDiscardReason(firstDiscardedTrack?.reason ?? "unknown"));
  }

  conversion.onProgress = (progress) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };

  await conversion.execute();

  const mimeType = await output.getMimeType().catch(() => TARGET_VIDEO_MIME_TYPE);
  const buffer = target.buffer;

  if (!buffer || buffer.byteLength <= 0) {
    throw new Error("Die lokale Videokompression hat keine abspielbare MP4-Datei erzeugt.");
  }

  return new File([buffer], buildOutputFileName(file.name), {
    lastModified: Date.now(),
    type: mimeType.startsWith("video/") ? mimeType : TARGET_VIDEO_MIME_TYPE,
  });
}

async function transcodeSingleVideo(
  mediabunny: MediabunnyModule,
  file: File,
  index: number,
  options: PrepareUploadVideosOptions,
): Promise<PreparedUploadVideo> {
  const metadata = await readBrowserVideoMetadata(file);

  options.onEncodingStart?.({
    currentFileIndex: index + 1,
    currentFileName: file.name,
    totalFiles: options.totalFiles,
  });

  const runAttempt = async (plan: VideoCompressionPlan) =>
    transcodeAttemptWithMediabunny(mediabunny, file, plan, (value) => {
      options.onEncodingProgress?.({
        currentFileIndex: index + 1,
        currentFileName: file.name,
        totalFiles: options.totalFiles,
        value,
      });
    });

  let plan = buildVideoCompressionPlan({
    durationSeconds: metadata.durationSeconds,
    height: metadata.height,
    width: metadata.width,
  });
  let transcodedFile = await runAttempt(plan);

  if (transcodedFile.size > TARGET_UPLOAD_VIDEO_BYTES) {
    plan = deriveRetryCompressionPlan(plan, transcodedFile.size);
    transcodedFile = await runAttempt(plan);
  }

  if (transcodedFile.size > TARGET_UPLOAD_VIDEO_BYTES) {
    throw new VideoPreparationError(
      "compression_too_large",
      "Das komprimierte Video bleibt ueber 15 MB.",
    );
  }

  return {
    file: transcodedFile,
    outputSizeBytes: transcodedFile.size,
    originalSizeBytes: file.size,
    wasCompressed: true,
  };
}

export async function prepareUploadVideosForSubmission(
  options: PrepareUploadVideosOptions,
) {
  const filesNeedingCompression = options.files.map((file) =>
    shouldCompressVideoBeforeUpload(file.size),
  );
  const needsAnyCompression = filesNeedingCompression.some(Boolean);
  let mediabunny: MediabunnyModule | null = null;

  if (needsAnyCompression) {
    options.onEncoderLoadStart?.();

    try {
      assertBrowserVideoCompressionSupport();
      mediabunny = await getMediabunnyModule();
    } catch (error) {
      throw new VideoPreparationError(
        "encoder_load_failed",
        error instanceof Error
          ? error.message
          : "Der lokale Video-Encoder konnte nicht geladen werden.",
      );
    }

    options.onEncoderReady?.();
  }

  const preparedVideos: PreparedUploadVideo[] = [];

  for (const [index, file] of options.files.entries()) {
    if (!filesNeedingCompression[index]) {
      preparedVideos.push({
        file,
        outputSizeBytes: file.size,
        originalSizeBytes: file.size,
        wasCompressed: false,
      });
      continue;
    }

    if (!mediabunny) {
      throw new VideoPreparationError(
        "encoder_load_failed",
        "Der lokale Video-Encoder konnte nicht geladen werden.",
      );
    }

    try {
      preparedVideos.push(await transcodeSingleVideo(mediabunny, file, index, options));
    } catch (error) {
      if (error instanceof VideoPreparationError) {
        throw error;
      }

      throw new VideoPreparationError(
        "compression_failed",
        error instanceof Error
          ? error.message
          : "Die lokale Videokompression ist fehlgeschlagen.",
      );
    }
  }

  return preparedVideos;
}
