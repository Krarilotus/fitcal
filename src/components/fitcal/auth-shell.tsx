import Link from "next/link";

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
    <div className="fitcal-bg min-h-screen px-6 py-10 text-[var(--fc-ink)]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="fitcal-panel flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium tracking-[0.14em] text-[var(--fc-muted)] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-xl text-5xl leading-[0.95] font-[var(--font-dm-serif-display)]">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--fc-muted)]">
              {description}
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="fitcal-mini-panel">
              <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                Tagesziel
              </p>
              <p className="mt-2 text-2xl font-semibold">Formelbasiert</p>
            </div>
            <div className="fitcal-mini-panel">
              <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                Uploads
              </p>
              <p className="mt-2 text-2xl font-semibold">1 bis 4 Videos</p>
            </div>
            <div className="fitcal-mini-panel">
              <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                Zeitzone
              </p>
              <p className="mt-2 text-2xl font-semibold">Europe/Berlin</p>
            </div>
          </div>
        </section>

        <section className="fitcal-panel flex flex-col justify-between">
          <div className="space-y-6">{children}</div>
          <div className="mt-8 border-t border-[var(--fc-panel-stroke)] pt-4 text-sm text-[var(--fc-muted)]">
            {footer}
          </div>
        </section>
      </div>
      <div className="mx-auto mt-6 flex w-full max-w-6xl justify-between text-sm text-[var(--fc-muted)]">
        <Link href="/">Zur Startseite</Link>
        <a
          href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
          rel="noreferrer"
          target="_blank"
        >
          Referenzvideos
        </a>
      </div>
    </div>
  );
}
