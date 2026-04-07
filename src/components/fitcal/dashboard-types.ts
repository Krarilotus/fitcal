import type { DayCompletionState } from "@/lib/challenge";

export type OpenDay = {
  challengeDate: string;
  dateLabel: string;
  targetReps: number;
  isCurrentDay: boolean;
  isQualificationDay: boolean;
  canUseJoker: boolean;
  reviewStatusLabel: string | null;
  latestReviewComment: string | null;
  latestReviewReviewerLabel: string | null;
};

export type TimelineVideo = {
  id: string;
  originalName: string;
  sizeLabel: string;
};

export type TimelineEntry = {
  challengeDate: string;
  dateLabel: string;
  repsTarget: number;
  statusLabel: string;
  debtLabel: string | null;
  pushupTotal: number | null;
  situpTotal: number | null;
  verifiedPushupTotal: number | null;
  verifiedSitupTotal: number | null;
  reviewStatusLabel: string | null;
  pushupSet1: number | null;
  pushupSet2: number | null;
  situpSet1: number | null;
  situpSet2: number | null;
  pushupOverTarget: number | null;
  situpOverTarget: number | null;
  notes: string | null;
  latestReviewComment: string | null;
  latestReviewReviewerLabel: string | null;
  videos: TimelineVideo[];
};

export type PerformancePoint = {
  challengeDate: string;
  pushups: number;
  situps: number;
  pushupSet1: number;
  pushupSet2: number;
  situpSet1: number;
  situpSet2: number;
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
  motivation: string | null;
  birthDateInput: string;
  birthDateLabel: string | null;
  heightInput: string;
  heightLabel: string | null;
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
  qualificationUploads: number;
  qualificationRequiredUploads: number;
  qualificationLabel: string;
  documentedDays: number;
  pendingReviewCount: number;
  debtLabel: string | null;
  reviewLabel: string;
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
  priorNote: string | null;
  workoutNote: string | null;
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
  reviewComment: string | null;
  reviewerLabel: string;
  workoutNote: string | null;
  videos: ReviewVideo[];
};

export type SicknessReviewItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  notes: string | null;
};
