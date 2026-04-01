import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="fitcal-shell min-h-screen px-4 py-6 text-[var(--fc-ink)] sm:px-6 sm:py-10">
      <div className="fitcal-noise pointer-events-none absolute inset-0 -z-20" />
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between text-sm text-[var(--fc-muted)]">
          <Link href="/">Zur Startseite</Link>
          <span>Europe/Berlin</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
          <section className="fitcal-hero-panel flex flex-col justify-between">
            <div>
              <Badge variant="accent">{eyebrow}</Badge>
              <h1 className="mt-5 max-w-xl text-4xl leading-[0.95] font-[var(--font-dm-serif-display)] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--fc-muted)] sm:text-base">
                {description}
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <div className="fitcal-soft-block">
                <p className="fitcal-soft-label">Zugang</p>
                <p className="mt-2 text-sm leading-7 text-[var(--fc-muted)]">
                  Mail, Passwort und optionale Startwerte.
                </p>
              </div>
              <div className="fitcal-auth-aside-list">
                <span>Reset-Link per Mail</span>
                <span>Tage nach Europe/Berlin</span>
                <span>Messwerte optional</span>
              </div>
            </div>
          </section>

          <section className="fitcal-stream-panel flex flex-col justify-between">
            <div className="space-y-6">{children}</div>
            <Separator className="mt-8 bg-black/8" />
            <div className="pt-4 text-sm text-[var(--fc-muted)]">{footer}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
