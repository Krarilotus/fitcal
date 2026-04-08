export const TARGET_UPLOAD_VIDEO_BYTES = 15 * 1024 * 1024;
export const TARGET_UPLOAD_VIDEO_MB = 15;
export const TARGET_VIDEO_MAX_WIDTH = 854;
export const TARGET_VIDEO_MAX_HEIGHT = 480;
export const TARGET_VIDEO_FPS = 24;
export const TARGET_VIDEO_CONTAINER_EXTENSION = "mp4";
export const TARGET_VIDEO_MIME_TYPE = "video/mp4";
export const TARGET_VIDEO_CODEC = "avc" as const;
export const TARGET_VIDEO_KEYFRAME_INTERVAL_SECONDS = 4;
export const TARGET_VIDEO_HARDWARE_ACCELERATION = "no-preference" as const;
export const TARGET_VIDEO_LATENCY_MODE = "realtime" as const;
export const TARGET_VIDEO_BITRATE_MODE = "variable" as const;
export const TARGET_VIDEO_CONTENT_HINT = "motion" as const;
export const DISCARD_AUDIO_ON_TRANSCODE = true;

export const MIN_TOTAL_BITRATE_KBPS = 160;
export const MAX_TOTAL_BITRATE_KBPS = 1_600;
export const OUTPUT_SIZE_SAFETY_RATIO = 0.94;
