import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { getCurrentUser } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (user?.registrationStatus === "APPROVED") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const inviteToken = typeof params.invite === "string" ? params.invite : "";
  const hasInvite = inviteToken.length > 0;

  return (
    <AuthShell
      eyebrow="Registrierung"
      title="Registrieren"
      description={
        hasInvite
          ? "Account anlegen und mit Einladung direkt freigeschaltet werden."
          : "Account anlegen, Profil ergänzen und danach von bestehenden Nutzern freigeben lassen."
      }
      footer={
        <p>
          Bereits registriert? <Link href="/login">Zum Login</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} />
        <form action="/api/auth/register" className="space-y-4" method="post">
          <input name="invitationToken" type="hidden" value={inviteToken} />
          <div className="fitcal-form-intro">
            <p className="fitcal-section-kicker">Profil</p>
            <p className="text-sm text-[var(--fc-muted)]">
              {hasInvite
                ? "Basisdaten, optionale Messwerte und dann direkt los."
                : "Basisdaten, optionale Messwerte und danach Freigabe durch bestehende Nutzer."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="fitcal-input-wrap">
              Name
              <input className="fitcal-input" name="name" type="text" />
            </label>
            <label className="fitcal-input-wrap">
              Geburtsdatum
              <input
                className="fitcal-input"
                inputMode="numeric"
                name="birthDate"
                pattern="\d{2}\.\d{2}\.\d{4}"
                placeholder="TT.MM.JJJJ"
                type="text"
              />
            </label>
            <label className="fitcal-input-wrap">
              Körpergröße in cm
              <input
                className="fitcal-input"
                inputMode="decimal"
                name="heightCm"
                placeholder="z. B. 178"
                step="0.1"
                type="number"
              />
            </label>
            <label className="fitcal-input-wrap md:col-span-2">
              E-Mail
              <input className="fitcal-input" name="email" required type="email" />
            </label>
            <label className="fitcal-input-wrap md:col-span-2">
              Passwort
              <input className="fitcal-input" name="password" required type="password" />
            </label>
            <label className="fitcal-input-wrap">
              Bauchumfang in cm
              <input
                className="fitcal-input"
                inputMode="decimal"
                name="waistCircumferenceCm"
                placeholder="z. B. 92"
                step="0.1"
                type="number"
              />
            </label>
            <label className="fitcal-input-wrap">
              Gewicht in kg
              <input
                className="fitcal-input"
                inputMode="decimal"
                name="weightKg"
                placeholder="z. B. 81.5"
                step="0.1"
                type="number"
              />
            </label>
            <label className="fitcal-input-wrap md:col-span-2">
              Warum machst du mit?
              <textarea
                className="fitcal-input min-h-24"
                maxLength={240}
                name="motivation"
                placeholder="Optional."
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-[var(--fc-ink)] md:col-span-2">
              <input
                className="h-4 w-4 accent-[var(--fc-accent)]"
                name="isStudentDiscount"
                type="checkbox"
              />
              <span>Armer Student</span>
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-[var(--fc-ink)] md:col-span-2">
              <input
                className="h-4 w-4 accent-[var(--fc-accent)]"
                name="isLightParticipant"
                type="checkbox"
              />
              <span>Light-Variante</span>
            </label>
          </div>
          <button
            className="w-full rounded-full bg-[var(--fc-ink)] px-5 py-3 text-sm font-medium text-[var(--fc-bg)] transition hover:bg-[#2d352f]"
            type="submit"
          >
            {hasInvite ? "Account anlegen" : "Registrierungsanfrage senden"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
