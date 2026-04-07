import {
  RegistrationApprovalDecision,
  RegistrationStatus,
  WorkoutReviewStage,
} from "@prisma/client";
import type { AppDictionary } from "@/i18n";
import {
  formatBirthDate,
  formatBirthDateInput,
  formatChallengeDate,
  formatDecimal,
  formatFileSize,
  formatHeightInput,
} from "@/components/fitcal/dashboard-formatters";
import {
  formatReviewStatus,
  getDayStatusLabel,
} from "@/components/fitcal/dashboard-labels";
import type {
  EscalationReviewItem,
  MeasurementPoint,
  OpenDay,
  OverviewSummary,
  ParticipantRow,
  PerformancePoint,
  PrimaryReviewItem,
  ProfileSummary,
  SicknessReviewItem,
  TimelineEntry,
} from "@/components/fitcal/dashboard-types";
import type { CurrentUser } from "@/lib/auth/session";
import {
  CHALLENGE_FREE_DAYS,
  CHALLENGE_START_DATE,
  formatCurrencyFromCents,
  getChallengeDayIndex,
  getChallengeOverview,
  getRequiredReps,
  isFreeChallengeDay,
} from "@/lib/challenge";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/preferences";
import { getDailyMessage } from "@/lib/special-day";
import { deserializeSets, getSubmissionTotals } from "@/lib/submission";
import { formatMeasurementDate } from "./measurements";

type DashboardLabels = AppDictionary["dashboard"];

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

export type DashboardPageData = {
  activeInvites: ActiveInviteSummary[];
  canReview: boolean;
  escalationReviewItems: EscalationReviewItem[];
  measurementPoints: MeasurementPoint[];
  openDays: OpenDay[];
  overview: OverviewSummary;
  participantRows: ParticipantRow[];
  pendingApprovals: PendingApprovalSummary[];
  performancePoints: PerformancePoint[];
  primaryReviewItems: PrimaryReviewItem[];
  profile: ProfileSummary;
  sicknessReviewItems: SicknessReviewItem[];
  timelineEntries: TimelineEntry[];
};

function buildChallengeRecords(user: CurrentUser) {
  return user.dailySubmissions.map((submission) => {
    const totals = getSubmissionTotals(submission);

    return {
      challengeDate: submission.challengeDate,
      status: submission.status,
      pushupTotal: totals.effectivePushupTotal,
      situpTotal: totals.effectiveSitupTotal,
    };
  });
}

function buildOpenDays(
  user: CurrentUser,
  locale: Locale,
  labels: DashboardLabels,
  overview: ReturnType<typeof getChallengeOverview>,
): OpenDay[] {
  return overview.days
    .filter((day) => day.canUpload)
    .map((day) => {
      const submission = user.dailySubmissions.find(
        (entry) => entry.challengeDate === day.challengeDate,
      );
      const latestReviewWithNote = submission
        ? [...submission.workoutReviews]
            .reverse()
            .find((review) => review.notes?.trim())
        : null;

      return {
        challengeDate: day.challengeDate,
        dateLabel: formatChallengeDate(locale, day.challengeDate),
        targetReps: getRequiredReps(day.challengeDate),
        isCurrentDay: day.isCurrentDay,
        isQualificationDay: isFreeChallengeDay(day.challengeDate),
        canUseJoker: day.canUseJoker,
        reviewStatusLabel: submission
          ? formatReviewStatus(submission.reviewStatus, labels.reviewStatusLabels)
          : null,
        latestReviewComment: latestReviewWithNote?.notes ?? null,
        latestReviewReviewerLabel: latestReviewWithNote
          ? latestReviewWithNote.reviewer.name || latestReviewWithNote.reviewer.email
          : null,
      };
    });
}

function buildTimelineEntries(
  user: CurrentUser,
  locale: Locale,
  labels: DashboardLabels,
  overview: ReturnType<typeof getChallengeOverview>,
): TimelineEntry[] {
  return overview.days.slice(-12).reverse().map((day) => {
    const submission = user.dailySubmissions.find(
      (entry) => entry.challengeDate === day.challengeDate,
    );
    const pushupSets = submission ? deserializeSets(submission.pushupSets) : [];
    const situpSets = submission ? deserializeSets(submission.situpSets) : [];
    const totals = submission ? getSubmissionTotals(submission) : null;
    const latestReviewWithNote = submission
      ? [...submission.workoutReviews]
          .reverse()
          .find((review) => review.notes?.trim())
      : null;

    return {
      challengeDate: day.challengeDate,
      dateLabel: formatChallengeDate(locale, day.challengeDate),
      repsTarget: day.repsTarget,
      statusLabel: getDayStatusLabel(day.status, labels.statusLabels),
      debtLabel: day.debtCents > 0 ? formatCurrencyFromCents(day.debtCents) : null,
      pushupTotal: totals?.pushupTotal ?? null,
      situpTotal: totals?.situpTotal ?? null,
      verifiedPushupTotal:
        submission?.verifiedPushupTotal != null ? submission.verifiedPushupTotal : null,
      verifiedSitupTotal:
        submission?.verifiedSitupTotal != null ? submission.verifiedSitupTotal : null,
      reviewStatusLabel: submission
        ? formatReviewStatus(submission.reviewStatus, labels.reviewStatusLabels)
        : null,
      pushupSet1: submission ? (pushupSets[0] ?? 0) : null,
      pushupSet2: submission ? (pushupSets[1] ?? 0) : null,
      situpSet1: submission ? (situpSets[0] ?? 0) : null,
      situpSet2: submission ? (situpSets[1] ?? 0) : null,
      pushupOverTarget: submission ? Math.max(0, totals!.pushupTotal - day.repsTarget) : null,
      situpOverTarget: submission ? Math.max(0, totals!.situpTotal - day.repsTarget) : null,
      notes: submission?.notes ?? null,
      latestReviewComment: latestReviewWithNote?.notes ?? null,
      latestReviewReviewerLabel: latestReviewWithNote
        ? latestReviewWithNote.reviewer.name || latestReviewWithNote.reviewer.email
        : null,
      videos:
        submission?.videos.map((video) => ({
          id: video.id,
          originalName: video.originalName,
          sizeLabel: formatFileSize(locale, video.sizeBytes),
        })) ?? [],
    };
  });
}

function buildPerformancePoints(user: CurrentUser): PerformancePoint[] {
  return user.dailySubmissions
    .filter((submission) => submission.status === "COMPLETED")
    .map((submission) => {
      const pushupSets = deserializeSets(submission.pushupSets);
      const situpSets = deserializeSets(submission.situpSets);
      const totals = getSubmissionTotals(submission);

      return {
        challengeDate: submission.challengeDate,
        pushups: totals.effectivePushupTotal,
        situps: totals.effectiveSitupTotal,
        pushupSet1: pushupSets[0] ?? 0,
        pushupSet2: pushupSets[1] ?? 0,
        situpSet1: situpSets[0] ?? 0,
        situpSet2: situpSets[1] ?? 0,
        target: getRequiredReps(submission.challengeDate),
      };
    })
    .slice(-24);
}

async function buildParticipantRows(
  currentUser: CurrentUser,
  locale: Locale,
  labels: DashboardLabels,
  currentOverview: ReturnType<typeof getChallengeOverview>,
): Promise<ParticipantRow[]> {
  const participants = await prisma.user.findMany({
    where: {
      registrationStatus: RegistrationStatus.APPROVED,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isLightParticipant: true,
      isStudentDiscount: true,
      reviewCreditCents: true,
      challengeEnrollment: {
        select: {
          joinedChallengeDate: true,
        },
      },
      dailySubmissions: {
        select: {
          challengeDate: true,
          status: true,
          reviewStatus: true,
          pushupSets: true,
          situpSets: true,
          verifiedPushupTotal: true,
          verifiedSitupTotal: true,
        },
        orderBy: {
          challengeDate: "asc",
        },
      },
    },
    orderBy: [{ isLightParticipant: "asc" }, { createdAt: "asc" }],
  });

  return participants.map((participant) => {
    const participantRecords = participant.dailySubmissions.map((submission) => {
      const totals = getSubmissionTotals(submission);

      return {
        challengeDate: submission.challengeDate,
        status: submission.status,
        pushupTotal: totals.effectivePushupTotal,
        situpTotal: totals.effectiveSitupTotal,
      };
    });

    const participantOverview = getChallengeOverview({
      joinedChallengeDate:
        participant.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
      records: participantRecords,
      hasStudentDiscount: participant.isStudentDiscount && !participant.isLightParticipant,
      isLightParticipant: participant.isLightParticipant,
    });

    const todayStatus = participantOverview.days.find(
      (day) => day.challengeDate === currentOverview.currentDate,
    );
    const yesterdayStatus = currentOverview.previousDate
      ? participantOverview.days.find((day) => day.challengeDate === currentOverview.previousDate)
      : null;
    const pendingReviewCount = participant.isLightParticipant
      ? 0
      : participant.dailySubmissions.filter((submission) =>
          ["PENDING", "ESCALATED", "REVISION_REQUESTED"].includes(submission.reviewStatus),
        ).length;
    const effectiveDebtCents = participant.isLightParticipant
      ? 0
      : Math.max(
          0,
          participantOverview.outstandingDebtCents - (participant.reviewCreditCents ?? 0),
        );
    const totalPushups = participant.dailySubmissions
      .filter((submission) => submission.status === "COMPLETED")
      .reduce((sum, submission) => sum + getSubmissionTotals(submission).effectivePushupTotal, 0);
    const totalSitups = participant.dailySubmissions
      .filter((submission) => submission.status === "COMPLETED")
      .reduce((sum, submission) => sum + getSubmissionTotals(submission).effectiveSitupTotal, 0);

    return {
      id: participant.id,
      name: participant.name || participant.email,
      isSelf: participant.id === currentUser.id,
      modeLabel: participant.isLightParticipant
        ? labels.participantModeLabels.light
        : labels.participantModeLabels.full,
      todayStatus: todayStatus?.status ?? "upcoming",
      yesterdayStatus: yesterdayStatus?.status ?? "upcoming",
      todayLabel: getDayStatusLabel(
        todayStatus?.status ?? "upcoming",
        labels.statusLabels,
      ),
      yesterdayLabel: getDayStatusLabel(
        yesterdayStatus?.status ?? "upcoming",
        labels.statusLabels,
      ),
      totalPushups,
      totalSitups,
      qualificationUploads: participantOverview.qualificationUploads,
      qualificationRequiredUploads: participantOverview.qualificationRequiredUploads,
      qualificationLabel: `${participantOverview.qualificationUploads}/${participantOverview.qualificationRequiredUploads}`,
      documentedDays: participantOverview.documentedDays,
      pendingReviewCount,
      debtLabel: participant.isLightParticipant
        ? null
        : formatCurrencyFromCents(effectiveDebtCents),
      reviewLabel: participant.isLightParticipant
        ? labels.participantReview.off
        : pendingReviewCount > 0
          ? `${pendingReviewCount} ${labels.participantReview.pendingSuffix}`
          : labels.participantReview.clear,
    };
  }).sort((left, right) => {
    if (left.isSelf !== right.isSelf) {
      return left.isSelf ? -1 : 1;
    }

    return left.name.localeCompare(right.name, locale === "en" ? "en" : "de");
  });
}

async function buildPrimaryReviewItems(
  currentUser: CurrentUser,
  locale: Locale,
  labels: DashboardLabels,
): Promise<PrimaryReviewItem[]> {
  const submissions = await prisma.dailySubmission.findMany({
    where: {
      userId: { not: currentUser.id },
      status: "COMPLETED",
      reviewStatus: {
        in: ["PENDING", "REVISION_REQUESTED"],
      },
      user: {
        registrationStatus: RegistrationStatus.APPROVED,
        isLightParticipant: false,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      videos: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      workoutReviews: {
        include: {
          reviewer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: [{ challengeDate: "asc" }, { submittedAt: "asc" }],
  });

  return submissions
    .filter(
      (submission) =>
        !submission.workoutReviews.some(
          (review) =>
            review.stage === WorkoutReviewStage.PRIMARY &&
            review.reviewerUserId === currentUser.id,
        ),
    )
    .map((submission) => {
      const totals = getSubmissionTotals(submission);
      const latestPrimary = [...submission.workoutReviews]
        .reverse()
        .find((review) => review.stage === WorkoutReviewStage.PRIMARY);

      return {
        id: submission.id,
        challengeDate: submission.challengeDate,
        dateLabel: formatChallengeDate(locale, submission.challengeDate),
        userLabel: submission.user.name || submission.user.email,
        targetReps: getRequiredReps(submission.challengeDate),
        claimedPushups: totals.pushupTotal,
        claimedSitups: totals.situpTotal,
        statusLabel: formatReviewStatus(
          submission.reviewStatus,
          labels.reviewStatusLabels,
        ),
        workoutNote: submission.notes,
        priorNote:
          latestPrimary?.notes && submission.reviewStatus === "REVISION_REQUESTED"
            ? `${latestPrimary.reviewer.name || latestPrimary.reviewer.email}: ${latestPrimary.notes}`
            : null,
        videos: submission.videos.map((video) => ({
          id: video.id,
          label: video.originalName,
        })),
      };
    });
}

async function buildEscalationReviewItems(
  currentUser: CurrentUser,
  locale: Locale,
): Promise<EscalationReviewItem[]> {
  const submissions = await prisma.dailySubmission.findMany({
    where: {
      userId: { not: currentUser.id },
      status: "COMPLETED",
      reviewStatus: "ESCALATED",
      user: {
        registrationStatus: RegistrationStatus.APPROVED,
        isLightParticipant: false,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      videos: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      workoutReviews: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: [{ challengeDate: "asc" }, { submittedAt: "asc" }],
  });

  return submissions
    .map((submission) => {
      const primaryReview = [...submission.workoutReviews]
        .reverse()
        .find((review) => review.stage === WorkoutReviewStage.PRIMARY);

      if (!primaryReview || primaryReview.reviewerUserId === currentUser.id) {
        return null;
      }

      const existingArbitration = submission.workoutReviews.find(
        (review) =>
          review.stage === WorkoutReviewStage.ARBITRATION &&
          review.basedOnReviewId === primaryReview.id,
      );

      if (existingArbitration) {
        return null;
      }

      const totals = getSubmissionTotals(submission);

      return {
        id: submission.id,
        challengeDate: submission.challengeDate,
        dateLabel: formatChallengeDate(locale, submission.challengeDate),
        userLabel: submission.user.name || submission.user.email,
        targetReps: getRequiredReps(submission.challengeDate),
        claimedPushups: totals.pushupTotal,
        claimedSitups: totals.situpTotal,
        reviewedPushups: primaryReview.countedPushups,
        reviewedSitups: primaryReview.countedSitups,
        reviewComment: primaryReview.notes,
        reviewerLabel: primaryReview.reviewer.name || primaryReview.reviewer.email,
        workoutNote: submission.notes,
        videos: submission.videos.map((video) => ({
          id: video.id,
          label: video.originalName,
        })),
      };
    })
    .filter((item): item is EscalationReviewItem => item != null);
}

async function buildSicknessReviewItems(
  currentUser: CurrentUser,
  locale: Locale,
): Promise<SicknessReviewItem[]> {
  const verifications = await prisma.sicknessVerification.findMany({
    where: {
      reviewerUserId: currentUser.id,
      decision: RegistrationApprovalDecision.PENDING,
      dailySubmission: {
        status: "SICK_PENDING",
        user: {
          registrationStatus: RegistrationStatus.APPROVED,
          isLightParticipant: false,
          id: { not: currentUser.id },
        },
      },
    },
    include: {
      dailySubmission: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return verifications.map((verification) => ({
    id: verification.id,
    challengeDate: verification.dailySubmission.challengeDate,
    dateLabel: formatChallengeDate(locale, verification.dailySubmission.challengeDate),
    userLabel: verification.dailySubmission.user.name || verification.dailySubmission.user.email,
    notes: verification.dailySubmission.notes,
  }));
}

function buildMeasurementPoints(user: CurrentUser): MeasurementPoint[] {
  return user.measurements.slice(-18).map((entry) => ({
    measuredAt: formatMeasurementDate(entry.measuredAt),
    weightKg: entry.weightKg,
    waistCircumferenceCm: entry.waistCircumferenceCm,
    restingPulseBpm: entry.restingPulseBpm,
  }));
}

function buildOverviewSummary(
  user: CurrentUser,
  overview: ReturnType<typeof getChallengeOverview>,
  latestWeightKg: number | null,
  latestWaistCm: number | null,
  locale: Locale,
): OverviewSummary {
  const reviewCreditCents = user.reviewCreditCents ?? 0;
  const effectiveOutstandingDebtCents = Math.max(
    0,
    overview.outstandingDebtCents - reviewCreditCents,
  );
  const availableReviewBudgetCents = Math.max(
    0,
    reviewCreditCents - overview.outstandingDebtCents,
  );
  const currentDayIndex = Math.max(0, getChallengeDayIndex(overview.currentDate));
  const qualificationDay = Math.min(CHALLENGE_FREE_DAYS, currentDayIndex + 1);
  const isQualificationPhase = currentDayIndex < CHALLENGE_FREE_DAYS;

  return {
    dayNumber: overview.days.at(-1)?.dayIndex != null ? overview.days.at(-1)!.dayIndex + 1 : 0,
    currentTarget: overview.currentTarget,
    isQualificationPhase,
    qualificationDay,
    qualificationWindowDays: CHALLENGE_FREE_DAYS,
    qualificationUploads: overview.qualificationUploads,
    qualificationRequiredUploads: overview.qualificationRequiredUploads,
    outstandingDebtLabel: formatCurrencyFromCents(effectiveOutstandingDebtCents),
    outstandingDebtCents: effectiveOutstandingDebtCents,
    reviewBudgetLabel: formatCurrencyFromCents(availableReviewBudgetCents),
    reviewBudgetCents: availableReviewBudgetCents,
    hasStudentDiscount: user.isStudentDiscount && !user.isLightParticipant,
    isLightParticipant: user.isLightParticipant,
    existingSlackDays: overview.days.filter(
      (day) => day.status === "slack" || day.status === "partial",
    ).length,
    monthJokersRemaining: overview.monthJokersRemaining,
    documentedDays: overview.documentedDays,
    dailyMessage: getDailyMessage(
      {
        currentDate: overview.currentDate,
        currentTarget: overview.currentTarget,
        name: user.name ?? null,
        birthDate: user.birthDate ?? null,
        heightCm: user.heightCm ?? null,
        latestWeightKg,
        latestWaistCm,
        outstandingDebtCents: overview.outstandingDebtCents,
        documentedDays: overview.documentedDays,
        motivation: user.motivation ?? null,
      },
      locale,
    ),
  };
}

function buildProfileSummary(
  user: CurrentUser,
  locale: Locale,
  latestMeasurement: CurrentUser["measurements"][number] | null,
): ProfileSummary {
  return {
    name: user.name ?? null,
    motivation: user.motivation ?? null,
    birthDateInput: formatBirthDateInput(locale, user.birthDate),
    birthDateLabel: formatBirthDate(locale, user.birthDate),
    heightInput: formatHeightInput(user.heightCm),
    heightLabel:
      user.heightCm != null ? `${formatDecimal(locale, user.heightCm, 0)} cm` : null,
    latestWeightKg: latestMeasurement?.weightKg ?? null,
    weightLabel:
      latestMeasurement?.weightKg != null
        ? `${formatDecimal(locale, latestMeasurement.weightKg)} kg`
        : null,
    waistLabel:
      latestMeasurement?.waistCircumferenceCm != null
        ? `${formatDecimal(locale, latestMeasurement.waistCircumferenceCm)} cm`
        : null,
  };
}

export async function getDashboardPageData(params: {
  locale: Locale;
  user: CurrentUser;
  labels: DashboardLabels;
}): Promise<DashboardPageData> {
  const { locale, user, labels } = params;
  const canReview = !user.isLightParticipant;
  const challengeRecords = buildChallengeRecords(user);
  const challengeOverview = getChallengeOverview({
    joinedChallengeDate: user.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
    records: challengeRecords,
    hasStudentDiscount: user.isStudentDiscount && !user.isLightParticipant,
    isLightParticipant: user.isLightParticipant,
  });

  const latestMeasurement = user.measurements.at(-1) ?? null;
  const latestWeightKg = latestMeasurement?.weightKg ?? null;
  const latestWaistCm = latestMeasurement?.waistCircumferenceCm ?? null;

  const [pendingApprovals, activeInvites, participantRows, primaryReviewItems, escalationReviewItems, sicknessReviewItems] =
    await Promise.all([
      canReview
        ? prisma.registrationApproval.findMany({
            where: {
              reviewerUserId: user.id,
              decision: RegistrationApprovalDecision.PENDING,
              applicant: {
                registrationStatus: RegistrationStatus.PENDING,
              },
            },
            include: {
              applicant: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  motivation: true,
                  createdAt: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          })
        : Promise.resolve([]),
      canReview
        ? prisma.appInvite.findMany({
            where: {
              invitedByUserId: user.id,
              acceptedAt: null,
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 6,
          })
        : Promise.resolve([]),
      canReview
        ? buildParticipantRows(user, locale, labels, challengeOverview)
        : Promise.resolve([]),
      canReview ? buildPrimaryReviewItems(user, locale, labels) : Promise.resolve([]),
      canReview ? buildEscalationReviewItems(user, locale) : Promise.resolve([]),
      canReview ? buildSicknessReviewItems(user, locale) : Promise.resolve([]),
    ]);

  return {
    activeInvites: activeInvites.map((invite) => ({
      id: invite.id,
      email: invite.email,
    })),
    canReview,
    escalationReviewItems,
    measurementPoints: buildMeasurementPoints(user),
    openDays: buildOpenDays(user, locale, labels, challengeOverview),
    overview: buildOverviewSummary(
      user,
      challengeOverview,
      latestWeightKg,
      latestWaistCm,
      locale,
    ),
    participantRows,
    pendingApprovals,
    performancePoints: buildPerformancePoints(user),
    primaryReviewItems,
    profile: buildProfileSummary(user, locale, latestMeasurement),
    sicknessReviewItems,
    timelineEntries: buildTimelineEntries(user, locale, labels, challengeOverview),
  };
}
