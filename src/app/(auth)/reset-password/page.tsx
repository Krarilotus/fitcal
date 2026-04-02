import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/fitcal/auth-shell";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { Button } from "@/components/ui/button";
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
      title="Neues Passwort setzen"
      description="Hier legst du ein neues Passwort fest."
      footer={
        <p>
          Kein gültiger Token? <Link href="/forgot-password">Neuen Link anfordern</Link>.
        </p>
      }
    >
      <div className="space-y-3">
        <FlashMessage error={error} />
        {token ? (
          <form action="/api/auth/reset-password" className="space-y-4" method="post">
            <input name="token" type="hidden" value={token} />
            <label className="fc-input-group">
              <span className="fc-input-label">Neues Passwort</span>
              <input className="fc-input" name="password" required type="password" />
            </label>
            <Button className="w-full" type="submit">
              Passwort speichern
            </Button>
          </form>
        ) : (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Es wurde kein Reset-Token übergeben.
          </p>
        )}
      </div>
    </AuthShell>
  );
}
