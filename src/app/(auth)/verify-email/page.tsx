import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const [user, locale, theme] = await Promise.all([
    getCurrentUser(),
    getPreferredLocale(),
    getPreferredTheme(),
  ]);
  const dictionary = getDictionary(locale);
  const labels = dictionary.auth.verifyEmail;

  if (user) {
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
      footer={<p>{labels.backToLogin} <Link href="/login">{dictionary.common.login}</Link>.</p>}
    >
      <div className="space-y-3">
        <FlashMessage error={error} success={success} />
        <form action="/api/auth/request-verification" className="space-y-4" method="post">
          <label className="fc-input-group">
            <span className="fc-input-label">{dictionary.common.email}</span>
            <input className="fc-input" name="email" required type="email" />
          </label>
          <Button className="w-full" type="submit">{labels.submit}</Button>
        </form>
      </div>
    </AuthShell>
  );
}
