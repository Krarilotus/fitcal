export interface BrowserVideoMetadata {
  durationSeconds: number;
  height: number;
  width: number;
}

export async function readBrowserVideoMetadata(file: File): Promise<BrowserVideoMetadata> {
  if (typeof window === "undefined") {
    throw new Error("Videometadaten können nur im Browser gelesen werden.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const metadata = await new Promise<BrowserVideoMetadata>((resolve, reject) => {
      const video = document.createElement("video");

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
        const width = video.videoWidth;
        const height = video.videoHeight;

        cleanup();

        if (durationSeconds <= 0 || width <= 0 || height <= 0) {
          reject(new Error("Videometadaten konnten nicht gelesen werden."));
          return;
        }

        resolve({
          durationSeconds,
          height,
          width,
        });
      };

      video.onerror = () => {
        cleanup();
        reject(new Error("Videometadaten konnten nicht gelesen werden."));
      };

      video.src = objectUrl;
    });

    return metadata;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
