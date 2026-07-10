import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccessWorkoutVideos,
  canAccrueChallengeDebt,
  canReceiveWorkoutReviews,
  canReviewPlatformContent,
  canSubmitSicknessClaims,
  canTrackWorkout,
  canUploadWorkoutVideos,
  canUseChallengeJokers,
  getParticipationCapabilities,
} from "@/lib/participation-policy";

test("light participants can track workouts without privileged challenge capabilities", () => {
  const lightParticipant = { isLightParticipant: true };

  assert.equal(canTrackWorkout(lightParticipant), true);
  assert.equal(canAccessWorkoutVideos(lightParticipant), false);
  assert.equal(canAccrueChallengeDebt(lightParticipant), false);
  assert.equal(canReceiveWorkoutReviews(lightParticipant), false);
  assert.equal(canReviewPlatformContent(lightParticipant), false);
  assert.equal(canSubmitSicknessClaims(lightParticipant), true);
  assert.equal(canUploadWorkoutVideos(lightParticipant), false);
  assert.equal(canUseChallengeJokers(lightParticipant), false);
});

test("full participants keep all challenge capabilities", () => {
  const fullParticipant = { isLightParticipant: false };

  assert.equal(canTrackWorkout(fullParticipant), true);
  assert.equal(canAccessWorkoutVideos(fullParticipant), true);
  assert.equal(canAccrueChallengeDebt(fullParticipant), true);
  assert.equal(canReceiveWorkoutReviews(fullParticipant), true);
  assert.equal(canReviewPlatformContent(fullParticipant), true);
  assert.equal(canSubmitSicknessClaims(fullParticipant), true);
  assert.equal(canUploadWorkoutVideos(fullParticipant), true);
  assert.equal(canUseChallengeJokers(fullParticipant), true);
});

test("capability snapshots are the single source for mode limits", () => {
  const light = getParticipationCapabilities({ isLightParticipant: true });
  const paid = getParticipationCapabilities({ isLightParticipant: false });

  assert.equal(light.mode, "LIGHT");
  assert.equal(light.maxSetsPerExercise, 100);
  assert.equal(light.canUploadWorkoutVideos, false);
  assert.equal(paid.mode, "PAID");
  assert.equal(paid.maxSetsPerExercise, 2);
  assert.equal(paid.canUploadWorkoutVideos, true);
});
