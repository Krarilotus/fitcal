"use client";

import { type ChangeEvent, type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { AppDictionary } from "@/i18n";
import { DashboardHistorySection } from "@/components/fitcal/dashboard/history-section";
import {
  DashboardActionButton,
  DashboardSectionHeader as SectionHeader,
  DashboardStatusBadge,
  DashboardStatBox as StatBox,
} from "@/components/fitcal/dashboard/dashboard-primitives";
import { DashboardReviewSection } from "@/components/fitcal/dashboard/review-section";
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
  getChallengeDayIndex,
  getRequiredReps,
  isWithinChallenge,
} from "@/lib/challenge";
import {
  prepareUploadVideosForSubmission,
  VideoPreparationError,
} from "@/lib/video-processing/browser/video-transcoder";
import { shouldCompressVideoBeforeUpload } from "@/lib/video-processing/compression-policy";
import { TARGET_UPLOAD_VIDEO_MB } from "@/lib/video-processing/constants";
import { buildSubmissionUploadFormData } from "@/lib/video-processing/upload-form-data";

type DashboardLabels = AppDictionary["dashboard"];
type TabKey = "overview" | "uploads" | "timeline" | "metastats" | "review" | "regeln" | "rechner";
type SelectedUploadVideo = {
  compressedSizeLabel?: string;
  id: string;
  originalName: string;
  displayName: string;
  sizeLabel: string;
};

type UploadActivity = {
  currentFileIndex?: number;
  currentFileName?: string;
  progress?: number;
  stage: "loadingEncoder" | "encoding" | "uploading" | "confirming";
  totalFiles?: number;
};

type ClaimEditorReplacementState = Record<string, string | null>;

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

function getUploadButtonLabel(
  labels: DashboardLabels["uploads"],
  activity: UploadActivity | null,
  isLightParticipant: boolean,
) {
  if (!activity) {
    return isLightParticipant ? labels.saveEntry : labels.saveWorkout;
  }

  if (activity.stage === "loadingEncoder") {
    return labels.loadingEncoder;
  }

  if (activity.stage === "encoding") {
    return labels.encodingWorkout;
  }

  if (activity.stage === "uploading") {
    return isLightParticipant ? labels.uploadingEntry : labels.uploadingWorkout;
  }

  return labels.confirmingUpload;
}

function getUploadActivityMessage(
  labels: DashboardLabels["uploads"],
  activity: UploadActivity | null,
) {
  if (!activity) {
    return null;
  }

  if (activity.stage === "loadingEncoder") {
    return labels.loadingEncoderHint;
  }

  if (activity.stage === "encoding") {
    return replaceTemplate(labels.encodingProgress, {
      current: activity.currentFileIndex ?? 1,
      name: activity.currentFileName ?? "video.mp4",
      percent: Math.round((activity.progress ?? 0) * 100),
      total: activity.totalFiles ?? 1,
    });
  }

  if (activity.stage === "uploading") {
    return labels.uploadingCompressed;
  }

  return labels.confirmingUploadHint;
}

function getVideoCompressionErrorMessage(
  error: unknown,
  labels: DashboardLabels["uploads"],
) {
  if (error instanceof VideoPreparationError) {
    if (error.code === "encoder_load_failed") {
      return labels.encoderLoadFailed;
    }

    if (error.code === "compression_too_large") {
      return labels.compressionTooLarge;
    }
  }

  const message = error instanceof Error ? error.message : "";

  if (message.includes("15 MB")) {
    return labels.compressionTooLarge;
  }

  return labels.compressionFailed;
}

async function submitTrackedUpload(
  form: HTMLFormElement,
  locale: Locale,
  setUploadActivities: Dispatch<SetStateAction<Record<string, UploadActivity | null>>>,
  setUploadErrors: Dispatch<SetStateAction<Record<string, string | null>>>,
  setSelectedUploadVideos: Dispatch<SetStateAction<Record<string, SelectedUploadVideo[]>>>,
  labels: DashboardLabels["uploads"],
  isLightParticipant: boolean,
) {
  const formData = new FormData(form);
  const requestStartedAt = Date.now();
  const challengeDateValue = formData.get("challengeDate");
  const challengeDate =
    typeof challengeDateValue === "string" ? challengeDateValue : "unknown";
  const hasExistingClaim = formData.get("hasExistingClaim") === "1";
  const replaceVideoId =
    typeof formData.get("replaceVideoId") === "string"
      ? String(formData.get("replaceVideoId"))
      : "";
  const files = formData
    .getAll("videos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!isLightParticipant) {
    if (replaceVideoId && files.length !== 1) {
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: labels.replaceRequiresSingleVideo,
      }));
      return;
    }

    if (
      files.length > MAX_VIDEO_FILES_PER_DAY ||
      (!hasExistingClaim && files.length < 1)
    ) {
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: labels.uploadTooMany,
      }));
      return;
    }

  }

  setUploadActivities((current) => ({
    ...current,
    [challengeDate]:
      isLightParticipant
        ? { stage: "uploading" }
        : files.some((file) => shouldCompressVideoBeforeUpload(file.size))
          ? { stage: "loadingEncoder" }
          : { stage: "uploading" },
  }));
  setUploadErrors((current) => ({
    ...current,
    [challengeDate]: null,
  }));

  try {
    const preparedVideos = !isLightParticipant
      ? await prepareUploadVideosForSubmission({
          files,
          onEncoderLoadStart: () => {
            setUploadActivities((current) => ({
              ...current,
              [challengeDate]: {
                stage: "loadingEncoder",
              },
            }));
          },
          onEncoderReady: () => {
            setUploadActivities((current) => ({
              ...current,
              [challengeDate]: {
                stage: "encoding",
                progress: 0,
                totalFiles: files.length,
              },
            }));
          },
          onEncodingStart: ({ currentFileIndex, currentFileName, totalFiles }) => {
            setUploadActivities((current) => ({
              ...current,
              [challengeDate]: {
                stage: "encoding",
                currentFileIndex,
                currentFileName,
                progress: 0,
                totalFiles,
              },
            }));
          },
          onEncodingProgress: ({ currentFileIndex, currentFileName, totalFiles, value }) => {
            setUploadActivities((current) => ({
              ...current,
              [challengeDate]: {
                stage: "encoding",
                currentFileIndex,
                currentFileName,
                progress: value,
                totalFiles,
              },
            }));
          },
          totalFiles: files.length,
        }).catch((error: unknown) => {
          console.error("[fitcal-upload] local video compression failed", error);
          throw new Error(getVideoCompressionErrorMessage(error, labels));
        })
      : [];

    if (!isLightParticipant) {
      setSelectedUploadVideos((current) => ({
        ...current,
        [challengeDate]: (current[challengeDate] ?? []).map((video, index) => ({
          ...video,
          compressedSizeLabel: preparedVideos[index]?.wasCompressed
            ? formatFileSizeLabel(locale, preparedVideos[index].outputSizeBytes)
            : undefined,
        })),
      }));
    }

    const requestFormData = isLightParticipant
      ? formData
      : buildSubmissionUploadFormData(formData, preparedVideos);

    setUploadActivities((current) => ({
      ...current,
      [challengeDate]: {
        stage: "uploading",
      },
    }));

    const response = await fetch("/api/submissions", {
      method: "POST",
      body: requestFormData,
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

      setUploadActivities((current) => ({
        ...current,
        [challengeDate]: null,
      }));
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: errorMessage,
      }));
      return;
    }

    setUploadActivities((current) => ({
      ...current,
      [challengeDate]: {
        stage: "confirming",
      },
    }));

    const confirmedRedirectUrl = await confirmRecentSubmission(
      challengeDate,
      requestStartedAt,
    );

    if (confirmedRedirectUrl) {
      window.location.assign(confirmedRedirectUrl);
      return;
    }

    setUploadActivities((current) => ({
      ...current,
      [challengeDate]: null,
    }));
    setUploadErrors((current) => ({
      ...current,
      [challengeDate]: labels.uploadUnexpected,
    }));
  } catch (error) {
    const confirmedRedirectUrl = await confirmRecentSubmission(
      challengeDate,
      requestStartedAt,
    );

    if (confirmedRedirectUrl) {
      window.location.assign(confirmedRedirectUrl);
      return;
    }

    setUploadActivities((current) => ({
      ...current,
      [challengeDate]: null,
    }));
    setUploadErrors((current) => ({
      ...current,
      [challengeDate]:
        error instanceof Error && error.message
          ? error.message
          : labels.uploadUnexpected,
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
  const [uploadActivities, setUploadActivities] = useState<Record<string, UploadActivity | null>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [claimEditorReplacementTargets, setClaimEditorReplacementTargets] =
    useState<ClaimEditorReplacementState>({});
  const [focusedClaimEditorDate, setFocusedClaimEditorDate] = useState<string | null>(null);
  const uploadSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const uploadFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadPrimaryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  function handleUploadVideoSelection(
    challengeDate: string,
    existingVideoCount: number,
    replaceVideoId: string | null,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.currentTarget.files ?? []);
    const nextVideos = files.map((file, index) => ({
      compressedSizeLabel: undefined,
      id: buildUploadVideoId(file, index),
      originalName: file.name,
      displayName: file.name.replace(/\.[^.]+$/, ""),
      sizeLabel: formatFileSizeLabel(locale, file.size),
    }));

    let nextError: string | null = null;

    if (replaceVideoId && files.length !== 1) {
      nextError = labels.uploads.replaceRequiresSingleVideo;
    } else if (!replaceVideoId && files.length + existingVideoCount > MAX_VIDEO_FILES_PER_DAY) {
      nextError = labels.uploads.uploadTooMany;
    }

    setSelectedUploadVideos((current) => ({
      ...current,
      [challengeDate]: nextVideos,
    }));
    setUploadActivities((current) => ({
      ...current,
      [challengeDate]: null,
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

  function focusClaimEditor(
    challengeDate: string,
    options: {
      openFilePicker?: boolean;
      replaceVideoId?: string | null;
    } = {},
  ) {
    const replaceVideoId = options.replaceVideoId ?? null;
    const shouldOpenFilePicker = Boolean(options.openFilePicker || replaceVideoId);

    flushSync(() => {
      setActiveTab("uploads");
      setFocusedClaimEditorDate(challengeDate);
      setClaimEditorReplacementTargets((current) => ({
        ...current,
        [challengeDate]: replaceVideoId,
      }));
      setSelectedUploadVideos((current) => ({
        ...current,
        [challengeDate]: [],
      }));
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: null,
      }));
    });

    const target = uploadSectionRefs.current[challengeDate];

    if (!target) {
      return;
    }

    document
      .getElementById("uploads")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (shouldOpenFilePicker) {
      const fileInput = uploadFileInputRefs.current[challengeDate];
      fileInput?.focus();
      fileInput?.click();
    } else {
      uploadPrimaryInputRefs.current[challengeDate]?.focus();
    }

    const stickyOffset = 112;
    window.setTimeout(() => {
      const targetTop = target.getBoundingClientRect().top + window.scrollY - stickyOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    }, 40);
  }

  function clearClaimEditorReplacementTarget(challengeDate: string) {
    setClaimEditorReplacementTargets((current) => ({
      ...current,
      [challengeDate]: null,
    }));
    setSelectedUploadVideos((current) => ({
      ...current,
      [challengeDate]: [],
    }));
  }

  useEffect(() => {
    if (!focusedClaimEditorDate) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFocusedClaimEditorDate((current) =>
        current === focusedClaimEditorDate ? null : current,
      );
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [focusedClaimEditorDate]);

  function openVideo(videoId: string) {
    window.open(`/api/videos/${videoId}`, "_blank", "noopener,noreferrer");
  }

  function submitDashboardPostAction(
    action: string,
    fields: Record<string, string>,
  ) {
    const form = document.createElement("form");
    form.method = "post";
    form.action = action;
    form.style.display = "none";

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.requestSubmit();
    window.setTimeout(() => {
      form.remove();
    }, 0);
  }

  function scrollToDashboardSection(sectionId: TabKey) {
    setActiveTab(sectionId);
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <button
            className={`fc-tab ${activeTab === tab.key ? "is-active" : ""}`}
            key={tab.key}
            onClick={() => scrollToDashboardSection(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
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
                <article
                  className={`fc-card ${focusedClaimEditorDate === day.challengeDate ? "is-focused-claim" : ""}`}
                  id={`upload-${day.challengeDate}`}
                  key={day.challengeDate}
                  ref={(node) => {
                    uploadSectionRefs.current[day.challengeDate] = node;
                  }}
                >
                {(() => {
                  const uploadActivity = uploadActivities[day.challengeDate] ?? null;
                  const isUploading = uploadActivity != null;
                  const uploadError = uploadErrors[day.challengeDate];
                  const uploadActivityMessage = getUploadActivityMessage(labels.uploads, uploadActivity);
                  const replaceVideoId = claimEditorReplacementTargets[day.challengeDate] ?? null;
                  const replacementVideo =
                    replaceVideoId != null
                      ? day.videos.find((video) => video.id === replaceVideoId) ?? null
                      : null;

                  return (
                    <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="fc-heading text-lg">{day.dateLabel}</h3>
                    <p className="mt-1 text-sm text-[var(--fc-muted)]">{day.targetReps} {labels.uploads.targetSuffix}</p>
                  </div>
                    <div className="flex flex-wrap gap-1.5">
                      <DashboardStatusBadge tone="accent">
                        {day.isCurrentDay ? labels.uploads.today : labels.uploads.yesterday}
                      </DashboardStatusBadge>
                      {day.isQualificationDay ? (
                        <DashboardStatusBadge tone="warm">
                          {labels.uploads.qualification}
                        </DashboardStatusBadge>
                      ) : null}
                      {day.reviewStatusLabel ? (
                        <DashboardStatusBadge>{day.reviewStatusLabel}</DashboardStatusBadge>
                      ) : null}
                    </div>
                </div>
                {day.reviewNotes.length > 0 ? (
                  <div className="mt-4 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">{labels.timeline.reviewFeedback}</p>
                    <div className="mt-2 grid gap-3">
                      {day.reviewNotes.map((reviewNote) => (
                        <div key={reviewNote.id}>
                          <p className="text-sm font-medium text-[var(--fc-ink)]">
                            {labels.timeline.reviewedBy} {reviewNote.reviewerLabel}
                          </p>
                          <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">{reviewNote.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {day.isEditableClaim && day.hasExistingClaim ? (
                  <div className="mt-4 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                    <p className="text-sm text-[var(--fc-ink-secondary)]">
                      {labels.uploads.currentClaimHint}
                    </p>
                  </div>
                ) : null}
                <form
                  className="mt-5 space-y-4"
                  encType="multipart/form-data"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitTrackedUpload(
                      event.currentTarget,
                      locale,
                      setUploadActivities,
                      setUploadErrors,
                      setSelectedUploadVideos,
                      labels.uploads,
                      overview.isLightParticipant,
                    );
                  }}
                >
                  <input name="challengeDate" type="hidden" value={day.challengeDate} />
                  <input
                    name="hasExistingClaim"
                    type="hidden"
                    value={day.hasExistingClaim ? "1" : "0"}
                  />
                  <input
                    name="replaceVideoId"
                    type="hidden"
                    value={replaceVideoId ?? ""}
                  />
                  <div className="fc-grid-2">
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.pushupSet1}</span><input className="fc-input" defaultValue={day.pushupSet1} disabled={isUploading} min="0" name="pushupSet1" placeholder="0" ref={(node) => {
                      uploadPrimaryInputRefs.current[day.challengeDate] = node;
                    }} type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.pushupSet2}</span><input className="fc-input" defaultValue={day.pushupSet2} disabled={isUploading} min="0" name="pushupSet2" placeholder="0" type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.situpSet1}</span><input className="fc-input" defaultValue={day.situpSet1} disabled={isUploading} min="0" name="situpSet1" placeholder="0" type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.situpSet2}</span><input className="fc-input" defaultValue={day.situpSet2} disabled={isUploading} min="0" name="situpSet2" placeholder="0" type="number" /></label>
                  </div>
                  <p className="text-sm text-[var(--fc-muted)]">{overview.isLightParticipant ? labels.uploads.lightHint : labels.uploads.fullHint}</p>
                  <div className={`grid gap-3 ${overview.isLightParticipant ? "sm:grid-cols-1" : "sm:grid-cols-[1.1fr_0.9fr]"}`}>
                    {!overview.isLightParticipant ? (
                      <div className="space-y-3">
                        {replacementVideo ? (
                          <div className="rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">
                                  {labels.uploads.replaceVideoLabel}
                                </p>
                                <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">
                                  {replacementVideo.originalName}
                                </p>
                                <p className="mt-1 text-sm text-[var(--fc-muted)]">
                                  {labels.uploads.replaceVideoHint}
                                </p>
                              </div>
                              <DashboardActionButton
                                disabled={isUploading}
                                onClick={() => clearClaimEditorReplacementTarget(day.challengeDate)}
                                type="button"
                              >
                                {labels.uploads.cancelReplaceVideo}
                              </DashboardActionButton>
                            </div>
                          </div>
                        ) : null}
                        <label className="fc-input-group">
                          <span className="fc-input-label">{labels.uploads.videos}</span>
                          <input accept="video/*" className="fc-input-file" disabled={isUploading} id={`upload-video-input-${day.challengeDate}`} multiple={!replaceVideoId} name="videos" onChange={(event) => handleUploadVideoSelection(day.challengeDate, day.videos.length, replaceVideoId, event)} ref={(node) => {
                            uploadFileInputRefs.current[day.challengeDate] = node;
                          }} required={!day.hasExistingClaim || Boolean(replaceVideoId)} type="file" />
                        </label>
                        <p className="text-sm text-[var(--fc-muted)]">{labels.uploads.compressionHint.replace("{size}", String(TARGET_UPLOAD_VIDEO_MB))}</p>
                        {day.videos.length > 0 ? (
                          <div className="grid gap-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--fc-muted)]">
                              {labels.uploads.currentVideos}
                            </p>
                            {day.videos.map((video) => (
                              <div className="fc-video-row" key={video.id}>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{video.originalName}</p>
                                  <p className="text-xs text-[var(--fc-muted)]">{video.sizeLabel}</p>
                                </div>
                                <div className="fc-action-row">
                                  <DashboardActionButton
                                    onClick={() => openVideo(video.id)}
                                    type="button"
                                  >
                                    {commonLabels.open}
                                  </DashboardActionButton>
                                  {day.isEditableClaim ? (
                                    <>
                                      <DashboardActionButton
                                        disabled={isUploading}
                                        onClick={() =>
                                          focusClaimEditor(day.challengeDate, {
                                            openFilePicker: true,
                                            replaceVideoId: video.id,
                                          })
                                        }
                                        type="button"
                                      >
                                        {labels.timeline.videoReplace}
                                      </DashboardActionButton>
                                      <DashboardActionButton
                                        disabled={isUploading}
                                        onClick={() =>
                                          submitDashboardPostAction("/api/videos/delete", {
                                            videoId: video.id,
                                          })
                                        }
                                        type="button"
                                        variant="danger"
                                      >
                                        {labels.timeline.videoDelete}
                                      </DashboardActionButton>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {selectedUploadVideos[day.challengeDate]?.length ? (
                          <div className="grid gap-2">
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--fc-muted)]">{labels.uploads.videoNames}</p>
                            {selectedUploadVideos[day.challengeDate].map((video, index) => (
                              <label className="fc-input-group" key={video.id}>
                                <span className="fc-input-label">{labels.uploads.videoNameLabel.replace("{index}", String(index + 1))}</span>
                                <input className="fc-input" disabled={isUploading} maxLength={120} name={`videoDisplayName${index}`} onChange={(event) => handleUploadVideoRename(day.challengeDate, video.id, event.target.value)} placeholder={video.originalName} type="text" value={video.displayName} />
                                <span className="text-xs text-[var(--fc-muted)]">
                                  {video.compressedSizeLabel
                                    ? replaceTemplate(labels.uploads.videoSizeCompressed, {
                                        compressed: video.compressedSizeLabel,
                                        original: video.sizeLabel,
                                      })
                                    : video.sizeLabel}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="fc-input-group"><span className="fc-input-label">{labels.uploads.notes}</span><textarea className="fc-input min-h-[5.5rem]" defaultValue={day.notes} disabled={isUploading} name="notes" /></label>
                  </div>
                  {uploadError ? <p className="text-sm font-medium text-[var(--fc-warm)]">{uploadError}</p> : null}
                  {uploadActivityMessage ? (
                    <div className="rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                      <p className="text-sm text-[var(--fc-ink-secondary)]">{uploadActivityMessage}</p>
                      {uploadActivity?.stage === "encoding" && typeof uploadActivity.progress === "number" ? (
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--fc-surface)]">
                          <div
                            className="h-full rounded-full bg-[var(--fc-accent)] transition-[width] duration-200"
                            style={{ width: `${Math.round(uploadActivity.progress * 100)}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={isUploading}
                      onClick={(event) => {
                        const form = event.currentTarget.form;
                        if (!form) return;
                        void submitTrackedUpload(
                          form,
                          locale,
                          setUploadActivities,
                          setUploadErrors,
                          setSelectedUploadVideos,
                          labels.uploads,
                          overview.isLightParticipant,
                        );
                      }}
                      type="button"
                    >
                      {getUploadButtonLabel(labels.uploads, uploadActivity, overview.isLightParticipant)}
                    </Button>
                    {day.isEditableClaim && day.hasExistingClaim ? (
                      <Button
                        disabled={isUploading}
                        onClick={() =>
                          submitDashboardPostAction("/api/submissions/delete", {
                            challengeDate: day.challengeDate,
                          })
                        }
                        type="button"
                        variant="danger"
                      >
                        {labels.timeline.claimDelete}
                      </Button>
                    ) : null}
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

      <DashboardHistorySection
        commonLabels={commonLabels}
        labels={labels}
        onClaimEdit={(challengeDate) => focusClaimEditor(challengeDate)}
        onClaimAddVideos={(challengeDate) =>
          focusClaimEditor(challengeDate, { openFilePicker: true })
        }
        onEditableVideoReplace={(challengeDate, videoId) =>
          focusClaimEditor(challengeDate, {
            openFilePicker: true,
            replaceVideoId: videoId,
          })
        }
        onVideoReplaceSelection={handleVideoReplaceSelection}
        timelineEntries={timelineEntries}
      />

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
        <DashboardReviewSection
          commonLabels={commonLabels}
          escalationReviewItems={escalationReviewItems}
          labels={labels}
          participantRows={participantRows}
          primaryReviewItems={primaryReviewItems}
          sicknessReviewItems={sicknessReviewItems}
        />
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
