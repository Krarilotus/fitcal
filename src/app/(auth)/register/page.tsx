import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { PreferenceControls } from "@/components/fitcal/preference-controls";
import { Button } from "@/components/ui/button";
import { DateTextInput } from "@/components/ui/date-text-input";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { getPreferredLocale, getPreferredTheme } from "@/lib/preferences";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const [user, locale, theme] = await Promise.all([
    getCurrentUser(),
    getPreferredLocale(),
    getPreferredTheme(),
  ]);
  const dictionary = getDictionary(locale);
  const labels = dictionary.auth.register;

  if (user?.registrationStatus === "APPROVED") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const inviteToken = typeof params.invite === "string" ? params.invite : "";
  const hasInvite = inviteToken.length > 0;

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
      description={hasInvite ? labels.invitedDescription : labels.standardDescription}
      footer={<p>{labels.alreadyRegistered} <Link href="/login">{labels.toLogin}</Link>.</p>}
    >
      <div className="space-y-3">
        <FlashMessage error={error} />
        <form action="/api/auth/register" className="space-y-4" method="post">
          <input name="invitationToken" type="hidden" value={inviteToken} />
          <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-medium">{labels.profile}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="fc-input-group"><span className="fc-input-label">{labels.name}</span><input className="fc-input" name="name" type="text" /></label>
            <label className="fc-input-group"><span className="fc-input-label">{labels.birthDate}</span><DateTextInput className="fc-input" name="birthDate" placeholder={dictionary.common.datePlaceholder} /></label>
            <label className="fc-input-group"><span className="fc-input-label">{labels.heightCm}</span><input className="fc-input" inputMode="decimal" name="heightCm" placeholder={labels.heightPlaceholder} step="0.1" type="number" /></label>
            <label className="fc-input-group sm:col-span-2"><span className="fc-input-label">{labels.email}</span><input className="fc-input" name="email" required type="email" /></label>
            <label className="fc-input-group sm:col-span-2"><span className="fc-input-label">{labels.password}</span><input className="fc-input" name="password" required type="password" /></label>
            <label className="fc-input-group"><span className="fc-input-label">{labels.waistCm}</span><input className="fc-input" inputMode="decimal" name="waistCircumferenceCm" placeholder={labels.waistPlaceholder} step="0.1" type="number" /></label>
            <label className="fc-input-group"><span className="fc-input-label">{labels.weightKg}</span><input className="fc-input" inputMode="decimal" name="weightKg" placeholder={labels.weightPlaceholder} step="0.1" type="number" /></label>
            <label className="fc-input-group sm:col-span-2"><span className="fc-input-label">{labels.motivation}</span><textarea className="fc-input min-h-24" maxLength={240} name="motivation" placeholder={dictionary.common.optional} /></label>
            <label className="flex items-center gap-3 text-sm font-medium text-[var(--fc-ink)] sm:col-span-2"><input className="h-4 w-4 rounded accent-[var(--fc-accent)]" name="isStudentDiscount" type="checkbox" /><span>{labels.student}</span></label>
            <p className="-mt-2 text-sm text-[var(--fc-muted)] sm:col-span-2">{labels.studentHint}</p>
            <label className="flex items-center gap-3 text-sm font-medium text-[var(--fc-ink)] sm:col-span-2"><input className="h-4 w-4 rounded accent-[var(--fc-accent)]" name="isLightParticipant" type="checkbox" /><span>{labels.light}</span></label>
            <p className="-mt-2 text-sm text-[var(--fc-muted)] sm:col-span-2">{labels.lightHint}</p>
          </div>
          <Button className="w-full" type="submit">{hasInvite ? labels.submitInvite : labels.submitRequest}</Button>
        </form>
      </div>
    </AuthShell>
  );
}
