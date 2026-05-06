import { RegistrationStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { DashboardTabs } from "@/components/fitcal/dashboard-tabs";
import { DashboardAutoRefresh } from "@/components/fitcal/dashboard-auto-refresh";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { PreferenceControls } from "@/components/fitcal/preference-controls";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { hasGitHubFeatureRequestConfig } from "@/lib/github/feature-requests";
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
  const featureRequestsEnabled = hasGitHubFeatureRequestConfig();

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
    reviewFeedbackItems,
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
        <DashboardAutoRefresh enabled={canReview} />
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="fc-display text-[clamp(1.5rem,3vw,2.25rem)]">
              {user.name || user.email}
            </h1>
            <p className="mt-1 fc-text-muted">
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

        <DashboardTabs
          activeInvites={activeInvites}
          canReview={canReview}
          commonLabels={commonLabels}
          escalationReviewItems={escalationReviewItems}
          featureRequestsEnabled={featureRequestsEnabled}
          labels={dashboardLabels}
          locale={locale}
          measurementPoints={measurementPoints}
          openDays={openDays}
          overview={overview}
          pendingApprovals={pendingApprovals}
          participantRows={participantRows}
          performancePoints={performancePoints}
          reviewFeedbackItems={reviewFeedbackItems}
          primaryReviewItems={primaryReviewItems}
          profile={profile}
          sicknessReviewItems={sicknessReviewItems}
          timelineEntries={timelineEntries}
        />
      </div>
    </div>
  );
}
