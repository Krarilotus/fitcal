import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
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
  "Maximal 4 Videos, weil maximal 4 Sets dokumentiert werden.",
  "Max. 100 MB pro Datei.",
];

const flow = [
  {
    label: "01",
    title: "Trainieren",
    body: "Pro Tag maximal zwei Sets Liegestütze und zwei Sets Sit-ups.",
  },
  {
    label: "02",
    title: "Hochladen",
    body: "Ein Clip oder bis zu vier Teile. Uploads sind heute und gestern offen.",
  },
  {
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
    <div className="fitcal-shell min-h-screen text-[var(--fc-ink)]">
      <div className="fitcal-noise pointer-events-none absolute inset-0 -z-20" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-12 pt-5 sm:px-6 sm:pb-20 sm:pt-8 lg:gap-10">
        <header className="fitcal-topbar">
          <Link
            className="inline-flex items-center gap-3 text-sm font-medium tracking-[0.16em] uppercase text-[var(--fc-muted)]"
            href="/"
          >
            <span className="fitcal-brand-dot" />
            FitCal 2026
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="#regeln">Regeln</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </header>

        <section className="fitcal-landing-hero fitcal-rise">
          <div className="fitcal-landing-copy">
            <Badge variant="accent">Challenge</Badge>
            <h1 className="mt-5 max-w-4xl text-5xl leading-[0.88] font-[var(--font-dm-serif-display)] tracking-[-0.05em] sm:text-7xl lg:text-[7rem]">
              Jeden Tag
              <br />
              klar trainieren.
              <br />
              Sauber belegen.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--fc-muted)] sm:text-lg">
              Tagesziel, Uploads, Joker, Schulden und Verlauf sind an einem Ort
              gebündelt.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Account anlegen
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Zum Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="fitcal-target-stage">
            <div className="fitcal-target-panel">
              <div className="fitcal-target-topline">
                <span className="fitcal-soft-label">Heute pro Übung</span>
                <Badge variant="warm">Tag {snapshot.challengeDay}</Badge>
              </div>
              <p className="mt-4 text-7xl leading-none font-semibold tracking-[-0.06em] sm:text-8xl">
                {snapshot.targetReps}
              </p>
              <div className="fitcal-target-meta">
                <p>{snapshot.todayLabel}</p>
                <p>je Übung gleich viele Wiederholungen</p>
              </div>
            </div>

            <p className="fitcal-landing-side-note">
              Tagesziel für heute. Alles Weitere steht unten in den Regeln und im
              aufklappbaren Detailbereich.
            </p>
          </div>
        </section>

        <section className="fitcal-rule-ribbon fitcal-rise" id="regeln">
          <div className="flex items-center justify-between gap-4">
            <Badge>Regeln</Badge>
            <p className="text-sm text-[var(--fc-muted)]">Der Rahmen für jeden Tag.</p>
          </div>

          <ol className="fitcal-rule-list">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="fitcal-stream-panel fitcal-rise">
            <p className="fitcal-section-kicker">Ablauf</p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {flow.map((item) => (
                <div className="fitcal-sequence-card" key={item.label}>
                  <span>{item.label}</span>
                  <h2>{item.title}</h2>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>

            <details className="fitcal-detail-drawer mt-5">
              <summary>Details und Beispielrechnungen</summary>
              <div className="fitcal-detail-grid">
                <div>
                  <span className="fitcal-soft-label">Tagesziel</span>
                  <p className="mt-2 text-sm leading-7 text-[var(--fc-muted)]">
                    Die Wiederholungen pro Übung folgen:
                    <br />
                    <code>round_up(1 + 2.5 * sqrt(Tage seit 01.04.2026))</code>
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--fc-muted)]">
                    Heute ergibt das {snapshot.targetReps} Wiederholungen pro
                    Übung.
                  </p>
                </div>
                <div>
                  <span className="fitcal-soft-label">Upload-Fenster</span>
                  <p className="mt-2 text-sm leading-7 text-[var(--fc-muted)]">
                    Uploads sind bis zu 24 Stunden später offen. Maßgeblich ist
                    Europe/Berlin.
                  </p>
                </div>
                <div>
                  <span className="fitcal-soft-label">Schuldenbeispiele</span>
                  <div className="mt-2 space-y-2">
                    {debtExamples.map((entry) => (
                      <p
                        className="text-sm leading-7 text-[var(--fc-muted)]"
                        key={entry.missedDays}
                      >
                        {entry.missedDays} Slack-Tag
                        {entry.missedDays > 1 ? "e" : ""}: {entry.amount} €
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </article>

          <article className="fitcal-proof-panel fitcal-rise">
            <div>
              <p className="fitcal-section-kicker">Videos</p>
              <p className="mt-3 text-3xl leading-tight font-[var(--font-dm-serif-display)]">
                Maximal 4 Videos. Extras müssen im Video zu sehen sein.
              </p>
            </div>

            <p className="text-sm leading-7 text-[rgba(246,239,227,0.78)]">
              Eine Datei reicht. Wenn nötig kannst du auf bis zu vier Teile
              aufteilen. Max. 100 MB pro Datei.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                className="fitcal-video-link"
                href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
                rel="noreferrer"
                target="_blank"
              >
                <PlayCircle className="size-5" />
                <span>Referenzvideo Liegestütze</span>
              </a>
              <a
                className="fitcal-video-link"
                href="https://www.youtube.com/watch?v=czKvGbo5zAo"
                rel="noreferrer"
                target="_blank"
              >
                <PlayCircle className="size-5" />
                <span>Referenzvideo Sit-Ups</span>
              </a>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
