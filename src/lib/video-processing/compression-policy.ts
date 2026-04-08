import {
  MAX_TOTAL_BITRATE_KBPS,
  MIN_TOTAL_BITRATE_KBPS,
  OUTPUT_SIZE_SAFETY_RATIO,
  TARGET_UPLOAD_VIDEO_BYTES,
  TARGET_VIDEO_FPS,
  TARGET_VIDEO_MAX_HEIGHT,
  TARGET_VIDEO_MAX_WIDTH,
} from "@/lib/video-processing/constants";

export interface VideoCompressionPlanInput {
  durationSeconds: number;
  width: number;
  height: number;
  maxOutputBytes?: number;
  strictness?: number;
}

export interface VideoCompressionPlan {
  durationSeconds: number;
  estimatedOutputBytes: number;
  outputHeight: number;
  outputWidth: number;
  targetFps: number;
  targetOutputBytes: number;
  totalBitrateKbps: number;
  videoBitrateKbps: number;
}

export function shouldCompressVideoBeforeUpload(
  fileSizeBytes: number,
  maxOutputBytes = TARGET_UPLOAD_VIDEO_BYTES,
) {
  return fileSizeBytes > maxOutputBytes;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function even(value: number) {
  const normalized = Math.max(2, Math.round(value));
  return normalized % 2 === 0 ? normalized : normalized + 1;
}

export function scaleVideoDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Ungültige Videoabmessungen für die Kompression.");
  }

  const scale = Math.min(
    TARGET_VIDEO_MAX_WIDTH / width,
    TARGET_VIDEO_MAX_HEIGHT / height,
    1,
  );

  return {
    outputWidth: even(Math.min(TARGET_VIDEO_MAX_WIDTH, width * scale)),
    outputHeight: even(Math.min(TARGET_VIDEO_MAX_HEIGHT, height * scale)),
  };
}

export function estimateTotalBitrateKbps(durationSeconds: number, targetOutputBytes: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Ungültige Videolänge für die Kompression.");
  }

  const rawBitrateKbps = Math.floor(
    (targetOutputBytes * 8 * OUTPUT_SIZE_SAFETY_RATIO) / durationSeconds / 1000,
  );

  return clamp(rawBitrateKbps, MIN_TOTAL_BITRATE_KBPS, MAX_TOTAL_BITRATE_KBPS);
}

export function buildVideoCompressionPlan({
  durationSeconds,
  width,
  height,
  maxOutputBytes = TARGET_UPLOAD_VIDEO_BYTES,
  strictness = 1,
}: VideoCompressionPlanInput): VideoCompressionPlan {
  const normalizedStrictness = clamp(strictness, 0.45, 1);
  const targetOutputBytes = Math.floor(maxOutputBytes * normalizedStrictness);
  const totalBitrateKbps = estimateTotalBitrateKbps(durationSeconds, targetOutputBytes);
  const { outputWidth, outputHeight } = scaleVideoDimensions(width, height);

  return {
    durationSeconds,
    estimatedOutputBytes: Math.ceil(
      (durationSeconds * totalBitrateKbps * 1000) / 8 / OUTPUT_SIZE_SAFETY_RATIO,
    ),
    outputHeight,
    outputWidth,
    targetFps: TARGET_VIDEO_FPS,
    targetOutputBytes,
    totalBitrateKbps,
    videoBitrateKbps: totalBitrateKbps,
  };
}

export function deriveRetryCompressionPlan(
  previousPlan: VideoCompressionPlan,
  actualOutputBytes: number,
) {
  const overshootRatio = actualOutputBytes / previousPlan.targetOutputBytes;
  const stricterTargetBytes = Math.floor(previousPlan.targetOutputBytes / Math.max(overshootRatio, 1.1));

  return buildVideoCompressionPlan({
    durationSeconds: previousPlan.durationSeconds,
    height: previousPlan.outputHeight,
    maxOutputBytes: Math.max(stricterTargetBytes, Math.floor(previousPlan.targetOutputBytes * 0.72)),
    strictness: 0.9,
    width: previousPlan.outputWidth,
  });
}
