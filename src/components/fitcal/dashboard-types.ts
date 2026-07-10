import type { DayCompletionState } from "@/lib/challenge";

export type PendingApprovalSummary = {
  id: string;
  applicant: {
    id: string;
    email: string;
    name: string | null;
    motivation: string | null;
    createdAt: Date;
  };
};

export type ActiveInviteSummary = {
  id: string;
  email: string;
};

export type ReviewFeedbackNote = {
  id: string;
  reviewerLabel: string;
  stageLabel: string;
  note: string;
};

export type TimelineVideo = {
  id: string;
  originalName: string;
  sizeLabel: string;
};

export type ExtraWorkoutEntry = {
  categoryName: string;
  value: number;
};

export type OpenDay = {
  challengeDate: string;
  dateLabel: string;
  targetReps: number;
  showByDefault: boolean;
  isCurrentDay: boolean;
  isPreviousDay: boolean;
  isQualificationDay: boolean;
  canUseJoker: boolean;
  hasExistingClaim: boolean;
  isEditableClaim: boolean;
  canAddVideos: boolean;
  pushupSets: number[];
  situpSets: number[];
  notes: string;
  reviewStatusLabel: string | null;
  reviewerSummaryLabel: string | null;
  reviewNotes: ReviewFeedbackNote[];
  extraEntries: ExtraWorkoutEntry[];
  videos: TimelineVideo[];
};

export type TimelineEntry = {
  challengeDate: string;
  dateLabel: string;
  repsTarget: number;
  status: DayCompletionState;
  statusLabel: string;
  canUseJoker: boolean;
  canSubmitSicknessClaims: boolean;
  canCreateClaim: boolean;
  debtLabel: string | null;
  pushupTotal: number | null;
  situpTotal: number | null;
  verifiedPushupTotal: number | null;
  verifiedSitupTotal: number | null;
  reviewStatusLabel: string | null;
  pushupSets: number[];
  situpSets: number[];
  pushupOverTarget: number | null;
  situpOverTarget: number | null;
  notes: string | null;
  reviewerSummaryLabel: string | null;
  reviewNotes: ReviewFeedbackNote[];
  extraEntries: ExtraWorkoutEntry[];
  deletingLastVideoRemovesClaim: boolean;
  isEditableClaim: boolean;
  canAddVideos: boolean;
  videos: TimelineVideo[];
};

export type PerformancePoint = {
  challengeDate: string;
  pushups: number;
  situps: number;
  pushupSets: number[];
  situpSets: number[];
  extras: Record<string, number>;
  target: number;
};

export type MeasurementPoint = {
  measuredAt: string;
  weightKg: number | null;
  waistCircumferenceCm: number | null;
  restingPulseBpm: number | null;
};

export type ProfileSummary = {
  name: string | null;
  email: string;
  emailVerified: boolean;
  motivation: string | null;
  birthDateInput: string;
  birthDateLabel: string | null;
  heightInput: string;
  heightLabel: string | null;
  emailVerifiedAtLabel: string | null;
  weightLabel: string | null;
  waistLabel: string | null;
  latestWeightKg: number | null;
};

export type OverviewSummary = {
  dayNumber: number;
  currentTarget: number;
  isQualificationPhase: boolean;
  qualificationDay: number;
  qualificationWindowDays: number;
  qualificationUploads: number;
  qualificationRequiredUploads: number;
  outstandingDebtLabel: string;
  outstandingDebtCents: number;
  reviewBudgetLabel: string;
  reviewBudgetCents: number;
  hasStudentDiscount: boolean;
  isLightParticipant: boolean;
  existingSlackDays: number;
  monthJokersRemaining: number;
  documentedDays: number;
  dailyMessage: string | null;
};

export type ParticipantRow = {
  id: string;
  name: string;
  isSelf: boolean;
  modeLabel: string;
  todayStatus: DayCompletionState;
  yesterdayStatus: DayCompletionState;
  todayLabel: string;
  yesterdayLabel: string;
  totalPushups: number;
  totalSitups: number;
  extraTotals: Record<string, number>;
  qualificationUploads: number;
  qualificationRequiredUploads: number;
  qualificationLabel: string;
  documentedDays: number;
  sickDays: number;
  pendingReviewCount: number;
  debtLabel: string | null;
  reviewLabel: string;
  commonReviewerLabel: string;
};

export type ReviewVideo = {
  id: string;
  label: string;
};

export type PrimaryReviewItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  targetReps: number;
  claimedPushups: number;
  claimedSitups: number;
  statusLabel: string | null;
  workoutNote: string | null;
  reviewNotes: ReviewFeedbackNote[];
  videos: ReviewVideo[];
};

export type EscalationReviewItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  targetReps: number;
  claimedPushups: number;
  claimedSitups: number;
  reviewedPushups: number;
  reviewedSitups: number;
  workoutNote: string | null;
  reviewNotes: ReviewFeedbackNote[];
  reviewSummaryLabel: string | null;
  videos: ReviewVideo[];
};

export type ReviewFeedbackItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  statusLabel: string | null;
  workoutNote: string | null;
  reviewNotes: ReviewFeedbackNote[];
};

export type SicknessReviewItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  notes: string | null;
};
