"use client";

import { type ChangeEvent, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AppDictionary } from "@/i18n";
import type { OpenDay, OverviewSummary } from "@/components/fitcal/dashboard-types";
import {
  DashboardActionButton,
  DashboardSectionHeader as SectionHeader,
  DashboardStatusBadge,
} from "@/components/fitcal/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/preferences";
import { MAX_VIDEO_FILES_PER_DAY } from "@/lib/challenge";
import {
  prepareUploadVideosForSubmission,
  VideoPreparationError,
} from "@/lib/video-processing/browser/video-transcoder";
import { shouldCompressVideoBeforeUpload } from "@/lib/video-processing/compression-policy";
import { TARGET_UPLOAD_VIDEO_MB } from "@/lib/video-processing/constants";
import { buildSubmissionUploadFormData } from "@/lib/video-processing/upload-form-data";
import { replaceTemplate } from "@/lib/template";

type DashboardLabels = AppDictionary["dashboard"];

export type SelectedUploadVideo = {
  compressedSizeLabel?: string;
  id: string;
  originalName: string;
  displayName: string;
  sizeLabel: string;
};

export type UploadActivity = {
  currentFileIndex?: number;
  currentFileName?: string;
  progress?: number;
  stage: "loadingEncoder" | "encoding" | "uploading" | "confirming";
  totalFiles?: number;
};

export type FocusedClaimEditorState = {
  challengeDate: string;
  token: number;
} | null;

type SubmissionResponsePayload = {
  ok: boolean;
  redirectUrl?: string;
  error?: string;
  errorCode?: string;
};

/* ── Formatting helpers ── */

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

/* ── Upload label helpers ── */

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

function getSubmissionFailureMessage(
  payload: SubmissionResponsePayload | null,
  responseStatus: number,
  labels: DashboardLabels["uploads"],
) {
  if (responseStatus === 413 || payload?.errorCode === "too_large") {
    return labels.uploadTooLargeRequest;
  }

  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  return labels.uploadUnexpected;
}

/* ── Submission logic ── */

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

      const errorMessage = getSubmissionFailureMessage(payload, response.status, labels);

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

function buildUploadVideoId(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

/* ── Component ── */

export function DashboardUploadSection({
  claimEditorReplacementTargets,
  commonLabels,
  expandedClaimEditors,
  focusedClaimEditor,
  labels,
  locale,
  onClearReplacementTarget,
  onFocusClaimEditor,
  onSubmitPostAction,
  onVideoOpen,
  openDays,
  overview,
  selectedUploadVideos,
  setSelectedUploadVideos,
  setUploadActivities,
  setUploadErrors,
  uploadActivities,
  uploadErrors,
  uploadFileInputRefs,
  uploadPrimaryInputRefs,
  uploadSectionRefs,
}: {
  claimEditorReplacementTargets: Record<string, string | null>;
  commonLabels: AppDictionary["common"];
  expandedClaimEditors: Record<string, boolean>;
  focusedClaimEditor: FocusedClaimEditorState;
  labels: DashboardLabels;
  locale: Locale;
  onClearReplacementTarget: (challengeDate: string) => void;
  onFocusClaimEditor: (challengeDate: string, options?: { openFilePicker?: boolean; replaceVideoId?: string | null }) => void;
  onSubmitPostAction: (action: string, fields: Record<string, string>) => void;
  onVideoOpen: (videoId: string) => void;
  openDays: OpenDay[];
  overview: OverviewSummary;
  selectedUploadVideos: Record<string, SelectedUploadVideo[]>;
  setSelectedUploadVideos: Dispatch<SetStateAction<Record<string, SelectedUploadVideo[]>>>;
  setUploadActivities: Dispatch<SetStateAction<Record<string, UploadActivity | null>>>;
  setUploadErrors: Dispatch<SetStateAction<Record<string, string | null>>>;
  uploadActivities: Record<string, UploadActivity | null>;
  uploadErrors: Record<string, string | null>;
  uploadFileInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  uploadPrimaryInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  uploadSectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  const renderedOpenDays = openDays.filter(
    (day) => day.showByDefault || expandedClaimEditors[day.challengeDate],
  );

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

  return (
    <section className="fc-section fc-rise" id="uploads">
      <SectionHeader title={labels.uploads.title} />
      <div className="grid gap-4">
        {renderedOpenDays.length > 0 ? (
          renderedOpenDays.map((day) => (
            <article
              className={`fc-card ${focusedClaimEditor?.challengeDate === day.challengeDate ? "is-focused-claim" : ""}`}
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
                        <p className="mt-1 fc-text-muted">{day.targetReps} {labels.uploads.targetSuffix}</p>
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
                      <div className="mt-4 fc-info-box">
                        <p className="fc-meta-label">{labels.timeline.reviewFeedback}</p>
                        {day.reviewerSummaryLabel ? (
                          <p className="mt-2 fc-text-emphasis">
                            {labels.timeline.reviewedBySummary} {day.reviewerSummaryLabel}
                          </p>
                        ) : null}
                        <div className="mt-2 grid gap-3">
                          {day.reviewNotes.map((reviewNote) => (
                            <div key={reviewNote.id}>
                              <p className="fc-text-emphasis">
                                {reviewNote.stageLabel} · {labels.timeline.reviewedBy} {reviewNote.reviewerLabel}
                              </p>
                              <p className="mt-1 fc-text-secondary">{reviewNote.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : day.reviewerSummaryLabel ? (
                      <div className="mt-4 fc-info-box">
                        <p className="fc-meta-label">{labels.timeline.reviewFeedback}</p>
                        <p className="mt-2 fc-text-emphasis">
                          {labels.timeline.reviewedBySummary} {day.reviewerSummaryLabel}
                        </p>
                      </div>
                    ) : null}
                    {day.isEditableClaim && day.hasExistingClaim ? (
                      <div className="mt-4 fc-info-box">
                        <p className="fc-text-secondary">
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
                      <p className="fc-text-muted">{overview.isLightParticipant ? labels.uploads.lightHint : labels.uploads.fullHint}</p>
                      <div className={`grid gap-3 ${overview.isLightParticipant ? "sm:grid-cols-1" : "sm:grid-cols-[1.1fr_0.9fr]"}`}>
                        {!overview.isLightParticipant ? (
                          <div className="space-y-3">
                            {replacementVideo ? (
                              <div className="fc-info-box">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="fc-meta-label">
                                      {labels.uploads.replaceVideoLabel}
                                    </p>
                                    <p className="mt-1 fc-text-secondary">
                                      {replacementVideo.originalName}
                                    </p>
                                    <p className="mt-1 fc-text-muted">
                                      {labels.uploads.replaceVideoHint}
                                    </p>
                                  </div>
                                  <DashboardActionButton
                                    disabled={isUploading}
                                    onClick={() => onClearReplacementTarget(day.challengeDate)}
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
                            <p className="fc-text-muted">{labels.uploads.compressionHint.replace("{size}", String(TARGET_UPLOAD_VIDEO_MB))}</p>
                            {day.videos.length > 0 ? (
                              <div className="grid gap-2">
                                <p className="fc-meta-label">
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
                                        onClick={() => onVideoOpen(video.id)}
                                        type="button"
                                      >
                                        {commonLabels.open}
                                      </DashboardActionButton>
                                      {day.isEditableClaim ? (
                                        <>
                                          <DashboardActionButton
                                            disabled={isUploading}
                                            onClick={() =>
                                              onFocusClaimEditor(day.challengeDate, {
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
                                              onSubmitPostAction("/api/videos/delete", {
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
                                <p className="fc-meta-label">{labels.uploads.videoNames}</p>
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
                        <div className="fc-info-box">
                          <p className="fc-text-secondary">{uploadActivityMessage}</p>
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
                              onSubmitPostAction("/api/submissions/delete", {
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
                          <summary className="cursor-pointer fc-text-emphasis">{labels.uploads.sicknessToggle}</summary>
                          <form action="/api/challenge/sickness" className="mt-4 space-y-4" method="post">
                            <input name="challengeDate" type="hidden" value={day.challengeDate} />
                            <label className="flex items-start gap-3 fc-text-muted"><input className="mt-1" name="consent" type="checkbox" /><span>{labels.uploads.sicknessConsent}</span></label>
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
        ) : <div className="fc-card fc-text-muted">{labels.uploads.empty}</div>}
      </div>
    </section>
  );
}
