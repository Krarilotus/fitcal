import { redirect } from "next/navigation";
import { RegistrationStatus } from "@prisma/client";
import { FitcalLandingPage } from "@/components/fitcal/landing-page";
import { PreferenceControls } from "@/components/fitcal/preference-controls";
import { getChallengeSnapshot } from "@/components/fitcal/challenge-utils";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { getPreferredLocale, getPreferredTheme } from "@/lib/preferences";

export default async function Home() {
  const [user, locale, theme] = await Promise.all([
    getCurrentUser(),
    getPreferredLocale(),
    getPreferredTheme(),
  ]);

  if (user?.registrationStatus === RegistrationStatus.APPROVED) {
    redirect("/dashboard");
  }

  const snapshot = getChallengeSnapshot();
  const dictionary = getDictionary(locale);

  return (
    <FitcalLandingPage
      commonLabels={dictionary.common}
      controls={
        <PreferenceControls
          initialLocale={locale}
          initialTheme={theme}
          labels={{
            locale: dictionary.common.locale,
            theme: dictionary.common.theme,
            localeNames: dictionary.common.localeNames,
            themeNames: dictionary.common.themeNames,
          }}
        />
      }
      labels={dictionary.landing}
      locale={locale}
      snapshot={snapshot}
    />
  );
}
