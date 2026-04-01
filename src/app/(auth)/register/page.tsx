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

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <AuthShell
      eyebrow="Registrierung"
      title="Neuen Zugang fuer FitCal erstellen."
      description="Nach der Registrierung kannst du direkt opt-in gehen und deine Trainingsdokumentation im eigenen Upload-Ordner sammeln."
      footer={
        <p>
          Bereits registriert? <Link href="/login">Zum Login</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} />
        <form action="/api/auth/register" className="space-y-4" method="post">
          <label className="fitcal-input-wrap">
            Name
            <input className="fitcal-input" name="name" type="text" />
          </label>
          <label className="fitcal-input-wrap">
            E-Mail
            <input className="fitcal-input" name="email" required type="email" />
          </label>
          <label className="fitcal-input-wrap">
            Passwort
            <input className="fitcal-input" name="password" required type="password" />
          </label>
          <button className="fitcal-btn fitcal-btn-main w-full" type="submit">
            Account erstellen
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
