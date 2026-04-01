import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { getCurrentUser } from "@/lib/auth/session";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <AuthShell
      eyebrow="Neues Passwort"
      title="Reset-Link einloesen."
      description="Setze ein neues Passwort, damit du wieder in dein Challenge-Dashboard kommst."
      footer={
        <p>
          Kein gueltiger Token? <Link href="/forgot-password">Neuen Link anfordern</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} />
        {token ? (
          <form action="/api/auth/reset-password" className="space-y-4" method="post">
            <input name="token" type="hidden" value={token} />
            <label className="fitcal-input-wrap">
              Neues Passwort
              <input className="fitcal-input" name="password" required type="password" />
            </label>
            <button className="fitcal-btn fitcal-btn-main w-full" type="submit">
              Passwort speichern
            </button>
          </form>
        ) : (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Es wurde kein Reset-Token uebergeben.
          </p>
        )}
      </div>
    </AuthShell>
  );
}
