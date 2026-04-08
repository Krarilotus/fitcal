import assert from "node:assert/strict";
import test from "node:test";
import { WorkoutReviewStatus } from "@prisma/client";
import {
  canEditSubmissionBeforeReview,
  preservesSubmissionWithoutVideos,
} from "@/lib/submission";

test("approved submissions can keep their claim without videos", () => {
  assert.equal(
    preservesSubmissionWithoutVideos(WorkoutReviewStatus.APPROVED),
    true,
  );
});

test("non-reviewed or still-open submissions lose their claim without videos", () => {
  assert.equal(
    preservesSubmissionWithoutVideos(WorkoutReviewStatus.PENDING),
    false,
  );
  assert.equal(
    preservesSubmissionWithoutVideos(WorkoutReviewStatus.REVISION_REQUESTED),
    false,
  );
  assert.equal(
    preservesSubmissionWithoutVideos(WorkoutReviewStatus.ESCALATED),
    false,
  );
});

test("not-required review status also preserves the submission", () => {
  assert.equal(
    preservesSubmissionWithoutVideos(WorkoutReviewStatus.NOT_REQUIRED),
    true,
  );
});

test("claims can only be edited during the active upload window before any review exists", () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const olderDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  assert.equal(
    canEditSubmissionBeforeReview({
      challengeDate: today,
      reviewCount: 0,
    }),
    true,
  );
  assert.equal(
    canEditSubmissionBeforeReview({
      challengeDate: today,
      reviewCount: 1,
    }),
    false,
  );
  assert.equal(
    canEditSubmissionBeforeReview({
      challengeDate: olderDate,
      reviewCount: 0,
    }),
    false,
  );
});
