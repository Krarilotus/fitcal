import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { getCurrentUser } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  return (
    <AuthShell
      eyebrow="Login"
      title="Wieder rein in die Challenge."
      description="Melde dich an, oeffne heutige oder gestrige Upload-Slots und halte Joker sowie Schulden im Blick."
      footer={
        <p>
          Noch kein Zugang? <Link href="/register">Jetzt registrieren</Link>. Passwort
          vergessen? <Link href="/forgot-password">Reset-Link anfordern</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} success={success} />
        <form
          action="/api/auth/login"
          className="space-y-4"
          method="post"
        >
          <label className="fitcal-input-wrap">
            E-Mail
            <input className="fitcal-input" name="email" required type="email" />
          </label>
          <label className="fitcal-input-wrap">
            Passwort
            <input className="fitcal-input" name="password" required type="password" />
          </label>
          <button className="fitcal-btn fitcal-btn-main w-full" type="submit">
            Einloggen
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
