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
    <div className="fc-shell min-h-screen px-4 py-6 text-[var(--fc-ink)] sm:px-6 sm:py-10">
      <div className="fc-noise pointer-events-none absolute inset-0 -z-20" />
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-5 flex items-center justify-between text-sm text-[var(--fc-muted)] fc-rise">
          <Link href="/" className="inline-flex items-center gap-2 font-medium transition-colors hover:text-[var(--fc-accent)]">
            <span aria-hidden>←</span> Zur Startseite
          </Link>
          <span className="text-xs">Europe/Berlin</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
          <section className="fc-card-dark flex flex-col justify-between gap-8 fc-rise">
            <div>
              <Badge variant="accent">{eyebrow}</Badge>
              <h1 className="fc-display mt-5 max-w-xl text-[clamp(2rem,4vw,3.2rem)]">
                {title}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--fc-muted)] sm:text-base">
                {description}
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-[var(--fc-radius)] border border-[rgba(255,255,255,0.06)] bg-white/[0.03] p-3.5">
                <p className="fc-kicker">Zugang</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--fc-muted)]">
                  Mail, Passwort und optionale Startwerte.
                </p>
              </div>
              <div className="fc-auth-aside-list text-sm">
                <span>✓ Reset-Link per Mail</span>
                <span>✓ Tage nach Europe/Berlin</span>
                <span>✓ Messwerte optional</span>
              </div>
            </div>
          </section>

          <section className="fc-card flex flex-col justify-between fc-rise fc-rise-delay-1">
            <div className="space-y-5">{children}</div>
            <Separator className="mt-8 bg-[rgba(255,255,255,0.06)]" />
            <div className="pt-4 text-sm text-[var(--fc-muted)] [&_a]:font-medium [&_a]:text-[var(--fc-accent)] [&_a]:transition-colors hover:[&_a]:text-[var(--fc-accent-hover)]">
              {footer}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
