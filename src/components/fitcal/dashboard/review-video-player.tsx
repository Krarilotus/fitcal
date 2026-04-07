"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function ReviewVideoPlayer({ videoId }: { videoId: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  function togglePlaybackRate() {
    const nextRate = playbackRate === 2 ? 1 : 2;
    setPlaybackRate(nextRate);

    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
      videoRef.current.defaultPlaybackRate = nextRate;
    }
  }

  return (
    <div className="space-y-2">
      <video
        className="w-full rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-black"
        controls
        playsInline
        preload="metadata"
        ref={videoRef}
        src={`/api/videos/${videoId}`}
      />
      <div className="flex justify-end">
        <Button onClick={togglePlaybackRate} size="sm" type="button" variant="secondary">
          {playbackRate === 2 ? "1x" : "2x"}
        </Button>
      </div>
    </div>
  );
}
