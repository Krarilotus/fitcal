import type { AppDictionary } from "@/i18n";
import type {
  OverviewSummary,
  ParticipantRow,
} from "@/components/fitcal/dashboard-types";
import type { PendingApprovalSummary } from "@/lib/dashboard-data";
import {
  DashboardActionButton,
  DashboardStatusBadge,
  DashboardStatBox as StatBox,
} from "@/components/fitcal/dashboard/dashboard-primitives";
import { Badge } from "@/components/ui/badge";

type DashboardLabels = AppDictionary["dashboard"];

export function DashboardOverviewSection({
  canReview,
  labels,
  overview,
  participantRows,
  pendingApprovals,
}: {
  canReview: boolean;
  labels: DashboardLabels;
  overview: OverviewSummary;
  participantRows: ParticipantRow[];
  pendingApprovals: PendingApprovalSummary[];
}) {
  const lightProgressRows = overview.isLightParticipant
    ? participantRows.slice(0, 8)
    : [];
  const lightExtraCategories = [
    ...new Set(lightProgressRows.flatMap((row) => Object.keys(row.extraTotals))),
  ].sort((left, right) => left.localeCompare(right));

  return (
    <section className="fc-section fc-rise" id="overview">
      <div className="fc-card-lg">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="warm">{labels.overview.dayPrefix} {overview.dayNumber}</Badge>
          {overview.isQualificationPhase ? <Badge variant="accent">{labels.overview.qualificationBadge}</Badge> : null}
          {overview.isLightParticipant ? <Badge>{labels.overview.lightBadge}</Badge> : null}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-5">
          <div>
            <p className="fc-text-muted">{labels.overview.currentTarget}</p>
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
        {lightProgressRows.length ? (
          <div className="mt-5 border-t border-[var(--fc-border)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="fc-heading text-base">{labels.reviewSubtabs.progress}</h3>
              <DashboardStatusBadge>
                {participantRows.length} {labels.review.summary.participants}
              </DashboardStatusBadge>
            </div>
            <div className="mt-4 grid gap-3 md:hidden">
              {lightProgressRows.map((row) => (
                <div className="fc-info-box" key={row.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="fc-text-emphasis">
                      {row.name}
                      {row.isSelf ? ` - ${labels.review.you}` : ""}
                    </p>
                    <DashboardStatusBadge>{row.modeLabel}</DashboardStatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <StatBox label={labels.review.stats.totalPushups} value={row.totalPushups} />
                    <StatBox label={labels.review.stats.totalSitups} value={row.totalSitups} />
                    <StatBox label={labels.review.stats.days} value={row.documentedDays} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto rounded-md border border-[var(--fc-border)] md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[var(--fc-border)] text-[var(--fc-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">{labels.review.table.name}</th>
                    <th className="px-4 py-3 font-medium">{labels.review.table.mode}</th>
                    <th className="px-4 py-3 font-medium">{labels.review.table.totalPushups}</th>
                    <th className="px-4 py-3 font-medium">{labels.review.table.totalSitups}</th>
                    <th className="px-4 py-3 font-medium">{labels.review.table.days}</th>
                  </tr>
                </thead>
                <tbody>
                  {lightProgressRows.map((row) => (
                    <tr className="border-b border-[var(--fc-border)]/70 last:border-b-0" key={row.id}>
                      <td className="px-4 py-3 font-medium">
                        {row.name}
                        {row.isSelf ? ` - ${labels.review.you}` : ""}
                      </td>
                      <td className="px-4 py-3">{row.modeLabel}</td>
                      <td className="px-4 py-3">{row.totalPushups}</td>
                      <td className="px-4 py-3">{row.totalSitups}</td>
                      <td className="px-4 py-3">{row.documentedDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lightExtraCategories.length ? (
              <details className="mt-4 rounded-md border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3">
                <summary className="cursor-pointer fc-text-emphasis">
                  {labels.review.table.extraColumns}
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-[var(--fc-border)] text-[var(--fc-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">{labels.review.table.name}</th>
                        {lightExtraCategories.map((categoryName) => (
                          <th className="px-4 py-3 font-medium" key={categoryName}>
                            {categoryName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lightProgressRows.map((row) => (
                        <tr className="border-b border-[var(--fc-border)]/70 last:border-b-0" key={row.id}>
                          <td className="px-4 py-3 font-medium">
                            {row.name}
                            {row.isSelf ? ` - ${labels.review.you}` : ""}
                          </td>
                          {lightExtraCategories.map((categoryName) => (
                            <td className="px-4 py-3" key={categoryName}>
                              {row.extraTotals[categoryName] ?? 0}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
        {canReview ? (
          <div className="mt-5 border-t border-[var(--fc-border)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="fc-heading text-base">{labels.overview.approvals}</h3>
              <DashboardStatusBadge>
                {pendingApprovals.length}{" "}
                {pendingApprovals.length === 1
                  ? labels.approvals.single
                  : labels.approvals.plural}
              </DashboardStatusBadge>
            </div>
            {pendingApprovals.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {pendingApprovals.map((approval) => (
                  <div
                    className="fc-info-box"
                    key={approval.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate fc-text-emphasis">
                          {approval.applicant.name || approval.applicant.email}
                        </p>
                        <p className="mt-1 fc-text-muted">
                          {approval.applicant.email}
                        </p>
                        {approval.applicant.motivation ? (
                          <p className="mt-2 fc-text-secondary">
                            {approval.applicant.motivation}
                          </p>
                        ) : null}
                      </div>
                      <form
                        action="/api/registration-approvals"
                        className="flex flex-wrap gap-2"
                        method="post"
                      >
                        <input name="approvalId" type="hidden" value={approval.id} />
                        <DashboardActionButton name="decision" type="submit" value="approve">
                          {labels.approvals.approve}
                        </DashboardActionButton>
                        <DashboardActionButton
                          name="decision"
                          type="submit"
                          value="reject"
                          variant="danger"
                        >
                          {labels.approvals.reject}
                        </DashboardActionButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
