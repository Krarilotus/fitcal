import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVideoCompressionPlan,
  deriveRetryCompressionPlan,
  estimateTotalBitrateKbps,
  scaleVideoDimensions,
  shouldCompressVideoBeforeUpload,
} from "@/lib/video-processing/compression-policy";
import { buildSubmissionUploadFormData } from "@/lib/video-processing/upload-form-data";
import { TARGET_UPLOAD_VIDEO_BYTES } from "@/lib/video-processing/constants";

test("compression plan keeps landscape videos inside 480p bounds", () => {
  const scaled = scaleVideoDimensions(1920, 1080);

  assert.deepEqual(scaled, {
    outputHeight: 480,
    outputWidth: 854,
  });
});

test("compression plan keeps portrait videos inside 480p bounds", () => {
  const scaled = scaleVideoDimensions(1080, 1920);

  assert.deepEqual(scaled, {
    outputHeight: 480,
    outputWidth: 270,
  });
});

test("compression plan targets a 10 minute video below the 15 MB budget", () => {
  const plan = buildVideoCompressionPlan({
    durationSeconds: 600,
    height: 1080,
    width: 1920,
  });

  assert.ok(plan.totalBitrateKbps >= 120);
  assert.ok(plan.estimatedOutputBytes <= TARGET_UPLOAD_VIDEO_BYTES);
  assert.equal(plan.targetFps, 24);
  assert.equal(plan.outputHeight, 480);
});

test("retry compression plan tightens the target after an oversized output", () => {
  const initialPlan = buildVideoCompressionPlan({
    durationSeconds: 86,
    height: 1080,
    width: 1920,
  });
  const retryPlan = deriveRetryCompressionPlan(initialPlan, initialPlan.targetOutputBytes * 1.4);

  assert.ok(retryPlan.targetOutputBytes < initialPlan.targetOutputBytes);
  assert.ok(retryPlan.totalBitrateKbps <= initialPlan.totalBitrateKbps);
});

test("bitrate estimation rejects invalid durations", () => {
  assert.throws(() => estimateTotalBitrateKbps(0, TARGET_UPLOAD_VIDEO_BYTES));
});

test("videos at or below 15 MB skip local compression", () => {
  assert.equal(shouldCompressVideoBeforeUpload(TARGET_UPLOAD_VIDEO_BYTES), false);
  assert.equal(shouldCompressVideoBeforeUpload(TARGET_UPLOAD_VIDEO_BYTES + 1), true);
});

test("submission form data swaps original upload files for processed files", () => {
  const formData = new FormData();
  formData.append("challengeDate", "2026-04-08");
  formData.append("videos", new File(["raw"], "raw.mov", { type: "video/quicktime" }));

  const processedFile = new File(["processed"], "raw.mp4", { type: "video/mp4" });
  const rebuilt = buildSubmissionUploadFormData(formData, [
    {
      file: processedFile,
      originalSizeBytes: 1000,
      outputSizeBytes: 500,
    },
  ]);

  const videos = rebuilt.getAll("videos");

  assert.equal(videos.length, 1);
  assert.ok(videos[0] instanceof File);
  assert.equal((videos[0] as File).name, "raw.mp4");
  assert.equal(rebuilt.get("challengeDate"), "2026-04-08");
});
