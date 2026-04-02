import {
  RegistrationApprovalDecision,
  RegistrationStatus,
  WorkoutReviewStage,
} from "@prisma/client";
import { redirect } from "next/navigation";
import { DashboardTabs } from "@/components/fitcal/dashboard-tabs";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CHALLENGE_END_DATE,
  CHALLENGE_FREE_DAYS,
  CHALLENGE_START_DATE,
  formatCurrencyFromCents,
  getChallengeDayIndex,
  getChallengeOverview,
  getRequiredReps,
  isFreeChallengeDay,
} from "@/lib/challenge";
import { prisma } from "@/lib/db";
import { formatMeasurementDate } from "@/lib/measurements";
import { getPreferredLocale } from "@/lib/preferences";
import { getDailyMessage } from "@/lib/special-day";
import { deserializeSets, getSubmissionTotals } from "@/lib/submission";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Erledigt";
    case "partial":
      return "Teilweise";
    case "joker":
      return "Joker";
    case "slack":
      return "Slack";
    case "free":
      return "Quali";
    case "open":
      return "Offen";
    default:
      return "Später";
  }
}

function formatReviewStatus(reviewStatus: string | null | undefined) {
  switch (reviewStatus) {
    case "PENDING":
      return "Review offen";
    case "ESCALATED":
      return "Prüf-Review offen";
    case "APPROVED":
      return "Bestätigt";
    case "REVISION_REQUESTED":
      return "Neue Prüfung angefordert";
    default:
      return null;
  }
}

function formatBirthDate(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatBirthDateInput(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatHeightInput(value: number | null | undefined) {
  if (value == null) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value).replace(",", ".");
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null) {
    return null;
  }

  return value.toFixed(digits).replace(".", ",");
}

function formatChallengeDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function getDayStatusLabel(status: string) {
  switch (status) {
    case "sickPending":
      return "Krank · offen";
    case "sick":
      return "Krank bestätigt";
    default:
      return statusLabel(status);
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();
  const locale = await getPreferredLocale();

  if (!user) {
    redirect("/login");
  }

  if (user.registrationStatus !== RegistrationStatus.APPROVED) {
    redirect("/login?error=Dein%20Account%20ist%20noch%20nicht%20freigegeben.");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;
  const canReview = !user.isLightParticipant;

  const pendingApprovals =
    canReview
      ? await prisma.registrationApproval.findMany({
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
      : [];

  const activeInvites =
    canReview
      ? await prisma.appInvite.findMany({
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
      : [];

  const challengeRecords = user.dailySubmissions.map((submission) => {
    const totals = getSubmissionTotals(submission);

    return {
      challengeDate: submission.challengeDate,
      status: submission.status,
      pushupTotal: totals.effectivePushupTotal,
      situpTotal: totals.effectiveSitupTotal,
    };
  });

  const overview = getChallengeOverview({
    joinedChallengeDate: user.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
    records: challengeRecords,
    hasStudentDiscount: user.isStudentDiscount && !user.isLightParticipant,
    isLightParticipant: user.isLightParticipant,
  });

  const reviewCreditCents = user.reviewCreditCents ?? 0;
  const effectiveOutstandingDebtCents = Math.max(
    0,
    overview.outstandingDebtCents - reviewCreditCents,
  );
  const availableReviewBudgetCents = Math.max(
    0,
    reviewCreditCents - overview.outstandingDebtCents,
  );

  const openDays = overview.days
    .filter((day) => day.canUpload)
    .map((day) => ({
      challengeDate: day.challengeDate,
      dateLabel: formatChallengeDate(day.challengeDate),
      targetReps: getRequiredReps(day.challengeDate),
      isCurrentDay: day.isCurrentDay,
      isQualificationDay: isFreeChallengeDay(day.challengeDate),
      canUseJoker: day.canUseJoker,
    }));

  const timelineEntries = overview.days.slice(-12).reverse().map((day) => {
    const submission = user.dailySubmissions.find(
      (entry) => entry.challengeDate === day.challengeDate,
    );
    const pushupSets = submission ? deserializeSets(submission.pushupSets) : [];
    const situpSets = submission ? deserializeSets(submission.situpSets) : [];
    const totals = submission ? getSubmissionTotals(submission) : null;

    return {
      challengeDate: day.challengeDate,
      dateLabel: formatChallengeDate(day.challengeDate),
      repsTarget: day.repsTarget,
      statusLabel: getDayStatusLabel(day.status),
      debtLabel: day.debtCents > 0 ? formatCurrencyFromCents(day.debtCents) : null,
      pushupTotal: totals?.pushupTotal ?? null,
      situpTotal: totals?.situpTotal ?? null,
      verifiedPushupTotal:
        submission?.verifiedPushupTotal != null ? submission.verifiedPushupTotal : null,
      verifiedSitupTotal:
        submission?.verifiedSitupTotal != null ? submission.verifiedSitupTotal : null,
      reviewStatusLabel: submission ? formatReviewStatus(submission.reviewStatus) : null,
      pushupSet1: submission ? (pushupSets[0] ?? 0) : null,
      pushupSet2: submission ? (pushupSets[1] ?? 0) : null,
      situpSet1: submission ? (situpSets[0] ?? 0) : null,
      situpSet2: submission ? (situpSets[1] ?? 0) : null,
      pushupOverTarget: submission ? Math.max(0, totals!.pushupTotal - day.repsTarget) : null,
      situpOverTarget: submission ? Math.max(0, totals!.situpTotal - day.repsTarget) : null,
      videos:
        submission?.videos.map((video) => ({
          id: video.id,
          originalName: video.originalName,
          sizeLabel: formatFileSize(video.sizeBytes),
        })) ?? [],
    };
  });

  const performancePoints = user.dailySubmissions
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

  const participantRows = canReview
    ? (
        await prisma.user.findMany({
          where: {
            id: {
              not: user.id,
            },
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
          orderBy: [
            {
              isLightParticipant: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        })
      ).map((participant) => {
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
          (day) => day.challengeDate === overview.currentDate,
        );
        const yesterdayStatus = overview.previousDate
          ? participantOverview.days.find((day) => day.challengeDate === overview.previousDate)
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

        return {
          id: participant.id,
          name: participant.name || participant.email,
          modeLabel: participant.isLightParticipant ? "Light" : "Voll",
          todayLabel: getDayStatusLabel(todayStatus?.status ?? "upcoming"),
          yesterdayLabel: getDayStatusLabel(yesterdayStatus?.status ?? "upcoming"),
          qualificationLabel: `${participantOverview.qualificationUploads}/${participantOverview.qualificationRequiredUploads}`,
          documentedDays: participantOverview.documentedDays,
          debtLabel: participant.isLightParticipant
            ? null
            : formatCurrencyFromCents(effectiveDebtCents),
          reviewLabel: participant.isLightParticipant
            ? "—"
            : pendingReviewCount > 0
              ? `${pendingReviewCount} offen`
              : "Klar",
        };
      })
    : [];

  const primaryReviewItems = canReview
    ? (
        await prisma.dailySubmission.findMany({
          where: {
            userId: {
              not: user.id,
            },
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
          orderBy: [
            {
              challengeDate: "asc",
            },
            {
              submittedAt: "asc",
            },
          ],
        })
      )
        .filter(
          (submission) =>
            !submission.workoutReviews.some(
              (review) =>
                review.stage === WorkoutReviewStage.PRIMARY &&
                review.reviewerUserId === user.id,
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
            dateLabel: formatChallengeDate(submission.challengeDate),
            userLabel: submission.user.name || submission.user.email,
            targetReps: getRequiredReps(submission.challengeDate),
            claimedPushups: totals.pushupTotal,
            claimedSitups: totals.situpTotal,
            statusLabel: formatReviewStatus(submission.reviewStatus),
            priorNote:
              latestPrimary?.notes && submission.reviewStatus === "REVISION_REQUESTED"
                ? `${latestPrimary.reviewer.name || latestPrimary.reviewer.email}: ${latestPrimary.notes}`
                : null,
            videos: submission.videos.map((video) => ({
              id: video.id,
              label: video.originalName,
            })),
          };
        })
    : [];

  const escalationReviewItems = canReview
    ? (
        await prisma.dailySubmission.findMany({
          where: {
            userId: {
              not: user.id,
            },
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
          orderBy: [
            {
              challengeDate: "asc",
            },
            {
              submittedAt: "asc",
            },
          ],
        })
      )
        .map((submission) => {
          const primaryReview = [...submission.workoutReviews]
            .reverse()
            .find((review) => review.stage === WorkoutReviewStage.PRIMARY);

          if (!primaryReview || primaryReview.reviewerUserId === user.id) {
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
            dateLabel: formatChallengeDate(submission.challengeDate),
            userLabel: submission.user.name || submission.user.email,
            targetReps: getRequiredReps(submission.challengeDate),
            claimedPushups: totals.pushupTotal,
            claimedSitups: totals.situpTotal,
            reviewedPushups: primaryReview.countedPushups,
            reviewedSitups: primaryReview.countedSitups,
            reviewComment: primaryReview.notes,
            reviewerLabel: primaryReview.reviewer.name || primaryReview.reviewer.email,
            videos: submission.videos.map((video) => ({
              id: video.id,
              label: video.originalName,
            })),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null)
    : [];

  const sicknessReviewItems = canReview
    ? (
        await prisma.sicknessVerification.findMany({
          where: {
            reviewerUserId: user.id,
            decision: RegistrationApprovalDecision.PENDING,
            dailySubmission: {
              status: "SICK_PENDING",
              user: {
                registrationStatus: RegistrationStatus.APPROVED,
                isLightParticipant: false,
                id: {
                  not: user.id,
                },
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
        })
      ).map((verification) => ({
        id: verification.id,
        challengeDate: verification.dailySubmission.challengeDate,
        dateLabel: formatChallengeDate(verification.dailySubmission.challengeDate),
        userLabel:
          verification.dailySubmission.user.name || verification.dailySubmission.user.email,
        notes: verification.dailySubmission.notes,
      }))
    : [];

  const measurementPoints = user.measurements.slice(-18).map((entry) => ({
    measuredAt: formatMeasurementDate(entry.measuredAt),
    weightKg: entry.weightKg,
    waistCircumferenceCm: entry.waistCircumferenceCm,
    restingPulseBpm: entry.restingPulseBpm,
  }));

  const latestMeasurement = user.measurements.at(-1) ?? null;
  const birthDateLabel = formatBirthDate(user.birthDate);
  const currentDayIndex = Math.max(0, getChallengeDayIndex(overview.currentDate));
  const qualificationDay = Math.min(CHALLENGE_FREE_DAYS, currentDayIndex + 1);
  const isQualificationPhase = currentDayIndex < CHALLENGE_FREE_DAYS;

  const dailyMessage = getDailyMessage({
    currentDate: overview.currentDate,
    currentTarget: overview.currentTarget,
    name: user.name ?? null,
    birthDate: user.birthDate ?? null,
    heightCm: user.heightCm ?? null,
    latestWeightKg: latestMeasurement?.weightKg ?? null,
    latestWaistCm: latestMeasurement?.waistCircumferenceCm ?? null,
    outstandingDebtCents: overview.outstandingDebtCents,
    documentedDays: overview.documentedDays,
    motivation: user.motivation ?? null,
  }, locale);

  return (
    <div className="fc-shell min-h-screen px-4 py-5 text-[var(--fc-ink)] sm:px-6 sm:py-8">
      <div className="fc-noise pointer-events-none absolute inset-0 -z-20" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="fc-display text-[clamp(1.5rem,3vw,2.25rem)]">
              {user.name || user.email}
            </h1>
            <p className="mt-1 text-sm text-[var(--fc-muted)]">
              {CHALLENGE_START_DATE} - {CHALLENGE_END_DATE}
            </p>
          </div>

          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost">
              Logout
            </Button>
          </form>
        </header>

        <FlashMessage error={error} success={success} />

        {canReview ? (
          <section className="border-b border-[var(--fc-border)] pb-5">
            <h2 className="fc-heading mb-3 text-lg">Einladen</h2>

            <form
              action="/api/invitations"
              className="flex flex-col gap-3 sm:flex-row"
              method="post"
            >
              <label className="fc-input-group flex-1">
                <span className="fc-input-label">E-Mail der Person</span>
                <input
                  className="fc-input"
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                />
              </label>
              <div className="flex items-end">
                <Button type="submit">Einladung senden</Button>
              </div>
            </form>

            {activeInvites.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeInvites.map((invite) => (
                  <span className="fc-chip fc-chip-muted" key={invite.id}>
                    {invite.email}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {canReview && pendingApprovals.length > 0 ? (
          <section className="border-b border-[var(--fc-border)] pb-5">
            <p className="mb-2 text-sm font-medium">
              {pendingApprovals.length} Freigabe
              {pendingApprovals.length > 1 ? "n" : ""} offen
            </p>

            <div className="space-y-2">
              {pendingApprovals.map((approval) => (
                <div
                  className="flex flex-col gap-2 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={approval.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {approval.applicant.name || approval.applicant.email}
                    </p>
                    {approval.applicant.motivation ? (
                      <p className="text-sm text-[var(--fc-muted)]">
                        &quot;{approval.applicant.motivation}&quot;
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <form action="/api/registration-approvals" method="post">
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="decision" type="hidden" value="approve" />
                      <Button size="sm" type="submit">
                        Annehmen
                      </Button>
                    </form>
                    <form action="/api/registration-approvals" method="post">
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="decision" type="hidden" value="reject" />
                      <Button size="sm" type="submit" variant="secondary">
                        Ablehnen
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <DashboardTabs
          escalationReviewItems={escalationReviewItems}
          measurementPoints={measurementPoints}
          openDays={openDays}
          overview={{
            dayNumber:
              overview.days.at(-1)?.dayIndex != null ? overview.days.at(-1)!.dayIndex + 1 : 0,
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
            existingSlackDays: overview.days.filter((day) =>
              day.status === "slack" || day.status === "partial"
            ).length,
            monthJokersRemaining: overview.monthJokersRemaining,
            documentedDays: overview.documentedDays,
            dailyMessage,
          }}
          participantRows={participantRows}
          performancePoints={performancePoints}
          primaryReviewItems={primaryReviewItems}
          profile={{
            name: user.name ?? null,
            motivation: user.motivation ?? null,
            birthDateInput: formatBirthDateInput(user.birthDate),
            birthDateLabel,
            heightInput: formatHeightInput(user.heightCm),
            heightLabel: user.heightCm != null ? `${formatNumber(user.heightCm, 0)} cm` : null,
            latestWeightKg: latestMeasurement?.weightKg ?? null,
            weightLabel:
              latestMeasurement?.weightKg != null
                ? `${formatNumber(latestMeasurement.weightKg)} kg`
                : null,
            waistLabel:
              latestMeasurement?.waistCircumferenceCm != null
                ? `${formatNumber(latestMeasurement.waistCircumferenceCm)} cm`
                : null,
          }}
          sicknessReviewItems={sicknessReviewItems}
          timelineEntries={timelineEntries}
        />
      </div>
    </div>
  );
}
