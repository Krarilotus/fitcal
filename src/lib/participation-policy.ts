export type ParticipationModeInput = {
  isLightParticipant: boolean;
};

export type ParticipationMode = "LIGHT" | "PAID";

export type ParticipationCapabilities = {
  mode: ParticipationMode;
  maxSetsPerExercise: number;
  canTrackWorkout: true;
  canUploadWorkoutVideos: boolean;
  canAccessWorkoutVideos: boolean;
  canReviewPlatformContent: boolean;
  canUseChallengeJokers: boolean;
  canSubmitSicknessClaims: boolean;
  canAccrueChallengeDebt: boolean;
  canReceiveWorkoutReviews: boolean;
};

/** Product limits that vary by participation mode belong here. */
export const PAID_SETS_PER_EXERCISE = 2;
export const LIGHT_SETS_PER_EXERCISE = 100;

export function getParticipationMode(mode: ParticipationModeInput): ParticipationMode {
  return mode.isLightParticipant ? "LIGHT" : "PAID";
}

export function getParticipationCapabilities(
  input: ParticipationModeInput,
): ParticipationCapabilities {
  const mode = getParticipationMode(input);
  const isPaid = mode === "PAID";

  return {
    mode,
    maxSetsPerExercise: isPaid ? PAID_SETS_PER_EXERCISE : LIGHT_SETS_PER_EXERCISE,
    canTrackWorkout: true,
    canUploadWorkoutVideos: isPaid,
    canAccessWorkoutVideos: isPaid,
    canReviewPlatformContent: isPaid,
    canUseChallengeJokers: isPaid,
    canSubmitSicknessClaims: isPaid,
    canAccrueChallengeDebt: isPaid,
    canReceiveWorkoutReviews: isPaid,
  };
}

export function getMaxSetsPerExercise(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).maxSetsPerExercise;
}

export function canSubmitWorkoutForDate(
  mode: ParticipationModeInput,
  dateIsWithinChallenge: boolean,
  dateIsOpen: boolean,
) {
  return dateIsWithinChallenge && (mode.isLightParticipant || canTrackWorkout(mode) || dateIsOpen);
}

export function canTrackWorkout(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canTrackWorkout;
}

export function canUploadWorkoutVideos(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canUploadWorkoutVideos;
}

export function canAccessWorkoutVideos(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canAccessWorkoutVideos;
}

export function canReviewPlatformContent(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canReviewPlatformContent;
}

export function canUseChallengeJokers(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canUseChallengeJokers;
}

export function canSubmitSicknessClaims(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canSubmitSicknessClaims;
}

export function canAccrueChallengeDebt(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canAccrueChallengeDebt;
}

export function canReceiveWorkoutReviews(mode: ParticipationModeInput) {
  return getParticipationCapabilities(mode).canReceiveWorkoutReviews;
}
