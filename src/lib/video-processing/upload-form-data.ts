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
    nextFormData.append("videos", video.file, video.file.name);
  }

  return nextFormData;
}
