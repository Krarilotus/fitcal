import { redirect } from "next/navigation";
import { RegistrationApprovalDecision, RegistrationStatus } from "@prisma/client";
import { DashboardTabs } from "@/components/fitcal/dashboard-tabs";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { Button } from "@/components/ui/button";
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
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatMeasurementDate } from "@/lib/measurements";
import { getDailyMessage } from "@/lib/special-day";
import { deserializeSets } from "@/lib/submission";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Erledigt";
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
    user.registrationStatus === RegistrationStatus.APPROVED && canReview
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
    user.registrationStatus === RegistrationStatus.APPROVED && canReview
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
    const pushupTotal = deserializeSets(submission.pushupSets).reduce(
      (sum, value) => sum + value,
      0,
    );
    const situpTotal = deserializeSets(submission.situpSets).reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      challengeDate: submission.challengeDate,
      status: submission.status,
      pushupTotal,
      situpTotal,
    };
  });

  const overview = getChallengeOverview({
    joinedChallengeDate: user.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
    records: challengeRecords,
    hasStudentDiscount: user.isStudentDiscount,
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
    const pushupTotal = pushupSets.reduce((sum, value) => sum + value, 0);
    const situpTotal = situpSets.reduce((sum, value) => sum + value, 0);

    return {
      challengeDate: day.challengeDate,
      dateLabel: formatChallengeDate(day.challengeDate),
      repsTarget: day.repsTarget,
      statusLabel: getDayStatusLabel(day.status),
      debtLabel: day.debtCents > 0 ? formatCurrencyFromCents(day.debtCents) : null,
      pushupTotal: submission ? pushupTotal : null,
      situpTotal: submission ? situpTotal : null,
      pushupSet1: submission ? (pushupSets[0] ?? 0) : null,
      pushupSet2: submission ? (pushupSets[1] ?? 0) : null,
      situpSet1: submission ? (situpSets[0] ?? 0) : null,
      situpSet2: submission ? (situpSets[1] ?? 0) : null,
      pushupOverTarget: submission ? Math.max(0, pushupTotal - day.repsTarget) : null,
      situpOverTarget: submission ? Math.max(0, situpTotal - day.repsTarget) : null,
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

      return {
        challengeDate: submission.challengeDate,
        pushups: pushupSets.reduce((sum, value) => sum + value, 0),
        situps: situpSets.reduce((sum, value) => sum + value, 0),
        pushupSet1: pushupSets[0] ?? 0,
        pushupSet2: pushupSets[1] ?? 0,
        situpSet1: situpSets[0] ?? 0,
        situpSet2: situpSets[1] ?? 0,
        target: getRequiredReps(submission.challengeDate),
      };
    })
    .slice(-24);

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
    latestWeightKg: latestMeasurement?.weightKg ?? null,
    latestWaistCm: latestMeasurement?.waistCircumferenceCm ?? null,
    outstandingDebtCents: overview.outstandingDebtCents,
    documentedDays: overview.documentedDays,
    motivation: user.motivation ?? null,
  });

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
              {CHALLENGE_START_DATE} – {CHALLENGE_END_DATE}
            </p>
          </div>

          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost">Logout</Button>
          </form>
        </header>

        <FlashMessage error={error} success={success} />

        {canReview ? (
          <section className="border-b border-[var(--fc-border)] pb-5">
          <h2 className="fc-heading text-lg mb-3">Einladen</h2>

          <form action="/api/invitations" className="flex flex-col gap-3 sm:flex-row" method="post">
            <label className="fc-input-group flex-1">
              <span className="fc-input-label">E-Mail der Person</span>
              <input className="fc-input" name="email" required type="email" placeholder="name@example.com" />
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
            <p className="text-sm font-medium mb-2">
              {pendingApprovals.length} Freigabe{pendingApprovals.length > 1 ? "n" : ""} offen
            </p>

            <div className="space-y-2">
              {pendingApprovals.map((approval) => (
                <div
                  className="flex flex-col gap-2 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  key={approval.id}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {approval.applicant.name || approval.applicant.email}
                    </p>
                    {approval.applicant.motivation ? (
                      <p className="text-sm text-[var(--fc-muted)]">
                        „{approval.applicant.motivation}“
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <form action="/api/registration-approvals" method="post">
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="decision" type="hidden" value="approve" />
                      <Button size="sm" type="submit">Annehmen</Button>
                    </form>
                    <form action="/api/registration-approvals" method="post">
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="decision" type="hidden" value="reject" />
                      <Button size="sm" type="submit" variant="secondary">Ablehnen</Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <DashboardTabs
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
            hasStudentDiscount: user.isStudentDiscount,
            isLightParticipant: user.isLightParticipant,
            monthJokersRemaining: overview.monthJokersRemaining,
            documentedDays: overview.documentedDays,
            dailyMessage,
          }}
          performancePoints={performancePoints}
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
          timelineEntries={timelineEntries}
        />
      </div>
    </div>
  );
}
