import Link from "next/link";
import { redirect } from "next/navigation";
import { RegistrationStatus } from "@prisma/client";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { PreferenceControls } from "@/components/fitcal/preference-controls";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { getPreferredLocale, getPreferredTheme } from "@/lib/preferences";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const [user, locale, theme] = await Promise.all([
    getCurrentUser(),
    getPreferredLocale(),
    getPreferredTheme(),
  ]);
  const dictionary = getDictionary(locale);
  const labels = dictionary.auth.login;

  if (user?.registrationStatus === RegistrationStatus.APPROVED) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  return (
    <AuthShell
      backHomeLabel={dictionary.authShell.backHome}
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
      eyebrow={labels.eyebrow}
      title={labels.title}
      description={labels.description}
      footer={
        <p>
          {labels.noAccess} <Link href="/register">{labels.registerNow}</Link>. {labels.forgot}{" "}
          <Link href="/forgot-password">{labels.requestReset}</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} success={success} />
        <form action="/api/auth/login" className="space-y-4" method="post">
          <label className="fc-input-group">
            <span className="fc-input-label">{dictionary.common.email}</span>
            <input className="fc-input" name="email" required type="email" />
          </label>
          <label className="fc-input-group">
            <span className="fc-input-label">{dictionary.common.password}</span>
            <input className="fc-input" name="password" required type="password" />
          </label>
          <Button className="w-full" type="submit">{labels.submit}</Button>
        </form>
      </div>
    </AuthShell>
  );
}
