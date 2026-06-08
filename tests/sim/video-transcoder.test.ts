import test from "node:test";
import assert from "node:assert/strict";
import { TARGET_VIDEO_FPS } from "@/lib/video-processing/constants";
import {
  buildVideoCompressionPlan,
  deriveRetryCompressionPlan,
} from "@/lib/video-processing/compression-policy";
import {
  buildFfmpegArgs,
  transcodeAttemptWithEncoderFallback,
} from "@/lib/video-processing/browser/video-transcoder";

test("retry compression plan stays stricter after a too-large output", () => {
  const initialPlan = buildVideoCompressionPlan({
    durationSeconds: 90,
    height: 1080,
    width: 1920,
  });
  const retryPlan = deriveRetryCompressionPlan(
    initialPlan,
    initialPlan.targetOutputBytes * 1.4,
  );

  assert.equal(retryPlan.targetFps, TARGET_VIDEO_FPS);
  assert.ok(retryPlan.targetOutputBytes < initialPlan.targetOutputBytes);
  assert.ok(retryPlan.totalBitrateKbps < initialPlan.totalBitrateKbps);
  assert.ok(retryPlan.outputWidth <= initialPlan.outputWidth);
  assert.ok(retryPlan.outputHeight <= initialPlan.outputHeight);
});

test("ffmpeg fallback command uses explicit mp4 transcode settings", () => {
  const plan = buildVideoCompressionPlan({
    durationSeconds: 42,
    height: 1080,
    width: 1920,
  });
  const args = buildFfmpegArgs("input.mov", "output.mp4", plan);

  assert.deepEqual(args.slice(0, 6), ["-i", "input.mov", "-an", "-c:v", "libx264", "-preset"]);
  assert.ok(args.includes("veryfast"));
  assert.ok(args.includes("yuv420p"));
  assert.ok(args.includes("+faststart"));
  assert.ok(args.includes("scale=w=854:h=480:force_original_aspect_ratio=decrease:force_divisible_by=2"));
  assert.equal(args.at(-1), "output.mp4");
});

test("encoder fallback keeps mediabunny result when the fast path succeeds", async () => {
  const plan = buildVideoCompressionPlan({
    durationSeconds: 15,
    height: 720,
    width: 1280,
  });
  const file = new File(["raw"], "clip.mov", { type: "video/quicktime" });
  const transcodedFile = new File(["fast"], "clip.mp4", { type: "video/mp4" });
  let ffmpegCalls = 0;

  const result = await transcodeAttemptWithEncoderFallback({
    ffmpegTranscode: async () => {
      ffmpegCalls += 1;
      return new File(["slow"], "fallback.mp4", { type: "video/mp4" });
    },
    file,
    mediabunnyTranscode: async () => transcodedFile,
    plan,
  });

  assert.equal(result, transcodedFile);
  assert.equal(ffmpegCalls, 0);
});

test("encoder fallback switches to ffmpeg when mediabunny fails", async () => {
  const plan = buildVideoCompressionPlan({
    durationSeconds: 15,
    height: 720,
    width: 1280,
  });
  const file = new File(["raw"], "clip.mov", { type: "video/quicktime" });
  const fallbackFile = new File(["slow"], "clip.mp4", { type: "video/mp4" });
  const fallbackErrors: unknown[] = [];

  const result = await transcodeAttemptWithEncoderFallback({
    ffmpegTranscode: async () => fallbackFile,
    file,
    mediabunnyTranscode: async () => {
      throw new Error("pixel encoder crash");
    },
    onFallback: (error) => {
      fallbackErrors.push(error);
    },
    plan,
  });

  assert.equal(result, fallbackFile);
  assert.equal(fallbackErrors.length, 1);
  assert.match(String((fallbackErrors[0] as Error).message), /pixel encoder crash/);
});
