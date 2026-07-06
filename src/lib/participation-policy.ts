export type ParticipationModeInput = {
  isLightParticipant: boolean;
};

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
