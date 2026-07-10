"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import type { AppDictionary } from "@/i18n";
import type { TimelineEntry } from "@/components/fitcal/dashboard-types";
import {
  DashboardActionButton,
  DashboardActionCluster,
  DashboardSectionHeader,
  DashboardStatusBadge,
} from "@/components/fitcal/dashboard/dashboard-primitives";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function DashboardHistorySection({
  commonLabels,
  labels,
  onClaimEdit,
  onClaimAddVideos,
  onEditableVideoReplace,
  timelineEntries,
  onVideoReplaceSelection,
  readOnly = false,
  initialTimelineDate,
}: {
  commonLabels: AppDictionary["common"];
  labels: AppDictionary["dashboard"];
  onClaimEdit: (challengeDate: string) => void;
  onClaimAddVideos: (challengeDate: string) => void;
  onEditableVideoReplace: (challengeDate: string, videoId: string) => void;
  timelineEntries: TimelineEntry[];
  onVideoReplaceSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  initialTimelineDate?: string;
}) {
  const [selectedTimelineDate, setSelectedTimelineDate] = useState(() =>
    timelineEntries.some((entry) => entry.challengeDate === initialTimelineDate)
      ? initialTimelineDate!
      : (timelineEntries[0]?.challengeDate ?? ""),
  );
  const [timelineSearch, setTimelineSearch] = useState("");
  const filteredTimelineEntries = useMemo(() => {
    const query = timelineSearch.trim().toLocaleLowerCase();
    if (!query) return timelineEntries;
    return timelineEntries.filter((entry) =>
      [
        entry.challengeDate,
        entry.dateLabel,
        entry.notes ?? "",
        ...entry.extraEntries.map((extra) => extra.categoryName),
      ].some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [timelineEntries, timelineSearch]);

  function selectTimelineDate(challengeDate: string) {
    setSelectedTimelineDate(challengeDate);
    const url = new URL(window.location.href);
    url.searchParams.set("timelineDate", challengeDate);
    url.hash = "timeline";
    window.history.replaceState(null, "", url);
  }

  const activeTimelineDate = useMemo(
    () =>
      filteredTimelineEntries.some((entry) => entry.challengeDate === selectedTimelineDate)
        ? selectedTimelineDate
        : (filteredTimelineEntries[0]?.challengeDate ?? ""),
    [filteredTimelineEntries, selectedTimelineDate],
  );

  const selectedTimelineEntry = useMemo(
    () =>
      filteredTimelineEntries.find((entry) => entry.challengeDate === activeTimelineDate) ??
      filteredTimelineEntries[0] ??
      null,
    [activeTimelineDate, filteredTimelineEntries],
  );

  const recentTimelineEntries = filteredTimelineEntries.slice(0, 3);
  const quickTimelineEntries = filteredTimelineEntries.slice(0, 14);
  const olderTimelineEntries = filteredTimelineEntries.slice(14);
  const compactSetSummary =
    selectedTimelineEntry != null
      ? `${selectedTimelineEntry.pushupSets.join("; ") || "0"} / ${selectedTimelineEntry.situpSets.join("; ") || "0"}`
      : "";
  const compactCountSummary =
    selectedTimelineEntry?.verifiedPushupTotal != null &&
    selectedTimelineEntry.verifiedSitupTotal != null
      ? `${labels.timeline.countsPrefix} ${selectedTimelineEntry.verifiedPushupTotal}/${selectedTimelineEntry.verifiedSitupTotal}`
      : null;
  const deletingLastVideoRemovesClaim =
    selectedTimelineEntry?.deletingLastVideoRemovesClaim ?? false;

  function scrollToClaimEditor(challengeDate: string) {
    onClaimEdit(challengeDate);
  }

  function openVideo(videoId: string) {
    window.open(`/api/videos/${videoId}`, "_blank", "noopener,noreferrer");
  }

  function chooseReplacementVideo(videoId: string) {
    document.getElementById(`replacement-video-${videoId}`)?.click();
  }

  return (
    <section className="fc-section fc-rise" id="timeline">
      <DashboardSectionHeader title={labels.timeline.title} />
      <label className="fc-input-group max-w-xl">
        <span className="fc-input-label">{labels.timeline.searchLabel}</span>
        <input
          className="fc-input"
          onChange={(event) => setTimelineSearch(event.target.value)}
          placeholder={labels.timeline.searchPlaceholder}
          type="search"
          value={timelineSearch}
        />
      </label>
      {selectedTimelineEntry ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid min-w-0 gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {recentTimelineEntries.map((day) => (
                <button
                  className={`text-left transition-colors ${selectedTimelineEntry.challengeDate === day.challengeDate ? "border-[var(--fc-accent)] shadow-[0_0_0_1px_var(--fc-accent)]" : ""}`}
                  key={day.challengeDate}
                  onClick={() => selectTimelineDate(day.challengeDate)}
                  type="button"
                >
                  <Card className="h-full p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{day.dateLabel}</p>
                      <DashboardStatusBadge tone="warm">{day.statusLabel}</DashboardStatusBadge>
                    </div>
                    <p className="mt-2 fc-meta-label">
                      {labels.timeline.recentTitle}
                    </p>
                    {day.pushupTotal != null && day.situpTotal != null ? (
                      <p className="mt-1 text-sm text-[var(--fc-ink)]">
                        {day.pushupTotal} / {day.situpTotal}
                      </p>
                    ) : (
                      <p className="mt-1 fc-text-muted">{labels.timeline.noEntry}</p>
                    )}
                  </Card>
                </button>
              ))}
            </div>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <CardDescription className="fc-meta-label">
                  {labels.timeline.catalogTitle}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
                  {quickTimelineEntries.map((day) => (
                    <button
                      className={`shrink-0 rounded-[var(--fc-radius-sm)] border px-3 py-2 text-left text-sm transition-colors ${
                        selectedTimelineEntry.challengeDate === day.challengeDate
                          ? "border-[var(--fc-accent)] bg-[var(--fc-accent-soft)] text-[var(--fc-ink)]"
                          : "border-[var(--fc-border)] bg-[var(--fc-bg-raised)] text-[var(--fc-muted)] hover:text-[var(--fc-ink)]"
                      }`}
                      key={day.challengeDate}
                      onClick={() => selectTimelineDate(day.challengeDate)}
                      type="button"
                    >
                      <span className="block font-medium">{day.dateLabel}</span>
                      <span className="mt-1 block text-xs">{day.statusLabel}</span>
                    </button>
                  ))}
                </div>
                {olderTimelineEntries.length ? (
                  <label className="mt-3 block fc-input-group">
                    <span className="fc-input-label">{labels.timeline.olderSelectLabel}</span>
                    <select
                      className="fc-input"
                      onChange={(event) => {
                        if (event.target.value) {
                          selectTimelineDate(event.target.value);
                        }
                      }}
                      value={
                        olderTimelineEntries.some(
                          (day) => day.challengeDate === selectedTimelineEntry.challengeDate,
                        )
                          ? selectedTimelineEntry.challengeDate
                          : ""
                      }
                    >
                      <option value="">{labels.timeline.olderSelectPlaceholder}</option>
                      {olderTimelineEntries.map((day) => (
                        <option key={day.challengeDate} value={day.challengeDate}>
                          {day.dateLabel} - {day.statusLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{selectedTimelineEntry.dateLabel}</CardTitle>
                    <DashboardStatusBadge tone="warm">
                      {selectedTimelineEntry.statusLabel}
                    </DashboardStatusBadge>
                    {selectedTimelineEntry.reviewStatusLabel ? (
                      <DashboardStatusBadge>
                        {selectedTimelineEntry.reviewStatusLabel}
                      </DashboardStatusBadge>
                    ) : null}
                  </div>
                  <CardDescription className="mt-1">
                    {labels.timeline.targetPrefix} {selectedTimelineEntry.repsTarget} {labels.timeline.perExercise}
                  </CardDescription>
                </div>
                {selectedTimelineEntry.debtLabel ? (
                  <p className="text-sm font-medium text-[var(--fc-warm)]">{selectedTimelineEntry.debtLabel}</p>
                ) : null}
              </div>
              {!readOnly &&
              selectedTimelineEntry.status === "slack" &&
              selectedTimelineEntry.canUsePaidRecoveryActions ? (
                <div className="mt-3 grid gap-3">
                  <form action="/api/challenge/joker" method="post">
                    <input
                      name="challengeDate"
                      type="hidden"
                      value={selectedTimelineEntry.challengeDate}
                    />
                    <DashboardActionButton
                      disabled={!selectedTimelineEntry.canUseJoker}
                      type="submit"
                    >
                      {labels.uploads.useJoker}
                    </DashboardActionButton>
                  </form>
                  <details className="rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3">
                    <summary className="cursor-pointer fc-text-emphasis">{labels.uploads.sicknessToggle}</summary>
                    <form action="/api/challenge/sickness" className="mt-4 space-y-4" method="post">
                      <input
                        name="challengeDate"
                        type="hidden"
                        value={selectedTimelineEntry.challengeDate}
                      />
                      <input
                        name="startDate"
                        type="hidden"
                        value={selectedTimelineEntry.challengeDate}
                      />
                      <input
                        name="endDate"
                        type="hidden"
                        value={selectedTimelineEntry.challengeDate}
                      />
                      <label className="flex items-start gap-3 fc-text-muted">
                        <input className="mt-1" name="consent" type="checkbox" />
                        <span>{labels.uploads.sicknessConsent}</span>
                      </label>
                      <label className="fc-input-group">
                        <span className="fc-input-label">{labels.uploads.comment}</span>
                        <textarea className="fc-input min-h-20" name="notes" placeholder={labels.uploads.notes} />
                      </label>
                      <DashboardActionButton type="submit">
                        {labels.uploads.submitSickness}
                      </DashboardActionButton>
                    </form>
                  </details>
                </div>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedTimelineEntry.pushupTotal != null &&
              selectedTimelineEntry.situpTotal != null ? (
                <div className="flex flex-wrap items-center justify-between gap-3 fc-info-box">
                  <p className="fc-text-emphasis">
                    {compactSetSummary}
                    {compactCountSummary ? (
                      <span className="text-[var(--fc-muted)]"> · {compactCountSummary}</span>
                    ) : null}
                  </p>
                  {!readOnly && selectedTimelineEntry.isEditableClaim ? (
                    <DashboardActionCluster>
                      <DashboardActionButton
                        onClick={() => scrollToClaimEditor(selectedTimelineEntry.challengeDate)}
                        type="button"
                      >
                        {labels.timeline.claimEdit}
                      </DashboardActionButton>
                      {selectedTimelineEntry.canAddVideos ? (
                        <DashboardActionButton
                          onClick={() => onClaimAddVideos(selectedTimelineEntry.challengeDate)}
                          type="button"
                        >
                          {labels.timeline.videoAdd}
                        </DashboardActionButton>
                      ) : null}
                      <form
                        action="/api/submissions/delete"
                        method="post"
                        onSubmit={(event) => {
                          if (!window.confirm(labels.timeline.confirmClaimDelete)) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input
                          name="challengeDate"
                          type="hidden"
                          value={selectedTimelineEntry.challengeDate}
                        />
                        <DashboardActionButton type="submit" variant="danger">
                          {labels.timeline.claimDelete}
                        </DashboardActionButton>
                      </form>
                    </DashboardActionCluster>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 fc-info-box">
                  <p className="fc-text-muted">{labels.timeline.noEntry}</p>
                  {!readOnly && selectedTimelineEntry.canCreateClaim ? (
                    <DashboardActionButton
                      onClick={() => scrollToClaimEditor(selectedTimelineEntry.challengeDate)}
                      type="button"
                    >
                      {labels.timeline.claimEdit}
                    </DashboardActionButton>
                  ) : null}
                </div>
              )}

              {((selectedTimelineEntry.pushupOverTarget ?? 0) > 0 ||
                (selectedTimelineEntry.situpOverTarget ?? 0) > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {(selectedTimelineEntry.pushupOverTarget ?? 0) > 0 ? (
                    <DashboardStatusBadge tone="accent">
                      +{selectedTimelineEntry.pushupOverTarget} {labels.timeline.pushupOverTarget}
                    </DashboardStatusBadge>
                  ) : null}
                  {(selectedTimelineEntry.situpOverTarget ?? 0) > 0 ? (
                    <DashboardStatusBadge tone="accent">
                      +{selectedTimelineEntry.situpOverTarget} {labels.timeline.situpOverTarget}
                    </DashboardStatusBadge>
                  ) : null}
                </div>
              ) : null}

              {(selectedTimelineEntry.notes ||
                selectedTimelineEntry.reviewNotes.length > 0 ||
                selectedTimelineEntry.reviewerSummaryLabel) ? (
                <Separator className="bg-[var(--fc-border)]" />
              ) : null}

              {selectedTimelineEntry.notes ? (
                <div className="fc-info-box">
                  <p className="fc-meta-label">
                    {labels.timeline.workoutNote}
                  </p>
                  <p className="mt-2 fc-text-secondary">{selectedTimelineEntry.notes}</p>
                </div>
              ) : null}

              {selectedTimelineEntry.reviewNotes.length > 0 ? (
                <div className="fc-info-box">
                  <p className="fc-meta-label">
                    {labels.timeline.reviewFeedback}
                  </p>
                  {selectedTimelineEntry.reviewerSummaryLabel ? (
                    <p className="mt-2 fc-text-emphasis">
                      {labels.timeline.reviewedBySummary} {selectedTimelineEntry.reviewerSummaryLabel}
                    </p>
                  ) : null}
                  <div className="mt-2 grid gap-3">
                    {selectedTimelineEntry.reviewNotes.map((reviewNote) => (
                      <div key={reviewNote.id}>
                        <p className="fc-text-emphasis">
                          {reviewNote.stageLabel} · {labels.timeline.reviewedBy} {reviewNote.reviewerLabel}
                        </p>
                        <p className="mt-1 fc-text-secondary">
                          {reviewNote.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedTimelineEntry.reviewerSummaryLabel ? (
                <div className="fc-info-box">
                  <p className="fc-meta-label">
                    {labels.timeline.reviewFeedback}
                  </p>
                  <p className="mt-2 fc-text-emphasis">
                    {labels.timeline.reviewedBySummary} {selectedTimelineEntry.reviewerSummaryLabel}
                  </p>
                </div>
              ) : null}

              <Separator className="bg-[var(--fc-border)]" />

              {selectedTimelineEntry.videos.length ? (
                <div className="grid gap-2">
                  {!readOnly && selectedTimelineEntry.canAddVideos ? (
                    <DashboardActionCluster>
                      <DashboardActionButton
                        onClick={() => onClaimAddVideos(selectedTimelineEntry.challengeDate)}
                        type="button"
                      >
                        {labels.timeline.videoAdd}
                      </DashboardActionButton>
                    </DashboardActionCluster>
                  ) : null}
                  {selectedTimelineEntry.videos.map((video) => (
                    <div className="fc-video-row" key={video.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{video.originalName}</p>
                        <p className="text-xs text-[var(--fc-muted)]">{video.sizeLabel}</p>
                      </div>
                      <DashboardActionCluster>
                        <DashboardActionButton onClick={() => openVideo(video.id)} type="button">
                          {commonLabels.open}
                        </DashboardActionButton>
                        {!readOnly && selectedTimelineEntry.isEditableClaim ? (
                          <DashboardActionButton
                            onClick={() =>
                              onEditableVideoReplace(
                                selectedTimelineEntry.challengeDate,
                                video.id,
                              )
                            }
                            type="button"
                          >
                            {labels.timeline.videoReplace}
                          </DashboardActionButton>
                        ) : !readOnly ? (
                          <form
                            action="/api/videos/replace"
                            encType="multipart/form-data"
                            method="post"
                          >
                            <input name="videoId" type="hidden" value={video.id} />
                            <DashboardActionButton
                              onClick={() => chooseReplacementVideo(video.id)}
                              type="button"
                            >
                              {labels.timeline.videoReplace}
                            </DashboardActionButton>
                            <input
                              accept="video/*"
                              className="sr-only"
                              id={`replacement-video-${video.id}`}
                              name="replacementVideo"
                              onChange={onVideoReplaceSelection}
                              required
                              type="file"
                            />
                          </form>
                        ) : null}
                        {!readOnly ? <form
                          action="/api/videos/delete"
                          method="post"
                          onSubmit={(event) => {
                            if (!window.confirm(labels.timeline.confirmVideoDelete)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <input name="videoId" type="hidden" value={video.id} />
                          <DashboardActionButton type="submit" variant="danger">
                            {labels.timeline.videoDelete}
                          </DashboardActionButton>
                        </form> : null}
                      </DashboardActionCluster>
                    </div>
                  ))}
                  {deletingLastVideoRemovesClaim && !selectedTimelineEntry.isEditableClaim ? (
                    <DashboardStatusBadge tone="warm">
                      {labels.timeline.deleteRemovesClaim}
                    </DashboardStatusBadge>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-2">
                  <p className="text-xs text-[var(--fc-muted)]">{labels.timeline.noVideos}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-5 fc-text-muted">
          {timelineSearch ? labels.timeline.noSearchResults : labels.timeline.noEntry}
        </Card>
      )}
    </section>
  );
}
