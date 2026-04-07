"use client";

import { useMemo, useState } from "react";
import type { AppDictionary } from "@/i18n";
import type {
  EscalationReviewItem,
  ParticipantRow,
  PrimaryReviewItem,
  SicknessReviewItem,
} from "@/components/fitcal/dashboard-types";
import { DashboardSectionHeader, DashboardStatBox } from "@/components/fitcal/dashboard/dashboard-primitives";
import { ReviewVideoPlayer } from "@/components/fitcal/dashboard/review-video-player";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ReviewSubtabKey = "progress" | "pending";

function isCompletedLikeStatus(status: ParticipantRow["todayStatus"]) {
  return ["completed", "partial", "joker", "sick"].includes(status);
}

export function DashboardReviewSection({
  commonLabels,
  labels,
  participantRows,
  primaryReviewItems,
  escalationReviewItems,
  sicknessReviewItems,
}: {
  commonLabels: AppDictionary["common"];
  labels: AppDictionary["dashboard"];
  participantRows: ParticipantRow[];
  primaryReviewItems: PrimaryReviewItem[];
  escalationReviewItems: EscalationReviewItem[];
  sicknessReviewItems: SicknessReviewItem[];
}) {
  const [reviewSubtab, setReviewSubtab] = useState<ReviewSubtabKey>("progress");

  const reviewParticipants = participantRows;
  const reviewSelfRow = useMemo(
    () => reviewParticipants.find((row) => row.isSelf) ?? null,
    [reviewParticipants],
  );
  const activeTodayCount = useMemo(
    () => reviewParticipants.filter((row) => isCompletedLikeStatus(row.todayStatus)).length,
    [reviewParticipants],
  );
  const qualifiedCount = useMemo(
    () =>
      reviewParticipants.filter(
        (row) => row.qualificationUploads >= row.qualificationRequiredUploads,
      ).length,
    [reviewParticipants],
  );
  const openReviewCount = useMemo(
    () => reviewParticipants.reduce((sum, row) => sum + (row.isSelf ? 0 : row.pendingReviewCount), 0),
    [reviewParticipants],
  );

  return (
    <section className="fc-section fc-rise" data-fitcal-section id="review">
      <DashboardSectionHeader
        title={labels.review.title}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setReviewSubtab("progress")}
              size="sm"
              type="button"
              variant={reviewSubtab === "progress" ? "default" : "secondary"}
            >
              {labels.reviewSubtabs.progress}
            </Button>
            <Button
              onClick={() => setReviewSubtab("pending")}
              size="sm"
              type="button"
              variant={reviewSubtab === "pending" ? "default" : "secondary"}
            >
              {labels.reviewSubtabs.pending}
            </Button>
          </div>
        }
      />

      {reviewSubtab === "progress" ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-5"><DashboardStatBox label={labels.review.summary.participants} value={reviewParticipants.length} /></CardContent></Card>
            <Card><CardContent className="p-5"><DashboardStatBox label={labels.review.summary.activeToday} value={activeTodayCount} /></CardContent></Card>
            <Card><CardContent className="p-5"><DashboardStatBox label={labels.review.summary.qualified} value={qualifiedCount} /></CardContent></Card>
            <Card><CardContent className="p-5"><DashboardStatBox label={labels.review.summary.pendingReviews} value={openReviewCount} /></CardContent></Card>
          </div>

          {reviewSelfRow ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{reviewSelfRow.name}</CardTitle>
                      <span className="fc-chip fc-chip-accent">{labels.review.you}</span>
                      <span className="fc-chip fc-chip-muted">{reviewSelfRow.modeLabel}</span>
                    </div>
                    <CardDescription className="mt-1">{labels.review.selfHint}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="fc-chip fc-chip-muted">{labels.review.todayStat} {reviewSelfRow.todayLabel}</span>
                    <span className="fc-chip fc-chip-muted">{labels.review.yesterdayStat} {reviewSelfRow.yesterdayLabel}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  <DashboardStatBox label={labels.review.stats.totalPushups} value={reviewSelfRow.totalPushups} />
                  <DashboardStatBox label={labels.review.stats.totalSitups} value={reviewSelfRow.totalSitups} />
                  <DashboardStatBox label={labels.review.stats.days} value={reviewSelfRow.documentedDays} />
                  <DashboardStatBox label={labels.review.stats.qualification} value={reviewSelfRow.qualificationLabel} />
                  <DashboardStatBox label={labels.review.stats.debt} value={reviewSelfRow.debtLabel ?? labels.participantReview.off} />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3 md:hidden">
            {reviewParticipants.map((row) => (
              <Card key={row.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{row.name}</CardTitle>
                        {row.isSelf ? <span className="fc-chip fc-chip-accent">{labels.review.you}</span> : null}
                        <span className="fc-chip fc-chip-muted">{row.modeLabel}</span>
                      </div>
                      <CardDescription className="mt-1">
                        {labels.review.todayStat} {row.todayLabel} · {labels.review.yesterdayStat} {row.yesterdayLabel}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <DashboardStatBox label={labels.review.stats.totalPushups} value={row.totalPushups} />
                    <DashboardStatBox label={labels.review.stats.totalSitups} value={row.totalSitups} />
                    <DashboardStatBox label={labels.review.stats.days} value={row.documentedDays} />
                    <DashboardStatBox label={labels.review.stats.qualification} value={row.qualificationLabel} />
                    <DashboardStatBox label={labels.review.stats.debt} value={row.debtLabel ?? labels.participantReview.off} />
                    <DashboardStatBox label={labels.review.stats.reviews} value={row.isSelf ? labels.review.selfReviewDisabled : row.reviewLabel} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-x-auto md:block">
            <CardContent className="p-5">
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
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="fc-heading text-lg">{labels.review.sicknessTitle}</h3>
              <span className="fc-chip fc-chip-muted">{sicknessReviewItems.length} {labels.review.openCount}</span>
            </div>
            {sicknessReviewItems.length ? sicknessReviewItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.userLabel} · {item.dateLabel}</CardTitle>
                  <CardDescription>{labels.review.sicknessBody}</CardDescription>
                  {item.notes ? <p className="mt-2 text-sm text-[var(--fc-muted)]">{labels.review.commentPrefix} {item.notes}</p> : null}
                </CardHeader>
                <CardContent>
                  <form action="/api/challenge/sickness-reviews" className="space-y-4" method="post">
                    <input name="verificationId" type="hidden" value={item.id} />
                    <label className="fc-input-group"><span className="fc-input-label">{labels.review.commentLabel}</span><textarea className="fc-input min-h-20" name="notes" placeholder={commonLabels.optional} /></label>
                    <div className="flex flex-wrap gap-3">
                      <Button name="decision" type="submit" value="approve">{labels.review.approveSickness}</Button>
                      <Button name="decision" type="submit" value="reject" variant="secondary">{labels.review.rejectSickness}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )) : <Card className="p-5 text-sm text-[var(--fc-muted)]">{labels.review.noSickness}</Card>}
          </div>

          <Separator className="bg-[var(--fc-border)]" />

          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="fc-heading text-lg">{labels.review.primaryTitle}</h3>
              <span className="fc-chip fc-chip-muted">{primaryReviewItems.length} {labels.review.openCount}</span>
            </div>
            {primaryReviewItems.length ? primaryReviewItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.userLabel} · {item.dateLabel}</CardTitle>
                  <CardDescription>
                    {labels.review.claimPrefix} {item.claimedPushups} / {item.claimedSitups} · {labels.review.targetPrefix} {item.targetReps}
                  </CardDescription>
                  {item.statusLabel ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{item.statusLabel}</p> : null}
                  {item.workoutNote ? (
                    <div className="mt-3 rounded-[var(--fc-radius-sm)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">{labels.review.workoutNote}</p>
                      <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">{item.workoutNote}</p>
                    </div>
                  ) : null}
                  {item.priorNote ? <p className="mt-2 text-sm text-[var(--fc-muted)]">{item.priorNote}</p> : null}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.videos.map((video) => (
                      <ReviewVideoPlayer key={video.id} videoId={video.id} />
                    ))}
                  </div>
                  <form action="/api/workout-reviews" className="mt-5 space-y-4" method="post">
                    <input name="submissionId" type="hidden" value={item.id} />
                    <input name="mode" type="hidden" value="primary" />
                    <div className="fc-grid-2">
                      <label className="fc-input-group"><span className="fc-input-label">{labels.review.countedPushups}</span><input className="fc-input" defaultValue={item.claimedPushups} min="0" name="countedPushups" type="number" /></label>
                      <label className="fc-input-group"><span className="fc-input-label">{labels.review.countedSitups}</span><input className="fc-input" defaultValue={item.claimedSitups} min="0" name="countedSitups" type="number" /></label>
                    </div>
                    <label className="fc-input-group"><span className="fc-input-label">{labels.review.feedback}</span><textarea className="fc-input min-h-20" name="notes" placeholder={commonLabels.optional} /></label>
                    <div className="flex flex-wrap gap-3">
                      <Button name="decision" type="submit" value="approve">{labels.review.approveWorkout}</Button>
                      <Button name="decision" type="submit" value="adjust" variant="secondary">{labels.review.adjustWorkout}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )) : <Card className="p-5 text-sm text-[var(--fc-muted)]">{labels.review.noPrimary}</Card>}
          </div>

          <Separator className="bg-[var(--fc-border)]" />

          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="fc-heading text-lg">{labels.review.escalationTitle}</h3>
              <span className="fc-chip fc-chip-muted">{escalationReviewItems.length} {labels.review.openCount}</span>
            </div>
            {escalationReviewItems.length ? escalationReviewItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.userLabel} · {item.dateLabel}</CardTitle>
                  <CardDescription>
                    {labels.review.claimPrefix} {item.claimedPushups} / {item.claimedSitups} · {labels.review.targetPrefix} {item.targetReps}
                  </CardDescription>
                  {item.workoutNote ? (
                    <div className="mt-3 rounded-[var(--fc-radius-sm)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">{labels.review.workoutNote}</p>
                      <p className="mt-1 text-sm text-[var(--fc-ink-secondary)]">{item.workoutNote}</p>
                    </div>
                  ) : null}
                  <p className="mt-2 text-sm text-[var(--fc-muted)]">{item.reviewerLabel} {labels.review.countsLabel} {item.reviewedPushups} / {item.reviewedSitups}.</p>
                  {item.reviewComment ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{labels.review.commentPrefix} {item.reviewComment}</p> : null}
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.videos.map((video) => (
                      <ReviewVideoPlayer key={video.id} videoId={video.id} />
                    ))}
                  </div>
                  <form action="/api/workout-reviews" className="mt-5 space-y-4" method="post">
                    <input name="submissionId" type="hidden" value={item.id} />
                    <input name="mode" type="hidden" value="arbitration" />
                    <label className="fc-input-group"><span className="fc-input-label">{labels.review.commentLabel}</span><textarea className="fc-input min-h-20" name="notes" placeholder={commonLabels.optional} /></label>
                    <div className="flex flex-wrap gap-3">
                      <Button name="decision" type="submit" value="accept">{labels.review.acceptReview}</Button>
                      <Button name="decision" type="submit" value="reject" variant="secondary">{labels.review.rejectReview}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )) : <Card className="p-5 text-sm text-[var(--fc-muted)]">{labels.review.noEscalation}</Card>}
          </div>
        </div>
      )}
    </section>
  );
}
