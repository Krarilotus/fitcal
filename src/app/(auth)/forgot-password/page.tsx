import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  return (
    <AuthShell
      eyebrow="Reset"
      title="Passwort-Link anfordern"
      description="Wir senden einen Reset-Link an die angegebene E-Mail-Adresse."
      footer={
        <p>
          Zurück zum <Link href="/login">Login</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} success={success} />
        <form action="/api/auth/forgot-password" className="space-y-4" method="post">
          <label className="fc-input-group">
            <span className="fc-input-label">E-Mail</span>
            <input className="fc-input" name="email" required type="email" />
          </label>
          <Button className="w-full" type="submit">
            Reset-Link senden
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
