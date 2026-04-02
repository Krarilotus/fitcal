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

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const [user, locale, theme] = await Promise.all([
    getCurrentUser(),
    getPreferredLocale(),
    getPreferredTheme(),
  ]);
  const dictionary = getDictionary(locale);
  const labels = dictionary.auth.resetPassword;

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const token = typeof params.token === "string" ? params.token : "";

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
      footer={<p>{labels.noValidToken} <Link href="/forgot-password">{labels.requestNewLink}</Link>.</p>}
    >
      <div className="space-y-3">
        <FlashMessage error={error} />
        {token ? (
          <form action="/api/auth/reset-password" className="space-y-4" method="post">
            <input name="token" type="hidden" value={token} />
            <label className="fc-input-group">
              <span className="fc-input-label">{labels.newPassword}</span>
              <input className="fc-input" name="password" required type="password" />
            </label>
            <Button className="w-full" type="submit">{labels.submit}</Button>
          </form>
        ) : (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{labels.missingToken}</p>
        )}
      </div>
    </AuthShell>
  );
}
