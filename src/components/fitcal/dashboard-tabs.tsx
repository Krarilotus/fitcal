"use client";

import { type ChangeEvent, type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import type { AppDictionary } from "@/i18n";
import {
  formatDashboardCurrency,
  formatDateKeyForInput,
  parseDateInputToDateKey,
  parseNumberInput,
} from "@/components/fitcal/dashboard-formatters";
import { MeasurementChart } from "@/components/fitcal/measurement-chart";
import { PerformanceChart } from "@/components/fitcal/performance-chart";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateTextInput } from "@/components/ui/date-text-input";
import type { Locale } from "@/lib/preferences";
import {
  CHALLENGE_END_DATE,
  CHALLENGE_START_DATE,
  MAX_VIDEO_FILES_PER_DAY,
  MAX_VIDEO_SIZE_BYTES,
  getChallengeDayIndex,
  getRequiredReps,
  isWithinChallenge,
} from "@/lib/challenge";

type DashboardLabels = AppDictionary["dashboard"];
type TabKey = "overview" | "uploads" | "timeline" | "metastats" | "review" | "regeln" | "rechner";
type ReviewSubtabKey = "progress" | "pending";
type SelectedUploadVideo = {
  id: string;
  originalName: string;
  displayName: string;
  sizeLabel: string;
};

type SubmissionResponsePayload = {
  ok: boolean;
  redirectUrl?: string;
  error?: string;
  errorCode?: string;
};

function formatCurrency(locale: Locale, cents: number) {
  return formatDashboardCurrency(locale, cents);
}

function replaceTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function formatLocalizedNumber(locale: Locale, value: number, digits = 1) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatFileSizeLabel(locale: Locale, sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024 * 1024) {
    return `${formatLocalizedNumber(locale, sizeBytes / (1024 * 1024 * 1024), 2)} GB`;
  }

  return `${formatLocalizedNumber(locale, sizeBytes / (1024 * 1024), 1)} MB`;
}

function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="fc-heading text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

function StatBox({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="fc-stat">
      <span className="fc-stat-label">{label}</span>
      <span className={`fc-stat-value ${valueClassName ?? ""}`.trim()}>{value}</span>
    </div>
  );
}

function isCompletedLikeStatus(status: ParticipantRow["todayStatus"]) {
  return ["completed", "partial", "joker", "sick"].includes(status);
}

async function submitTrackedUpload(
  form: HTMLFormElement,
  setUploadingDays: Dispatch<SetStateAction<Record<string, boolean>>>,
  setUploadErrors: Dispatch<SetStateAction<Record<string, string | null>>>,
  labels: DashboardLabels["uploads"],
  isLightParticipant: boolean,
) {
  const formData = new FormData(form);
  const requestStartedAt = Date.now();
  const challengeDateValue = formData.get("challengeDate");
  const challengeDate =
    typeof challengeDateValue === "string" ? challengeDateValue : "unknown";
  const files = formData
    .getAll("videos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!isLightParticipant) {
    if (files.length < 1 || files.length > MAX_VIDEO_FILES_PER_DAY) {
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: labels.uploadTooMany,
      }));
      return;
    }

    if (files.some((file) => file.size > MAX_VIDEO_SIZE_BYTES)) {
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: labels.uploadTooLarge,
      }));
      return;
    }
  }

  setUploadingDays((current) => ({
    ...current,
    [challengeDate]: true,
  }));
  setUploadErrors((current) => ({
    ...current,
    [challengeDate]: null,
  }));

  try {
    const response = await fetch("/api/submissions", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "x-fitcal-response-format": "json",
      },
    });

    const payload = (await response.json().catch(() => null)) as SubmissionResponsePayload | null;

    if (response.ok && payload?.ok && payload.redirectUrl) {
      window.location.assign(payload.redirectUrl);
      return;
    }

    if (!response.ok) {
      const confirmedRedirectUrl = await confirmRecentSubmission(
        challengeDate,
        requestStartedAt,
      );

      if (confirmedRedirectUrl) {
        window.location.assign(confirmedRedirectUrl);
        return;
      }

      const errorMessage =
        response.status === 413 || payload?.errorCode === "too_large"
          ? labels.uploadTooLargeRequest
          : payload?.error || payload?.errorCode === "submission_failed"
            ? labels.uploadUnexpected
          : labels.uploadUnexpected;

      setUploadingDays((current) => ({
        ...current,
        [challengeDate]: false,
      }));
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: errorMessage,
      }));
      return;
    }

    const confirmedRedirectUrl = await confirmRecentSubmission(
      challengeDate,
      requestStartedAt,
    );

    if (confirmedRedirectUrl) {
      window.location.assign(confirmedRedirectUrl);
      return;
    }

    setUploadingDays((current) => ({
      ...current,
      [challengeDate]: false,
    }));
    setUploadErrors((current) => ({
      ...current,
      [challengeDate]: labels.uploadUnexpected,
    }));
  } catch {
    const confirmedRedirectUrl = await confirmRecentSubmission(
      challengeDate,
      requestStartedAt,
    );

    if (confirmedRedirectUrl) {
      window.location.assign(confirmedRedirectUrl);
      return;
    }

    setUploadingDays((current) => ({
      ...current,
      [challengeDate]: false,
    }));
    setUploadErrors((current) => ({
      ...current,
      [challengeDate]: labels.uploadUnexpected,
    }));
  }
}

async function confirmRecentSubmission(challengeDate: string, requestStartedAt: number) {
  try {
    const response = await fetch(
      `/api/submissions/status?challengeDate=${encodeURIComponent(challengeDate)}&since=${requestStartedAt}`,
      {
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      recentlySaved?: boolean;
      redirectUrl?: string;
    };

    if (!payload.ok || !payload.recentlySaved || !payload.redirectUrl) {
      return null;
    }

    return payload.redirectUrl;
  } catch {
    return null;
  }
}

function handleVideoReplaceSelection(event: ChangeEvent<HTMLInputElement>) {
  if (event.currentTarget.files?.length) {
    event.currentTarget.form?.requestSubmit();
  }
}

function buildUploadVideoId(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

export function DashboardTabs({
  commonLabels,
  escalationReviewItems,
  labels,
  locale,
  measurementPoints,
  openDays,
  overview,
  participantRows,
  performancePoints,
  primaryReviewItems,
  profile,
  sicknessReviewItems,
  timelineEntries,
}: {
  commonLabels: AppDictionary["common"];
  escalationReviewItems: EscalationReviewItem[];
  labels: DashboardLabels;
  locale: Locale;
  measurementPoints: MeasurementPoint[];
  openDays: OpenDay[];
  overview: OverviewSummary;
  participantRows: ParticipantRow[];
  performancePoints: PerformancePoint[];
  primaryReviewItems: PrimaryReviewItem[];
  profile: ProfileSummary;
  sicknessReviewItems: SicknessReviewItem[];
  timelineEntries: TimelineEntry[];
}) {
  const baseTabs = useMemo(
    () =>
      [
        { key: "overview", label: labels.tabs.overview },
        { key: "uploads", label: labels.tabs.uploads },
        { key: "timeline", label: labels.tabs.timeline },
        { key: "metastats", label: labels.tabs.metastats },
        { key: "regeln", label: labels.tabs.rules },
        { key: "rechner", label: labels.tabs.calculator },
      ] as const,
    [
      labels.tabs.calculator,
      labels.tabs.metastats,
      labels.tabs.overview,
      labels.tabs.rules,
      labels.tabs.timeline,
      labels.tabs.uploads,
    ],
  );

  const tabs = useMemo(
    () =>
      overview.isLightParticipant
        ? baseTabs
        : ([...baseTabs.slice(0, 4), { key: "review", label: labels.tabs.review }, ...baseTabs.slice(4)] as const),
    [baseTabs, labels.tabs.review, overview.isLightParticipant],
  );

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [reviewSubtab, setReviewSubtab] = useState<ReviewSubtabKey>("progress");
  const hasStudentPricing = overview.hasStudentDiscount && !overview.isLightParticipant;
  const slackBaseCents = hasStudentPricing ? 500 : 1000;
  const slackIncrementCents = hasStudentPricing ? 100 : 200;
  const rules = overview.isLightParticipant ? labels.rules.lightRules : hasStudentPricing ? labels.rules.studentRules : labels.rules.fullRules;
  const [slackDaysInput, setSlackDaysInput] = useState("1");
  const [debtInput, setDebtInput] = useState((overview.outstandingDebtCents / 100).toFixed(2));
  const [pushupInput, setPushupInput] = useState(String(overview.currentTarget));
  const [situpInput, setSitupInput] = useState(String(overview.currentTarget));
  const [weightInput, setWeightInput] = useState(profile.latestWeightKg != null ? String(profile.latestWeightKg).replace(".", ",") : "75");
  const [targetDateInput, setTargetDateInput] = useState(formatDateKeyForInput(CHALLENGE_START_DATE));
  const [selectedUploadVideos, setSelectedUploadVideos] = useState<Record<string, SelectedUploadVideo[]>>({});
  const [uploadingDays, setUploadingDays] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [selectedTimelineDate, setSelectedTimelineDate] = useState(
    timelineEntries[0]?.challengeDate ?? "",
  );

  const additionalSlackDays = Math.max(0, Math.floor(parseNumberInput(slackDaysInput)));
  const totalSlackDebtCents = Array.from({ length: additionalSlackDays }, (_, index) => slackBaseCents + (overview.existingSlackDays + index) * slackIncrementCents).reduce((sum, value) => sum + value, 0);
  const nextSlackDayCostCents = slackBaseCents + overview.existingSlackDays * slackIncrementCents;
  const debtCents = Math.max(0, Math.round(parseNumberInput(debtInput) * 100));
  const pushupsForDebt = Math.ceil(debtCents / 10);
  const situpsForDebt = Math.ceil(debtCents / 5);
  const mixedPushups = Math.ceil(debtCents / 25);
  const mixedSitups = Math.max(0, Math.ceil((debtCents - mixedPushups * 10) / 5));
  const pushups = Math.max(0, Math.floor(parseNumberInput(pushupInput)));
  const situps = Math.max(0, Math.floor(parseNumberInput(situpInput)));
  const weightKg = Math.max(1, parseNumberInput(weightInput, profile.latestWeightKg ?? 75));
  const pushupCalories = pushups * 0.45 * (weightKg / 75);
  const situpCalories = situps * 0.3 * (weightKg / 75);
  const totalCalories = pushupCalories + situpCalories;
  const selectedDateKey = parseDateInputToDateKey(targetDateInput);
  const selectedDateInChallenge = selectedDateKey ? isWithinChallenge(selectedDateKey) : false;
  const selectedDateTarget = selectedDateKey && selectedDateInChallenge ? getRequiredReps(selectedDateKey) : null;
  const selectedChallengeDay = selectedDateKey && selectedDateInChallenge ? getChallengeDayIndex(selectedDateKey) + 1 : null;
  const reviewParticipants = participantRows;
  const reviewSelfRow = reviewParticipants.find((row) => row.isSelf) ?? null;
  const activeTodayCount = reviewParticipants.filter((row) => isCompletedLikeStatus(row.todayStatus)).length;
  const qualifiedCount = reviewParticipants.filter(
    (row) => row.qualificationUploads >= row.qualificationRequiredUploads,
  ).length;
  const openReviewCount = reviewParticipants.reduce(
    (sum, row) => sum + (row.isSelf ? 0 : row.pendingReviewCount),
    0,
  );
  const selectedTimelineEntry =
    timelineEntries.find((entry) => entry.challengeDate === selectedTimelineDate) ??
    timelineEntries[0] ??
    null;
  const recentTimelineEntries = timelineEntries.slice(0, 3);

  function handleUploadVideoSelection(
    challengeDate: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.currentTarget.files ?? []);
    const nextVideos = files.map((file, index) => ({
      id: buildUploadVideoId(file, index),
      originalName: file.name,
      displayName: file.name.replace(/\.[^.]+$/, ""),
      sizeLabel: formatFileSizeLabel(locale, file.size),
    }));

    let nextError: string | null = null;

    if (files.length > MAX_VIDEO_FILES_PER_DAY) {
      nextError = labels.uploads.uploadTooMany;
    } else if (files.some((file) => file.size > MAX_VIDEO_SIZE_BYTES)) {
      nextError = labels.uploads.uploadTooLarge;
    }

    setSelectedUploadVideos((current) => ({
      ...current,
      [challengeDate]: nextVideos,
    }));
    setUploadErrors((current) => ({
      ...current,
      [challengeDate]: nextError,
    }));
  }

  function handleUploadVideoRename(
    challengeDate: string,
    videoId: string,
    value: string,
  ) {
    setSelectedUploadVideos((current) => ({
      ...current,
      [challengeDate]: (current[challengeDate] ?? []).map((video) =>
        video.id === videoId ? { ...video, displayName: value } : video,
      ),
    }));
  }

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-fitcal-section]"));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveTab(visible.target.id as TabKey);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.1, 0.25, 0.5, 0.75] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <div className="grid gap-6 fc-has-bottom-nav">
      <nav className="fc-tab-bar">
        {tabs.map((tab) => (
          <a className={`fc-tab ${activeTab === tab.key ? "is-active" : ""}`} href={`#${tab.key}`} key={tab.key}>{tab.label}</a>
        ))}
      </nav>

      <section className="fc-section fc-rise" data-fitcal-section id="overview">
        <div className="fc-card-lg">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="warm">{labels.overview.dayPrefix} {overview.dayNumber}</Badge>
            {overview.isQualificationPhase ? <Badge variant="accent">{labels.overview.qualificationBadge}</Badge> : null}
            {overview.isLightParticipant ? <Badge>{labels.overview.lightBadge}</Badge> : null}
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-5">
            <div>
              <p className="text-sm text-[var(--fc-muted)]">{labels.overview.currentTarget}</p>
              <p className="fc-display fc-count-animated mt-1 text-[clamp(3.5rem,8vw,5.5rem)] text-[var(--fc-accent)]">{overview.currentTarget}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-[var(--fc-border)] pt-5 sm:grid-cols-3 lg:grid-cols-6">
            <StatBox label={overview.isQualificationPhase ? labels.overview.qualificationDay : labels.overview.qualified} value={overview.isQualificationPhase ? `${overview.qualificationDay}/${overview.qualificationWindowDays}` : `${overview.qualificationUploads}/${overview.qualificationRequiredUploads}`} />
            <StatBox label={labels.overview.uploads} value={`${overview.qualificationUploads}/${overview.qualificationRequiredUploads}`} />
            <StatBox label={overview.isLightParticipant ? labels.overview.mode : labels.overview.debt} value={overview.isLightParticipant ? labels.overview.lightBadge : overview.outstandingDebtLabel} />
            <StatBox label={overview.isLightParticipant ? labels.overview.review : labels.overview.reviewBudget} value={overview.isLightParticipant ? labels.overview.off : overview.reviewBudgetLabel} />
            <StatBox label={overview.isLightParticipant ? labels.overview.pool : labels.overview.jokersFree} value={overview.isLightParticipant ? labels.overview.off : overview.monthJokersRemaining} />
            <StatBox label={labels.overview.days} value={overview.documentedDays} />
          </div>
          {overview.dailyMessage ? <p className="fc-daily-message">{overview.dailyMessage}</p> : null}
        </div>
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="uploads">
        <SectionHeader title={labels.uploads.title} subtitle={labels.uploads.windowHint} />
        <div className="grid gap-4">
          {openDays.length > 0 ? (
            openDays.map((day) => (
              <article className="fc-card" key={day.challengeDate}>
                {(() => {
                  const isUploading = uploadingDays[day.challengeDate] === true;
                  const uploadError = uploadErrors[day.challengeDate];

                  return (
                    <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="fc-heading text-lg">{day.dateLabel}</h3>
                    <p className="mt-1 text-sm text-[var(--fc-muted)]">{day.targetReps} {labels.uploads.targetSuffix}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="fc-chip fc-chip-accent">{day.isCurrentDay ? labels.uploads.today : labels.uploads.yesterday}</span>
                    {day.isQualificationDay ? <span className="fc-chip fc-chip-warm">{labels.uploads.qualification}</span> : null}
                  </div>
                </div>
                <form
                  className="mt-5 space-y-4"
                  encType="multipart/form-data"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitTrackedUpload(
                      event.currentTarget,
                      setUploadingDays,
                      setUploadErrors,
                      labels.uploads,
                      overview.isLightParticipant,
                    );
                  }}
                >
                  <input name="challengeDate" type="hidden" value={day.challengeDate} />
                  <div className="fc-grid-2">
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.pushupSet1}</span><input className="fc-input" disabled={isUploading} min="0" name="pushupSet1" placeholder="0" type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.pushupSet2}</span><input className="fc-input" disabled={isUploading} min="0" name="pushupSet2" placeholder="0" type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.situpSet1}</span><input className="fc-input" disabled={isUploading} min="0" name="situpSet1" placeholder="0" type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.situpSet2}</span><input className="fc-input" disabled={isUploading} min="0" name="situpSet2" placeholder="0" type="number" /></label>
                  </div>
                  <p className="text-sm text-[var(--fc-muted)]">{overview.isLightParticipant ? labels.uploads.lightHint : labels.uploads.fullHint}</p>
                  <div className={`grid gap-3 ${overview.isLightParticipant ? "sm:grid-cols-1" : "sm:grid-cols-[1.1fr_0.9fr]"}`}>
                    {!overview.isLightParticipant ? (
                      <div className="space-y-3">
                        <label className="fc-input-group">
                          <span className="fc-input-label">{labels.uploads.videos}</span>
                          <input accept="video/*" className="fc-input-file" disabled={isUploading} multiple name="videos" onChange={(event) => handleUploadVideoSelection(day.challengeDate, event)} required type="file" />
                        </label>
                        <p className="text-sm text-[var(--fc-muted)]">{labels.uploads.mobileVideoHint}</p>
                        {selectedUploadVideos[day.challengeDate]?.length ? (
                          <div className="grid gap-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--fc-muted)]">{labels.uploads.videoNames}</p>
                            {selectedUploadVideos[day.challengeDate].map((video, index) => (
                              <label className="fc-input-group" key={video.id}>
                                <span className="fc-input-label">{labels.uploads.videoNameLabel.replace("{index}", String(index + 1))}</span>
                                <input className="fc-input" disabled={isUploading} maxLength={120} name={`videoDisplayName${index}`} onChange={(event) => handleUploadVideoRename(day.challengeDate, video.id, event.target.value)} placeholder={video.originalName} type="text" value={video.displayName} />
                                <span className="text-xs text-[var(--fc-muted)]">{video.sizeLabel}</span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.notes}</span><textarea className="fc-input min-h-[5.5rem]" disabled={isUploading} name="notes" /></label>
                  </div>
                  {uploadError ? <p className="text-sm font-medium text-[var(--fc-warm)]">{uploadError}</p> : null}
                  {isUploading ? <p className="text-sm text-[var(--fc-muted)]">{labels.uploads.uploadPendingHint}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={isUploading}
                      onClick={(event) => {
                        const form = event.currentTarget.form;
                        if (!form) return;
                        void submitTrackedUpload(
                          form,
                          setUploadingDays,
                          setUploadErrors,
                          labels.uploads,
                          overview.isLightParticipant,
                        );
                      }}
                      type="button"
                    >
                      {isUploading ? (overview.isLightParticipant ? labels.uploads.uploadingEntry : labels.uploads.uploadingWorkout) : (overview.isLightParticipant ? labels.uploads.saveEntry : labels.uploads.saveWorkout)}
                    </Button>
                  </div>
                </form>
                {!overview.isLightParticipant ? (
                  <>
                    <details className="mt-4 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-[var(--fc-ink)]">{labels.uploads.sicknessToggle}</summary>
                      <form action="/api/challenge/sickness" className="mt-4 space-y-4" method="post">
                        <input name="challengeDate" type="hidden" value={day.challengeDate} />
                        <label className="flex items-start gap-3 text-sm text-[var(--fc-muted)]"><input className="mt-1" name="consent" type="checkbox" /><span>{labels.uploads.sicknessConsent}</span></label>
                        <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.comment}</span><textarea className="fc-input min-h-20" name="notes" placeholder={labels.uploads.notes} /></label>
                        <Button type="submit" variant="secondary">{labels.uploads.submitSickness}</Button>
                      </form>
                    </details>
                    {day.canUseJoker ? <form action="/api/challenge/joker" className="mt-3" method="post"><input name="challengeDate" type="hidden" value={day.challengeDate} /><Button type="submit" variant="secondary">{labels.uploads.useJoker}</Button></form> : null}
                  </>
                ) : null}
                    </>
                  );
                })()}
              </article>
            ))
          ) : <div className="fc-card text-sm text-[var(--fc-muted)]">{labels.uploads.empty}</div>}
        </div>
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="timeline">
        <SectionHeader title={labels.timeline.title} />
        {selectedTimelineEntry ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {recentTimelineEntries.map((day) => (
                  <button
                    className={`fc-card text-left transition-colors ${selectedTimelineEntry.challengeDate === day.challengeDate ? "border-[var(--fc-accent)] shadow-[0_0_0_1px_var(--fc-accent)]" : ""}`}
                    key={day.challengeDate}
                    onClick={() => setSelectedTimelineDate(day.challengeDate)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{day.dateLabel}</p>
                      <span className="fc-tag">{day.statusLabel}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">
                      {labels.timeline.recentTitle}
                    </p>
                    {day.pushupTotal != null && day.situpTotal != null ? (
                      <p className="mt-1 text-sm text-[var(--fc-ink)]">
                        {day.pushupTotal} / {day.situpTotal}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--fc-muted)]">{labels.timeline.noEntry}</p>
                    )}
                  </button>
                ))}
              </div>

              <div className="fc-card">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--fc-muted)]">
                  {labels.timeline.catalogTitle}
                </p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {timelineEntries.map((day) => (
                    <button
                      className={`shrink-0 rounded-[var(--fc-radius-sm)] border px-3 py-2 text-left text-sm transition-colors ${
                        selectedTimelineEntry.challengeDate === day.challengeDate
                          ? "border-[var(--fc-accent)] bg-[var(--fc-accent-soft)] text-[var(--fc-ink)]"
                          : "border-[var(--fc-border)] bg-[var(--fc-bg-raised)] text-[var(--fc-muted)] hover:text-[var(--fc-ink)]"
                      }`}
                      key={day.challengeDate}
                      onClick={() => setSelectedTimelineDate(day.challengeDate)}
                      type="button"
                    >
                      <span className="block font-medium">{day.dateLabel}</span>
                      <span className="mt-1 block text-xs">{day.statusLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <article className="fc-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="fc-heading text-lg">{selectedTimelineEntry.dateLabel}</h3>
                    <span className="fc-tag">{selectedTimelineEntry.statusLabel}</span>
                    {selectedTimelineEntry.reviewStatusLabel ? (
                      <span className="fc-chip fc-chip-muted">{selectedTimelineEntry.reviewStatusLabel}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--fc-muted)]">
                    {labels.timeline.targetPrefix} {selectedTimelineEntry.repsTarget} {labels.timeline.perExercise}
                  </p>
                </div>
                {selectedTimelineEntry.debtLabel ? (
                  <p className="text-sm font-medium text-[var(--fc-warm)]">{selectedTimelineEntry.debtLabel}</p>
                ) : null}
              </div>

              {selectedTimelineEntry.pushupTotal != null && selectedTimelineEntry.situpTotal != null ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <StatBox label={`${labels.review.stats.totalPushups} / ${labels.review.stats.totalSitups}`} value={`${selectedTimelineEntry.pushupTotal} / ${selectedTimelineEntry.situpTotal}`} />
                  <StatBox label={labels.timeline.sets} value={`L ${selectedTimelineEntry.pushupSet1 ?? 0}+${selectedTimelineEntry.pushupSet2 ?? 0} · S ${selectedTimelineEntry.situpSet1 ?? 0}+${selectedTimelineEntry.situpSet2 ?? 0}`} />
                  <StatBox label={labels.timeline.countsPrefix} value={selectedTimelineEntry.verifiedPushupTotal != null && selectedTimelineEntry.verifiedSitupTotal != null ? `${selectedTimelineEntry.verifiedPushupTotal} / ${selectedTimelineEntry.verifiedSitupTotal}` : "-"} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--fc-muted)]">{labels.timeline.noEntry}</p>
              )}

              {((selectedTimelineEntry.pushupOverTarget ?? 0) > 0 || (selectedTimelineEntry.situpOverTarget ?? 0) > 0) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedTimelineEntry.pushupOverTarget ?? 0) > 0 ? (
                    <span className="fc-chip fc-chip-accent">+{selectedTimelineEntry.pushupOverTarget} {labels.timeline.pushupOverTarget}</span>
                  ) : null}
                  {(selectedTimelineEntry.situpOverTarget ?? 0) > 0 ? (
                    <span className="fc-chip fc-chip-accent">+{selectedTimelineEntry.situpOverTarget} {labels.timeline.situpOverTarget}</span>
                  ) : null}
                </div>
              ) : null}

              {selectedTimelineEntry.notes ? (
                <div className="mt-4 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">{labels.timeline.workoutNote}</p>
                  <p className="mt-2 text-sm text-[var(--fc-ink-secondary)]">{selectedTimelineEntry.notes}</p>
                </div>
              ) : null}

              {selectedTimelineEntry.latestReviewComment ? (
                <div className="mt-4 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">{labels.timeline.reviewFeedback}</p>
                  {selectedTimelineEntry.latestReviewReviewerLabel ? (
                    <p className="mt-2 text-sm font-medium text-[var(--fc-ink)]">
                      {labels.timeline.reviewedBy} {selectedTimelineEntry.latestReviewReviewerLabel}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">{selectedTimelineEntry.latestReviewComment}</p>
                </div>
              ) : null}

              {selectedTimelineEntry.videos.length ? (
                <div className="mt-4 grid gap-2">
                  {selectedTimelineEntry.videos.map((video) => (
                    <div className="fc-video-row" key={video.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{video.originalName}</p>
                        <p className="text-xs text-[var(--fc-muted)]">{video.sizeLabel}</p>
                      </div>
                      <div className="fc-video-actions">
                        <Button asChild className="fc-video-button" size="sm" variant="ghost"><a href={`/api/videos/${video.id}`} target="_blank">{commonLabels.open}</a></Button>
                        <form action="/api/videos/replace" className="fc-video-replace-form" encType="multipart/form-data" method="post">
                          <input name="videoId" type="hidden" value={video.id} />
                          <label className="fc-video-action-button" htmlFor={`replacement-video-${video.id}`}>{labels.timeline.videoReplace}</label>
                          <input accept="video/*" className="sr-only" id={`replacement-video-${video.id}`} name="replacementVideo" onChange={handleVideoReplaceSelection} required type="file" />
                        </form>
                        <form action="/api/videos/delete" method="post"><input name="videoId" type="hidden" value={video.id} /><Button className="fc-video-button" size="sm" type="submit" variant="secondary">{labels.timeline.videoDelete}</Button></form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-[var(--fc-muted)]">{labels.timeline.noVideos}</p>
              )}
            </article>
          </div>
        ) : (
          <div className="fc-card text-sm text-[var(--fc-muted)]">{labels.timeline.noEntry}</div>
        )}
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="metastats">
        <SectionHeader subtitle={labels.metastats.profileTitle} title={labels.metastats.title} />
        <div className="mt-6 space-y-6">
          <section className="fc-card">
            <div>
              <p className="fc-kicker">{labels.metastats.profileKicker}</p>
              <h3 className="fc-heading mt-1 text-lg">{labels.metastats.profileTitle}</h3>
            </div>
            {profile.motivation ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{profile.motivation}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {profile.birthDateLabel ? <StatBox label={labels.metastats.birthDate} value={profile.birthDateLabel} /> : null}
              {profile.heightLabel ? <StatBox label={labels.metastats.heightCm} value={profile.heightLabel} /> : null}
            </div>
            <form action="/api/profile" className="mt-5 space-y-4" method="post">
              <div className="fc-grid-2">
                <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.name}</span><input className="fc-input" defaultValue={profile.name ?? ""} name="name" type="text" /></label>
                <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.birthDate}</span><DateTextInput className="fc-input" defaultValue={profile.birthDateInput} name="birthDate" placeholder={commonLabels.datePlaceholder} /></label>
                <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.heightCm}</span><input className="fc-input" defaultValue={profile.heightInput} inputMode="decimal" name="heightCm" step="0.1" type="number" /></label>
              </div>
              <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.motivation}</span><textarea className="fc-input min-h-20" defaultValue={profile.motivation ?? ""} maxLength={240} name="motivation" placeholder={labels.metastats.notes} /></label>
              <Button type="submit">{labels.metastats.saveProfile}</Button>
            </form>
          </section>

          <PerformanceChart labels={labels.charts} points={performancePoints} />

          <section className="fc-card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="fc-kicker">{labels.metastats.measurementsKicker}</p>
                <h3 className="fc-heading mt-1 text-xl">{labels.metastats.measurementsTitle}</h3>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {profile.weightLabel ? <StatBox label={labels.metastats.weight} value={profile.weightLabel} /> : null}
              {profile.waistLabel ? <StatBox label={labels.metastats.waist} value={profile.waistLabel} /> : null}
            </div>
            <form action="/api/measurements" className="mt-5 space-y-4" method="post">
              <div className="fc-grid-2">
                <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.weightKg}</span><input className="fc-input" inputMode="decimal" name="weightKg" step="0.1" type="number" /></label>
                <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.waistCm}</span><input className="fc-input" inputMode="decimal" name="waistCircumferenceCm" step="0.1" type="number" /></label>
                <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.restingPulse}</span><input className="fc-input" inputMode="numeric" name="restingPulseBpm" type="number" /></label>
              </div>
              <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.notes}</span><textarea className="fc-input min-h-20" name="notes" /></label>
              <Button type="submit" variant="secondary">{labels.metastats.saveMeasurement}</Button>
            </form>
          </section>

          <MeasurementChart labels={labels.charts} points={measurementPoints} />
        </div>
      </section>

      {!overview.isLightParticipant ? (
        <section className="fc-section fc-rise" data-fitcal-section id="review">
          <SectionHeader
            title={labels.review.title}
            actions={
              <div className="flex flex-wrap gap-2">
                <button className={`fc-chip ${reviewSubtab === "progress" ? "fc-chip-accent" : "fc-chip-muted"}`} onClick={() => setReviewSubtab("progress")} type="button">{labels.reviewSubtabs.progress}</button>
                <button className={`fc-chip ${reviewSubtab === "pending" ? "fc-chip-accent" : "fc-chip-muted"}`} onClick={() => setReviewSubtab("pending")} type="button">{labels.reviewSubtabs.pending}</button>
              </div>
            }
          />

          {reviewSubtab === "progress" ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="fc-card"><StatBox label={labels.review.summary.participants} value={reviewParticipants.length} /></div>
                <div className="fc-card"><StatBox label={labels.review.summary.activeToday} value={activeTodayCount} /></div>
                <div className="fc-card"><StatBox label={labels.review.summary.qualified} value={qualifiedCount} /></div>
                <div className="fc-card"><StatBox label={labels.review.summary.pendingReviews} value={openReviewCount} /></div>
              </div>

              {reviewSelfRow ? (
                <article className="fc-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="fc-heading text-lg">{reviewSelfRow.name}</h3>
                        <span className="fc-chip fc-chip-accent">{labels.review.you}</span>
                        <span className="fc-chip fc-chip-muted">{reviewSelfRow.modeLabel}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--fc-muted)]">{labels.review.selfHint}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="fc-chip fc-chip-muted">{labels.review.todayStat} {reviewSelfRow.todayLabel}</span>
                      <span className="fc-chip fc-chip-muted">{labels.review.yesterdayStat} {reviewSelfRow.yesterdayLabel}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <StatBox label={labels.review.stats.totalPushups} value={reviewSelfRow.totalPushups} />
                    <StatBox label={labels.review.stats.totalSitups} value={reviewSelfRow.totalSitups} />
                    <StatBox label={labels.review.stats.days} value={reviewSelfRow.documentedDays} />
                    <StatBox label={labels.review.stats.qualification} value={reviewSelfRow.qualificationLabel} />
                    <StatBox label={labels.review.stats.debt} value={reviewSelfRow.debtLabel ?? labels.participantReview.off} />
                  </div>
                </article>
              ) : null}

              <div className="grid gap-3 md:hidden">
                {reviewParticipants.map((row) => (
                  <article className="fc-card" key={row.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="fc-heading text-base">{row.name}</h3>
                          {row.isSelf ? <span className="fc-chip fc-chip-accent">{labels.review.you}</span> : null}
                          <span className="fc-chip fc-chip-muted">{row.modeLabel}</span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--fc-muted)]">
                          {labels.review.todayStat} {row.todayLabel} · {labels.review.yesterdayStat} {row.yesterdayLabel}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <StatBox label={labels.review.stats.totalPushups} value={row.totalPushups} />
                      <StatBox label={labels.review.stats.totalSitups} value={row.totalSitups} />
                      <StatBox label={labels.review.stats.days} value={row.documentedDays} />
                      <StatBox label={labels.review.stats.qualification} value={row.qualificationLabel} />
                      <StatBox label={labels.review.stats.debt} value={row.debtLabel ?? labels.participantReview.off} />
                      <StatBox label={labels.review.stats.reviews} value={row.isSelf ? labels.review.selfReviewDisabled : row.reviewLabel} />
                    </div>
                  </article>
                ))}
              </div>

              <div className="fc-card hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-[var(--fc-border)] text-[var(--fc-muted)]">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.name}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.mode}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.today}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.yesterday}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.totalPushups}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.totalSitups}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.qualification}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.days}</th>
                      <th className="pb-3 pr-4 font-medium">{labels.review.table.debt}</th>
                      <th className="pb-3 font-medium">{labels.review.table.reviews}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewParticipants.map((row) => (
                      <tr className="border-b border-[var(--fc-border)]/70 last:border-b-0" key={row.id}>
                        <td className="py-3 pr-4 font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{row.name}</span>
                            {row.isSelf ? <span className="fc-chip fc-chip-accent">{labels.review.you}</span> : null}
                          </div>
                        </td>
                        <td className="py-3 pr-4">{row.modeLabel}</td>
                        <td className="py-3 pr-4">{row.todayLabel}</td>
                        <td className="py-3 pr-4">{row.yesterdayLabel}</td>
                        <td className="py-3 pr-4">{row.totalPushups}</td>
                        <td className="py-3 pr-4">{row.totalSitups}</td>
                        <td className="py-3 pr-4">{row.qualificationLabel}</td>
                        <td className="py-3 pr-4">{row.documentedDays}</td>
                        <td className="py-3 pr-4">{row.debtLabel ?? labels.participantReview.off}</td>
                        <td className="py-3">{row.isSelf ? labels.review.selfReviewDisabled : row.reviewLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="fc-heading text-lg">{labels.review.sicknessTitle}</h3>
                  <span className="fc-chip fc-chip-muted">{sicknessReviewItems.length} {labels.review.openCount}</span>
                </div>
                {sicknessReviewItems.length ? sicknessReviewItems.map((item) => (
                  <article className="fc-card" key={item.id}>
                    <div>
                      <h4 className="fc-heading text-lg">{item.userLabel} · {item.dateLabel}</h4>
                      <p className="mt-1 text-sm text-[var(--fc-muted)]">{labels.review.sicknessBody}</p>
                      {item.notes ? <p className="mt-2 text-sm text-[var(--fc-muted)]">{labels.review.commentPrefix} {item.notes}</p> : null}
                    </div>
                    <form action="/api/challenge/sickness-reviews" className="mt-5 space-y-4" method="post">
                      <input name="verificationId" type="hidden" value={item.id} />
                      <label className="fc-input-group"><span className="fc-input-label">{labels.review.commentLabel}</span><textarea className="fc-input min-h-20" name="notes" placeholder={commonLabels.optional} /></label>
                      <div className="flex flex-wrap gap-3">
                        <Button name="decision" type="submit" value="approve">{labels.review.approveSickness}</Button>
                        <Button name="decision" type="submit" value="reject" variant="secondary">{labels.review.rejectSickness}</Button>
                      </div>
                    </form>
                  </article>
                )) : <div className="fc-card text-sm text-[var(--fc-muted)]">{labels.review.noSickness}</div>}
              </div>

              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="fc-heading text-lg">{labels.review.primaryTitle}</h3>
                  <span className="fc-chip fc-chip-muted">{primaryReviewItems.length} {labels.review.openCount}</span>
                </div>
                {primaryReviewItems.length ? primaryReviewItems.map((item) => (
                  <article className="fc-card" key={item.id}>
                    <div>
                      <h4 className="fc-heading text-lg">{item.userLabel} · {item.dateLabel}</h4>
                      <p className="mt-1 text-sm text-[var(--fc-muted)]">{labels.review.claimPrefix} {item.claimedPushups} / {item.claimedSitups} · {labels.review.targetPrefix} {item.targetReps}</p>
                      {item.statusLabel ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{item.statusLabel}</p> : null}
                      {item.workoutNote ? (
                        <div className="mt-3 rounded-[var(--fc-radius-sm)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">{labels.review.workoutNote}</p>
                          <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">{item.workoutNote}</p>
                        </div>
                      ) : null}
                      {item.priorNote ? <p className="mt-2 text-sm text-[var(--fc-muted)]">{item.priorNote}</p> : null}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">{item.videos.map((video) => <video className="w-full rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-black" controls key={video.id} preload="metadata" src={`/api/videos/${video.id}`} />)}</div>
                    <form action="/api/workout-reviews" className="mt-5 space-y-4" method="post">
                      <input name="submissionId" type="hidden" value={item.id} />
                      <input name="mode" type="hidden" value="primary" />
                      <div className="fc-grid-2">
                        <label className="fc-input-group"><span className="fc-input-label">{labels.review.countedPushups}</span><input className="fc-input" defaultValue={item.claimedPushups} max={item.claimedPushups} min="0" name="countedPushups" type="number" /></label>
                        <label className="fc-input-group"><span className="fc-input-label">{labels.review.countedSitups}</span><input className="fc-input" defaultValue={item.claimedSitups} max={item.claimedSitups} min="0" name="countedSitups" type="number" /></label>
                      </div>
                      <label className="fc-input-group"><span className="fc-input-label">{labels.review.feedback}</span><textarea className="fc-input min-h-20" name="notes" placeholder={commonLabels.optional} /></label>
                      <div className="flex flex-wrap gap-3">
                        <Button name="decision" type="submit" value="approve">{labels.review.approveWorkout}</Button>
                        <Button name="decision" type="submit" value="adjust" variant="secondary">{labels.review.adjustWorkout}</Button>
                      </div>
                    </form>
                  </article>
                )) : <div className="fc-card text-sm text-[var(--fc-muted)]">{labels.review.noPrimary}</div>}
              </div>

              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="fc-heading text-lg">{labels.review.escalationTitle}</h3>
                  <span className="fc-chip fc-chip-muted">{escalationReviewItems.length} {labels.review.openCount}</span>
                </div>
                {escalationReviewItems.length ? escalationReviewItems.map((item) => (
                  <article className="fc-card" key={item.id}>
                    <div>
                      <h4 className="fc-heading text-lg">{item.userLabel} · {item.dateLabel}</h4>
                      <p className="mt-1 text-sm text-[var(--fc-muted)]">{labels.review.claimPrefix} {item.claimedPushups} / {item.claimedSitups} · {labels.review.targetPrefix} {item.targetReps}</p>
                      {item.workoutNote ? (
                        <div className="mt-3 rounded-[var(--fc-radius-sm)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">{labels.review.workoutNote}</p>
                          <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">{item.workoutNote}</p>
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm text-[var(--fc-muted)]">{item.reviewerLabel} {labels.review.countsLabel} {item.reviewedPushups} / {item.reviewedSitups}.</p>
                      {item.reviewComment ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{labels.review.commentPrefix} {item.reviewComment}</p> : null}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">{item.videos.map((video) => <video className="w-full rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-black" controls key={video.id} preload="metadata" src={`/api/videos/${video.id}`} />)}</div>
                    <form action="/api/workout-reviews" className="mt-5 space-y-4" method="post">
                      <input name="submissionId" type="hidden" value={item.id} />
                      <input name="mode" type="hidden" value="arbitration" />
                      <label className="fc-input-group"><span className="fc-input-label">{labels.review.commentLabel}</span><textarea className="fc-input min-h-20" name="notes" placeholder={commonLabels.optional} /></label>
                      <div className="flex flex-wrap gap-3">
                        <Button name="decision" type="submit" value="accept">{labels.review.acceptReview}</Button>
                        <Button name="decision" type="submit" value="reject" variant="secondary">{labels.review.rejectReview}</Button>
                      </div>
                    </form>
                  </article>
                )) : <div className="fc-card text-sm text-[var(--fc-muted)]">{labels.review.noEscalation}</div>}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className="fc-section fc-rise" data-fitcal-section id="regeln">
        <SectionHeader title={labels.rules.title} />
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <ol className="fc-rule-list">{rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
          <div>
            {!overview.isLightParticipant ? (
              <>
                <p className="text-sm leading-relaxed text-[var(--fc-muted)]">{labels.rules.fullDescription}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <a className="fc-video-link" href="https://www.youtube.com/watch?v=JvX0ilRCBrU" rel="noreferrer" target="_blank">{labels.rules.referencePushups}</a>
                  <a className="fc-video-link" href="https://www.youtube.com/watch?v=czKvGbo5zAo" rel="noreferrer" target="_blank">{labels.rules.referenceSitups}</a>
                </div>
              </>
            ) : <p className="text-sm leading-relaxed text-[var(--fc-muted)]">{labels.rules.lightDescription}</p>}
          </div>
        </div>
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="rechner">
        <SectionHeader title={labels.calculator.title} />
        <div className={`grid gap-4 md:grid-cols-2 ${overview.isLightParticipant ? "xl:grid-cols-2" : "xl:grid-cols-4"}`}>
          <section className="fc-card">
            <h3 className="fc-heading text-base">{labels.calculator.targetTitle}</h3>
            <label className="fc-input-group mt-4"><span className="fc-input-label">{labels.calculator.date}</span><DateTextInput className="fc-input" onValueChange={setTargetDateInput} placeholder={commonLabels.datePlaceholder} value={targetDateInput} /></label>
            <div className="mt-4 grid gap-2">
              <StatBox label={labels.calculator.challengeDay} value={selectedChallengeDay ?? "-"} />
              <StatBox label={labels.calculator.perExercise} value={selectedDateTarget ?? "-"} />
            </div>
            {!selectedDateInChallenge ? <p className="mt-3 text-sm text-[var(--fc-muted)]">{replaceTemplate(labels.calculator.chooseDate, { startDate: formatDateKeyForInput(CHALLENGE_START_DATE), endDate: formatDateKeyForInput(CHALLENGE_END_DATE) })}</p> : null}
          </section>
          {!overview.isLightParticipant ? (
            <>
              <section className="fc-card">
                <h3 className="fc-heading text-base">{labels.calculator.slackTitle}</h3>
                <div className="mt-4 fc-grid-2">
                  <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.existingSlackDays}</span><input className="fc-input" readOnly type="number" value={overview.existingSlackDays} /></label>
                  <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.additionalSlackDays}</span><input className="fc-input" inputMode="numeric" onChange={(event) => setSlackDaysInput(event.target.value)} type="number" value={slackDaysInput} /></label>
                </div>
                <div className="mt-4 grid gap-2">
                  <StatBox label={labels.calculator.total} value={formatCurrency(locale, totalSlackDebtCents)} />
                  <StatBox label={labels.calculator.nextSlackDay} value={formatCurrency(locale, nextSlackDayCostCents)} />
                </div>
                <p className="mt-3 text-sm text-[var(--fc-muted)]">{hasStudentPricing ? labels.calculator.slackFormulaStudent : labels.calculator.slackFormulaStandard}</p>
              </section>
              <section className="fc-card">
                <h3 className="fc-heading text-base">{labels.calculator.debtTitle}</h3>
                <label className="fc-input-group mt-4"><span className="fc-input-label">{labels.calculator.debtEuro}</span><input className="fc-input" inputMode="decimal" onChange={(event) => setDebtInput(event.target.value)} type="number" value={debtInput} /></label>
                <div className="mt-4 grid gap-2">
                  <StatBox label={labels.calculator.onlyPushups} value={pushupsForDebt} />
                  <StatBox label={labels.calculator.onlySitups} value={situpsForDebt} />
                  <StatBox label={labels.calculator.mixed} value={`${mixedPushups} L + ${mixedSitups} S`} />
                </div>
                <p className="mt-3 text-sm text-[var(--fc-muted)]">{labels.calculator.debtHint}</p>
              </section>
            </>
          ) : null}
          <section className="fc-card">
            <h3 className="fc-heading text-base">{labels.calculator.caloriesTitle}</h3>
            <div className="mt-4 fc-grid-2">
              <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.totalPushups}</span><input className="fc-input" inputMode="numeric" onChange={(event) => setPushupInput(event.target.value)} type="number" value={pushupInput} /></label>
              <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.totalSitups}</span><input className="fc-input" inputMode="numeric" onChange={(event) => setSitupInput(event.target.value)} type="number" value={situpInput} /></label>
              <label className="fc-input-group col-span-full"><span className="fc-input-label">{labels.calculator.weightKg}</span><input className="fc-input" inputMode="decimal" onChange={(event) => setWeightInput(event.target.value)} type="number" value={weightInput} /></label>
            </div>
            <div className="mt-4 grid gap-2">
              <StatBox label={labels.calculator.pushups} value={`${formatLocalizedNumber(locale, pushupCalories)} ${labels.calculator.kilocalories}`} />
              <StatBox label={labels.calculator.situps} value={`${formatLocalizedNumber(locale, situpCalories)} ${labels.calculator.kilocalories}`} />
              <StatBox label={labels.calculator.total} value={`${formatLocalizedNumber(locale, totalCalories)} ${labels.calculator.kilocalories}`} />
            </div>
            <p className="mt-3 text-sm text-[var(--fc-muted)]">{labels.calculator.roughEstimate}</p>
          </section>
        </div>
      </section>
    </div>
  );
}
