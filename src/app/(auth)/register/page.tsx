import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { Button } from "@/components/ui/button";
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
          ? "Du hast eine Einladung. Dein Account wird nach der Registrierung direkt aktiviert."
          : "Nach der Registrierung muss dein Account von einem bestehenden Teilnehmer freigegeben werden."
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
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Profil</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="fc-input-group">
              <span className="fc-input-label">Name</span>
              <input className="fc-input" name="name" type="text" />
            </label>
            <label className="fc-input-group">
              <span className="fc-input-label">Geburtsdatum</span>
              <input
                className="fc-input"
                inputMode="numeric"
                name="birthDate"
                pattern="\d{2}\.\d{2}\.\d{4}"
                placeholder="TT.MM.JJJJ"
                type="text"
              />
            </label>
            <label className="fc-input-group">
              <span className="fc-input-label">Körpergröße in cm</span>
              <input
                className="fc-input"
                inputMode="decimal"
                name="heightCm"
                placeholder="z. B. 178"
                step="0.1"
                type="number"
              />
            </label>
            <label className="fc-input-group sm:col-span-2">
              <span className="fc-input-label">E-Mail</span>
              <input className="fc-input" name="email" required type="email" />
            </label>
            <label className="fc-input-group sm:col-span-2">
              <span className="fc-input-label">Passwort</span>
              <input className="fc-input" name="password" required type="password" />
            </label>
            <label className="fc-input-group">
              <span className="fc-input-label">Bauchumfang in cm</span>
              <input
                className="fc-input"
                inputMode="decimal"
                name="waistCircumferenceCm"
                placeholder="z. B. 92"
                step="0.1"
                type="number"
              />
            </label>
            <label className="fc-input-group">
              <span className="fc-input-label">Gewicht in kg</span>
              <input
                className="fc-input"
                inputMode="decimal"
                name="weightKg"
                placeholder="z. B. 81.5"
                step="0.1"
                type="number"
              />
            </label>
            <label className="fc-input-group sm:col-span-2">
              <span className="fc-input-label">Warum machst du mit?</span>
              <textarea
                className="fc-input min-h-24"
                maxLength={240}
                name="motivation"
                placeholder="Optional."
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-[var(--fc-ink)] sm:col-span-2">
              <input
                className="h-4 w-4 rounded accent-[var(--fc-accent)]"
                name="isStudentDiscount"
                type="checkbox"
              />
              <span>Armer Student</span>
            </label>
            <p className="-mt-2 text-sm text-[var(--fc-muted)] sm:col-span-2">
              Halber Preis bei Slack-Tagen. Nicht mit der Light-Variante kombinierbar.
            </p>
            <label className="flex items-center gap-3 text-sm font-medium text-[var(--fc-ink)] sm:col-span-2">
              <input
                className="h-4 w-4 rounded accent-[var(--fc-accent)]"
                name="isLightParticipant"
                type="checkbox"
              />
              <span>Light-Variante</span>
            </label>
            <p className="-mt-2 text-sm text-[var(--fc-muted)] sm:col-span-2">
              Kein Pool, kein Review, keine Kosten. Du kannst trotzdem deine Wiederholungen
              eintragen, aber ohne Video-Upload.
            </p>
          </div>
          <Button className="w-full" type="submit">
            {hasInvite ? "Account anlegen" : "Registrierungsanfrage senden"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
