import Link from "next/link";
import { redirect } from "next/navigation";
import { RegistrationStatus } from "@prisma/client";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (user?.registrationStatus === RegistrationStatus.APPROVED) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  return (
    <AuthShell
      eyebrow="Login"
      title="Anmelden"
      description="Mit E-Mail und Passwort zum Dashboard."
      footer={
        <p>
          Noch kein Zugang? <Link href="/register">Jetzt registrieren</Link>. Passwort
          vergessen? <Link href="/forgot-password">Reset-Link anfordern</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} success={success} />
        <form action="/api/auth/login" className="space-y-4" method="post">
          <label className="fc-input-group">
            <span className="fc-input-label">E-Mail</span>
            <input className="fc-input" name="email" required type="email" />
          </label>
          <label className="fc-input-group">
            <span className="fc-input-label">Passwort</span>
            <input className="fc-input" name="password" required type="password" />
          </label>
          <Button className="w-full" type="submit">
            Einloggen
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
