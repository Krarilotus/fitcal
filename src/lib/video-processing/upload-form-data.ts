import { TARGET_UPLOAD_VIDEO_BYTES } from "@/lib/video-processing/constants";

export class UploadFormDataError extends Error {
  constructor(public readonly code: "prepared_video_too_large") {
    super(code);
    this.name = "UploadFormDataError";
  }
}

export interface PreparedUploadVideo {
  file: File;
  outputSizeBytes: number;
  originalSizeBytes: number;
  wasCompressed?: boolean;
}

export function buildSubmissionUploadFormData(
  formData: FormData,
  videos: PreparedUploadVideo[],
) {
  const nextFormData = new FormData();

  for (const [key, value] of formData.entries()) {
    if (key !== "videos") {
      nextFormData.append(key, value);
    }
  }

  for (const video of videos) {
    if (!(video.file instanceof File) || video.file.size > TARGET_UPLOAD_VIDEO_BYTES) {
      throw new UploadFormDataError("prepared_video_too_large");
    }

    nextFormData.append("videos", video.file, video.file.name);
  }

  return nextFormData;
}
