"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import type { AppDictionary } from "@/i18n";
import type { TimelineEntry } from "@/components/fitcal/dashboard-types";
import { DashboardSectionHeader } from "@/components/fitcal/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";
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
  timelineEntries,
  onVideoReplaceSelection,
}: {
  commonLabels: AppDictionary["common"];
  labels: AppDictionary["dashboard"];
  timelineEntries: TimelineEntry[];
  onVideoReplaceSelection: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [selectedTimelineDate, setSelectedTimelineDate] = useState(
    timelineEntries[0]?.challengeDate ?? "",
  );

  const activeTimelineDate = useMemo(
    () =>
      timelineEntries.some((entry) => entry.challengeDate === selectedTimelineDate)
        ? selectedTimelineDate
        : (timelineEntries[0]?.challengeDate ?? ""),
    [selectedTimelineDate, timelineEntries],
  );

  const selectedTimelineEntry = useMemo(
    () =>
      timelineEntries.find((entry) => entry.challengeDate === activeTimelineDate) ??
      timelineEntries[0] ??
      null,
    [activeTimelineDate, timelineEntries],
  );

  const recentTimelineEntries = timelineEntries.slice(0, 3);
  const compactSetSummary =
    selectedTimelineEntry != null
      ? `${selectedTimelineEntry.pushupSet1 ?? 0};${selectedTimelineEntry.pushupSet2 ?? 0}/${selectedTimelineEntry.situpSet1 ?? 0};${selectedTimelineEntry.situpSet2 ?? 0}`
      : "";
  const compactCountSummary =
    selectedTimelineEntry?.verifiedPushupTotal != null &&
    selectedTimelineEntry.verifiedSitupTotal != null
      ? `${labels.timeline.countsPrefix} ${selectedTimelineEntry.verifiedPushupTotal}/${selectedTimelineEntry.verifiedSitupTotal}`
      : null;

  return (
    <section className="fc-section fc-rise" data-fitcal-section id="timeline">
      <DashboardSectionHeader title={labels.timeline.title} />
      {selectedTimelineEntry ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid min-w-0 gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {recentTimelineEntries.map((day) => (
                <button
                  className={`text-left transition-colors ${selectedTimelineEntry.challengeDate === day.challengeDate ? "border-[var(--fc-accent)] shadow-[0_0_0_1px_var(--fc-accent)]" : ""}`}
                  key={day.challengeDate}
                  onClick={() => setSelectedTimelineDate(day.challengeDate)}
                  type="button"
                >
                  <Card className="h-full p-5">
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
                  </Card>
                </button>
              ))}
            </div>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-[0.18em]">
                  {labels.timeline.catalogTitle}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
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
              </CardContent>
            </Card>
          </div>

          <Card className="min-w-0">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{selectedTimelineEntry.dateLabel}</CardTitle>
                    <span className="fc-tag">{selectedTimelineEntry.statusLabel}</span>
                    {selectedTimelineEntry.reviewStatusLabel ? (
                      <span className="fc-chip fc-chip-muted">{selectedTimelineEntry.reviewStatusLabel}</span>
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
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedTimelineEntry.pushupTotal != null &&
              selectedTimelineEntry.situpTotal != null ? (
                <div className="rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--fc-ink)]">
                    {compactSetSummary}
                    {compactCountSummary ? (
                      <span className="text-[var(--fc-muted)]"> · {compactCountSummary}</span>
                    ) : null}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--fc-muted)]">{labels.timeline.noEntry}</p>
              )}

              {((selectedTimelineEntry.pushupOverTarget ?? 0) > 0 ||
                (selectedTimelineEntry.situpOverTarget ?? 0) > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {(selectedTimelineEntry.pushupOverTarget ?? 0) > 0 ? (
                    <span className="fc-chip fc-chip-accent">
                      +{selectedTimelineEntry.pushupOverTarget} {labels.timeline.pushupOverTarget}
                    </span>
                  ) : null}
                  {(selectedTimelineEntry.situpOverTarget ?? 0) > 0 ? (
                    <span className="fc-chip fc-chip-accent">
                      +{selectedTimelineEntry.situpOverTarget} {labels.timeline.situpOverTarget}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {(selectedTimelineEntry.notes || selectedTimelineEntry.reviewNotes.length > 0) ? (
                <Separator className="bg-[var(--fc-border)]" />
              ) : null}

              {selectedTimelineEntry.notes ? (
                <div className="rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">
                    {labels.timeline.workoutNote}
                  </p>
                  <p className="mt-2 text-sm text-[var(--fc-ink-secondary)]">{selectedTimelineEntry.notes}</p>
                </div>
              ) : null}

              {selectedTimelineEntry.reviewNotes.length > 0 ? (
                <div className="rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">
                    {labels.timeline.reviewFeedback}
                  </p>
                  <div className="mt-2 grid gap-3">
                    {selectedTimelineEntry.reviewNotes.map((reviewNote) => (
                      <div key={reviewNote.id}>
                        <p className="text-sm font-medium text-[var(--fc-ink)]">
                          {labels.timeline.reviewedBy} {reviewNote.reviewerLabel}
                        </p>
                        <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">
                          {reviewNote.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Separator className="bg-[var(--fc-border)]" />

              {selectedTimelineEntry.videos.length ? (
                <div className="grid gap-2">
                  {selectedTimelineEntry.videos.map((video) => (
                    <div className="fc-video-row" key={video.id}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{video.originalName}</p>
                        <p className="text-xs text-[var(--fc-muted)]">{video.sizeLabel}</p>
                      </div>
                      <div className="fc-video-actions">
                        <Button asChild className="fc-video-button" size="sm" variant="ghost">
                          <a href={`/api/videos/${video.id}`} target="_blank">
                            {commonLabels.open}
                          </a>
                        </Button>
                        <form
                          action="/api/videos/replace"
                          className="fc-video-replace-form"
                          encType="multipart/form-data"
                          method="post"
                        >
                          <input name="videoId" type="hidden" value={video.id} />
                          <label
                            className="fc-video-action-button"
                            htmlFor={`replacement-video-${video.id}`}
                          >
                            {labels.timeline.videoReplace}
                          </label>
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
                        <form action="/api/videos/delete" method="post">
                          <input name="videoId" type="hidden" value={video.id} />
                          <Button className="fc-video-button" size="sm" type="submit" variant="secondary">
                            {labels.timeline.videoDelete}
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--fc-muted)]">{labels.timeline.noVideos}</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-5 text-sm text-[var(--fc-muted)]">{labels.timeline.noEntry}</Card>
      )}
    </section>
  );
}
