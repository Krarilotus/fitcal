import Link from "next/link";
import { ArrowRight, PlayCircle, Zap, Upload, BarChart3 } from "lucide-react";
import {
  calculateDebtForMissedDays,
  type ChallengeSnapshot,
} from "@/components/fitcal/challenge-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const rules = [
  "Maximal 2 Sets pro Sportart.",
  "Videos bis zu 24 Stunden später hochladen.",
  "Qualifikation durch 10 Uploads in den ersten 14 Tagen.",
  "2 neue Slack-Day-Joker pro Monat. Ungenutzte Joker bleiben erhalten.",
  "Slacken kostet 10 € plus 2 € für jeden weiteren Tag.",
];

const flow = [
  {
    icon: Zap,
    label: "01",
    title: "Trainieren",
    body: "Pro Tag maximal zwei Sets Liegestütze und zwei Sets Sit-ups.",
  },
  {
    icon: Upload,
    label: "02",
    title: "Hochladen",
    body: "Ein Clip oder bis zu vier Teile. Uploads sind heute und gestern offen.",
  },
  {
    icon: BarChart3,
    label: "03",
    title: "Stand halten",
    body: "Joker, Schulden und Extras werden danach im Dashboard verrechnet.",
  },
];

export function FitcalLandingPage({
  snapshot,
}: {
  snapshot: ChallengeSnapshot;
}) {
  const debtExamples = [1, 3, 5].map((missedDays) => ({
    missedDays,
    amount: calculateDebtForMissedDays(missedDays),
  }));

  return (
    <div className="fc-shell min-h-screen text-[var(--fc-ink)]">
      <div className="fc-noise pointer-events-none absolute inset-0 -z-20" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
        {/* ── Header ── */}
        <header className="flex items-center justify-between fc-rise">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fc-muted)] hover:text-[var(--fc-ink)] transition-colors"
            href="/"
          >
            <span className="fc-brand-dot" />
            FitCal
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="#regeln">Regeln</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="grid items-start gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="fc-rise">
            <h1 className="fc-display text-[clamp(2.5rem,6vw,4.5rem)]">
              Jeden Tag trainieren.
              <br />
              <span className="text-[var(--fc-muted)]">Jeden Tag belegen.</span>
            </h1>
            <p className="mt-5 max-w-md text-[var(--fc-muted)] sm:text-lg leading-relaxed">
              365-Tage-Challenge: Tagesziel, Uploads, Joker, Schulden -
              alles an einem Ort.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Account anlegen
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Dashboard</Link>
              </Button>
            </div>
          </div>

          {/* ── Target number ── */}
          <div className="fc-rise fc-rise-delay-1">
            <div className="rounded-[var(--fc-radius-xl)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="fc-kicker">Heute pro Übung</span>
                <Badge variant="warm">Tag {snapshot.challengeDay}</Badge>
              </div>
              <p className="fc-display fc-count-animated mt-4 text-[clamp(4rem,10vw,7rem)] text-[var(--fc-accent)]">
                {snapshot.targetReps}
              </p>
              <p className="mt-3 text-sm text-[var(--fc-muted)]">{snapshot.todayLabel}</p>
            </div>
          </div>
        </section>

        {/* ── How it works - no cards, just a clean grid ── */}
        <section className="fc-rise fc-rise-delay-2">
          <p className="fc-kicker mb-6">Ablauf</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {flow.map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="fc-step-num">
                    <item.icon className="size-3.5" />
                  </div>
                  <h2 className="fc-heading text-base">{item.title}</h2>
                </div>
                <p className="text-sm leading-relaxed text-[var(--fc-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Rules ── */}
        <section className="fc-rise fc-rise-delay-3" id="regeln">
          <p className="fc-kicker mb-6">Regeln</p>

          <div className="grid gap-8 lg:grid-cols-2">
            <ol className="fc-rule-list">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>

            <details className="fc-details">
              <summary>Schuldenbeispiele & Formel</summary>
              <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <p className="text-sm font-medium mb-1">Tagesziel-Formel</p>
                  <code className="inline-block rounded-[var(--fc-radius-sm)] bg-[var(--fc-surface)] px-2 py-1 text-xs font-mono text-[var(--fc-accent-2)]">
                    ceil(1 + 2.5 × √(Tage seit Start))
                  </code>
                  <p className="mt-1.5 text-sm text-[var(--fc-muted)]">
                    Heute: <strong className="text-[var(--fc-ink)]">{snapshot.targetReps}</strong> pro Übung
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Schuldenbeispiele</p>
                  <div className="space-y-1">
                    {debtExamples.map((entry) => (
                      <p
                        className="flex items-center justify-between text-sm text-[var(--fc-muted)]"
                        key={entry.missedDays}
                      >
                        <span>{entry.missedDays} Slack-Tag{entry.missedDays > 1 ? "e" : ""}</span>
                        <strong className="text-[var(--fc-ink)]">{entry.amount} €</strong>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* ── Videos ── */}
        <section className="fc-rise fc-rise-delay-3">
          <p className="fc-kicker mb-3">Referenzvideos</p>
          <p className="text-sm text-[var(--fc-muted)] mb-4">Max. 4 Videos, max. 100 MB pro Datei.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              className="fc-video-link"
              href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
              rel="noreferrer"
              target="_blank"
            >
              <PlayCircle className="size-5" />
              <span>Liegestütze</span>
            </a>
            <a
              className="fc-video-link"
              href="https://www.youtube.com/watch?v=czKvGbo5zAo"
              rel="noreferrer"
              target="_blank"
            >
              <PlayCircle className="size-5" />
              <span>Sit-Ups</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
