export type ParticipationModeInput = {
  isLightParticipant: boolean;
};

/** Product limits that vary by participation mode belong here. */
export const PAID_SETS_PER_EXERCISE = 2;
export const LIGHT_SETS_PER_EXERCISE = 100;

export function getMaxSetsPerExercise(mode: ParticipationModeInput) {
  return mode.isLightParticipant ? LIGHT_SETS_PER_EXERCISE : PAID_SETS_PER_EXERCISE;
}

export function canSubmitWorkoutForDate(
  mode: ParticipationModeInput,
  dateIsWithinChallenge: boolean,
  dateIsOpen: boolean,
) {
  return dateIsWithinChallenge && (mode.isLightParticipant || dateIsOpen);
}

export function canTrackWorkout(mode: ParticipationModeInput) {
  void mode;
  return true;
}

export function canUploadWorkoutVideos(mode: ParticipationModeInput) {
  return !mode.isLightParticipant;
}

export function canAccessWorkoutVideos(mode: ParticipationModeInput) {
  return canUploadWorkoutVideos(mode);
}

export function canReviewPlatformContent(mode: ParticipationModeInput) {
  return !mode.isLightParticipant;
}

export function canUseChallengeJokers(mode: ParticipationModeInput) {
  return !mode.isLightParticipant;
}

export function canSubmitSicknessClaims(mode: ParticipationModeInput) {
  return !mode.isLightParticipant;
}

export function canAccrueChallengeDebt(mode: ParticipationModeInput) {
  return !mode.isLightParticipant;
}

export function canReceiveWorkoutReviews(mode: ParticipationModeInput) {
  return !mode.isLightParticipant;
}
