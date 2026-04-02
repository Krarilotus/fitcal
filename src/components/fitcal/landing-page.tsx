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

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:gap-16">
        {/* ── Header ── */}
        <header className="flex items-center justify-between fc-rise">
          <Link
            className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-[0.16em] uppercase text-[var(--fc-muted)] transition-colors hover:text-[var(--fc-accent)]"
            href="/"
          >
            <span className="fc-brand-dot" />
            FitCal
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="#regeln">Regeln</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="grid items-stretch gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-center py-4 sm:py-8 fc-rise">
            <Badge variant="accent">365 Tage</Badge>
            <h1 className="fc-display mt-6 max-w-4xl text-[clamp(2.8rem,7vw,6rem)]">
              Jeden Tag
              <br />
              <span className="text-[var(--fc-accent)]" style={{ textShadow: "0 0 40px rgba(200,255,0,0.2)" }}>trainieren.</span>
              <br />
              <span className="text-[var(--fc-muted)]">belegen.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--fc-muted)] sm:text-lg">
              Tagesziel, Uploads, Joker, Schulden und Verlauf – alles an einem
              Ort gebündelt.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
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

          {/* ── Target card — the focal point ── */}
          <div className="grid gap-4 fc-rise fc-rise-delay-1">
            <div className="fc-card-dark relative overflow-hidden">
              {/* Atmospheric glow behind the number */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[var(--fc-accent)] opacity-[0.06] blur-[60px]" />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="fc-kicker">Heute pro Übung</span>
                <Badge variant="warm">Tag {snapshot.challengeDay}</Badge>
              </div>
              <p className="fc-display fc-count-animated mt-6 text-[clamp(5rem,12vw,9rem)] text-[var(--fc-accent)]" style={{ textShadow: "0 0 60px rgba(200,255,0,0.15)" }}>
                {snapshot.targetReps}
              </p>
              <div className="mt-4 space-y-1 border-t border-[rgba(255,255,255,0.06)] pt-4">
                <p className="text-sm text-[var(--fc-muted)]">{snapshot.todayLabel}</p>
                <p className="text-sm text-[var(--fc-muted)]">je Übung gleich viele Wiederholungen</p>
              </div>
            </div>

            <p className="px-1 text-sm leading-relaxed text-[var(--fc-muted)]">
              Tagesziel für heute. Details und Schuldenbeispiele stehen unten in den Regeln.
            </p>
          </div>
        </section>

        {/* ── Flow / How-it-works ── */}
        <section className="fc-rise fc-rise-delay-2">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Badge>Ablauf</Badge>
            <p className="text-sm text-[var(--fc-muted)]">Drei Schritte, jeden Tag.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {flow.map((item, i) => (
              <div className="fc-step-card" key={item.label} style={{ animationDelay: `${300 + i * 80}ms` }}>
                <div className="fc-step-num">
                  <item.icon className="size-3.5" />
                </div>
                <h2 className="fc-heading text-lg">{item.title}</h2>
                <p className="text-sm leading-relaxed text-[var(--fc-muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Rules ── */}
        <section className="fc-rise fc-rise-delay-3" id="regeln">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Badge>Regeln</Badge>
            <p className="text-sm text-[var(--fc-muted)]">Der Rahmen für jeden Tag.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="fc-card">
              <ol className="fc-rule-list">
                {rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
            </div>

            <div className="fc-card">
              <details className="fc-details">
                <summary>Details und Beispielrechnungen</summary>
                <div className="grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <span className="fc-kicker">Tagesziel</span>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--fc-muted)]">
                      Die Wiederholungen pro Übung folgen:
                      <br />
                      <code className="mt-1 inline-block rounded-[var(--fc-radius-sm)] bg-white/5 px-2 py-0.5 text-xs font-mono text-[var(--fc-accent)]">
                        round_up(1 + 2.5 * sqrt(Tage seit 01.04.2026))
                      </code>
                    </p>
                    <p className="mt-2 text-sm text-[var(--fc-muted)]">
                      Heute ergibt das <strong className="text-[var(--fc-ink)]">{snapshot.targetReps}</strong> Wiederholungen pro Übung.
                    </p>
                  </div>
                  <div>
                    <span className="fc-kicker">Upload-Fenster</span>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--fc-muted)]">
                      Uploads sind bis zu 24 Stunden später offen. Maßgeblich ist
                      Europe/Berlin.
                    </p>
                  </div>
                  <div>
                    <span className="fc-kicker">Schuldenbeispiele</span>
                    <div className="mt-2 space-y-1.5">
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
          </div>
        </section>

        {/* ── Videos / Proof ── */}
        <section className="fc-rise fc-rise-delay-3">
          <div className="fc-card-dark">
            <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
              <div>
                <span className="fc-kicker">Videos</span>
                <p className="fc-heading mt-3 text-2xl sm:text-3xl">
                  Maximal 4 Videos. Extras müssen im Video zu sehen sein.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--fc-muted)]">
                  Eine Datei reicht. Wenn nötig kannst du auf bis zu vier Teile
                  aufteilen. Max. 100 MB pro Datei.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                className="fc-video-link"
                href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
                rel="noreferrer"
                target="_blank"
              >
                <PlayCircle className="size-5" />
                <span>Referenzvideo Liegestütze</span>
              </a>
              <a
                className="fc-video-link"
                href="https://www.youtube.com/watch?v=czKvGbo5zAo"
                rel="noreferrer"
                target="_blank"
              >
                <PlayCircle className="size-5" />
                <span>Referenzvideo Sit-Ups</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
