import { RegistrationStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { DashboardTabs } from "@/components/fitcal/dashboard-tabs";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { PreferenceControls } from "@/components/fitcal/preference-controls";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CHALLENGE_START_DATE,
  CHALLENGE_END_DATE,
} from "@/lib/challenge";
import { getDashboardPageData } from "@/lib/dashboard-data";
import { getPreferredLocale, getPreferredTheme } from "@/lib/preferences";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();
  const locale = await getPreferredLocale();
  const theme = await getPreferredTheme();
  const dictionary = getDictionary(locale);
  const dashboardLabels = dictionary.dashboard;
  const commonLabels = dictionary.common;

  if (!user) {
    redirect("/login");
  }

  if (user.registrationStatus !== RegistrationStatus.APPROVED) {
    redirect("/login?error=Dein%20Account%20ist%20noch%20nicht%20freigegeben.");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;
  const {
    activeInvites,
    canReview,
    escalationReviewItems,
    measurementPoints,
    openDays,
    overview,
    participantRows,
    pendingApprovals,
    performancePoints,
    primaryReviewItems,
    profile,
    sicknessReviewItems,
    timelineEntries,
  } = await getDashboardPageData({
    locale,
    user,
    labels: dashboardLabels,
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
              {CHALLENGE_START_DATE} - {CHALLENGE_END_DATE}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PreferenceControls
              initialLocale={locale}
              initialTheme={theme}
              labels={{
                locale: commonLabels.locale,
                theme: commonLabels.theme,
                localeNames: commonLabels.localeNames,
                themeNames: commonLabels.themeNames,
              }}
            />
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="ghost">
                {commonLabels.logout}
              </Button>
            </form>
          </div>
        </header>

        <FlashMessage error={error} success={success} />

        {canReview ? (
          <section className="border-b border-[var(--fc-border)] pb-5">
            <h2 className="fc-heading mb-3 text-lg">{dashboardLabels.invite.title}</h2>

            <form
              action="/api/invitations"
              className="flex flex-col gap-3 sm:flex-row"
              method="post"
            >
              <label className="fc-input-group flex-1">
                <span className="fc-input-label">{dashboardLabels.invite.emailLabel}</span>
                <input
                  className="fc-input"
                  name="email"
                  placeholder={dashboardLabels.invite.emailPlaceholder}
                  required
                  type="email"
                />
              </label>
              <div className="flex items-end">
                <Button type="submit">{dashboardLabels.invite.submit}</Button>
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
              {pendingApprovals.length}{" "}
              {pendingApprovals.length > 1
                ? dashboardLabels.approvals.plural
                : dashboardLabels.approvals.single}
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
                        {dashboardLabels.approvals.approve}
                      </Button>
                    </form>
                    <form action="/api/registration-approvals" method="post">
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="decision" type="hidden" value="reject" />
                      <Button size="sm" type="submit" variant="secondary">
                        {dashboardLabels.approvals.reject}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <DashboardTabs
          commonLabels={commonLabels}
          escalationReviewItems={escalationReviewItems}
          labels={dashboardLabels}
          locale={locale}
          measurementPoints={measurementPoints}
          openDays={openDays}
          overview={overview}
          participantRows={participantRows}
          performancePoints={performancePoints}
          primaryReviewItems={primaryReviewItems}
          profile={profile}
          sicknessReviewItems={sicknessReviewItems}
          timelineEntries={timelineEntries}
        />
      </div>
    </div>
  );
}
