import Link from "next/link";
import type { CSSProperties } from "react";
import {
  calculateDebtForMissedDays,
  type ChallengeSnapshot,
} from "@/components/fitcal/challenge-utils";

const rules = [
  {
    title: "Daily Sets",
    description:
      "Pro Tag maximal 2 Sets Liegestuetz und maximal 2 Sets Situps.",
  },
  {
    title: "Zielformel",
    description:
      "round_up(1 + 2.5 * sqrt(days since 2026-04-01)) fuer beide Uebungen.",
  },
  {
    title: "Video Proof",
    description:
      "1 bis 4 Videos pro Tag, je Datei max 100 MB, Speicherung im User-Ordner.",
  },
  {
    title: "Upload Fenster",
    description:
      "Uploads nur fuer heute und gestern, jeweils spaetestens 24h nach Tagende.",
  },
  {
    title: "Joker Tage",
    description: "2 Joker pro Monat, sichtbar im Dashboard und aktiv waehlbar.",
  },
  {
    title: "Schulden",
    description:
      "Bei unerlaubtem Slack: 10 EUR fuer den ersten Tag, danach +2 EUR je weiterem Tag.",
  },
  {
    title: "Debt Reduction",
    description:
      "Extra im erlaubten Set: 0.05 EUR pro Liegestuetz und 0.02 EUR pro Situp.",
  },
  {
    title: "Onboarding Fenster",
    description:
      "Tag 1-14 sind kostenlos ohne Upload. Fuer Teilnahme mindestens 10 Upload-Tage ab Tag 15.",
  },
];

const cardAnimationStyles: CSSProperties[] = [
  { animationDelay: "20ms" },
  { animationDelay: "80ms" },
  { animationDelay: "140ms" },
  { animationDelay: "200ms" },
];

export function FitcalLandingPage({
  snapshot,
}: {
  snapshot: ChallengeSnapshot;
}) {
  const missedDaysPreview = 3;
  const debtPreview = calculateDebtForMissedDays(missedDaysPreview);

  return (
    <div className="fitcal-bg relative min-h-screen overflow-x-hidden text-[var(--fc-ink)]">
      <div className="fitcal-overlay pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-8 md:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3">
            <span className="fitcal-dot" />
            <p className="text-sm font-medium tracking-[0.14em] text-[var(--fc-muted)] uppercase">
              FitCal Challenge 2026
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="fitcal-btn fitcal-btn-ghost" href="#rules">
              Regeln ansehen
            </Link>
            <Link className="fitcal-btn fitcal-btn-main" href="/login">
              Login
            </Link>
          </div>
        </header>

        <section className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="fitcal-panel fitcal-rise relative overflow-hidden">
            <p className="text-sm tracking-[0.12em] text-[var(--fc-muted)] uppercase">
              365 Tage. 2 Sets. Sauber dokumentiert.
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl leading-[0.94] font-[var(--font-dm-serif-display)] md:text-7xl">
              Klarer Plan fuer
              <br />
              deine Fitness-Challenge
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--fc-muted)] md:text-lg">
              Die Seite zeigt Tagesziel, Joker, offene Uploads und Schulden live
              nach Regelwerk. Tage werden strikt nach Mitteleuropa
              ({snapshot.timezoneLabel}) gerechnet.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="fitcal-btn fitcal-btn-main" href="/login">
                Jetzt einloggen und opt-in
              </Link>
              <Link className="fitcal-btn fitcal-btn-ghost" href="#dashboard">
                Dashboard Preview
              </Link>
            </div>
          </article>

          <aside className="fitcal-panel fitcal-rise grid grid-cols-2 gap-3 [animation-delay:120ms]">
            <div className="fitcal-kpi">
              <p className="fitcal-kpi-label">Heute (Tag)</p>
              <p className="fitcal-kpi-value">{snapshot.challengeDay}</p>
            </div>
            <div className="fitcal-kpi">
              <p className="fitcal-kpi-label">Formelziel</p>
              <p className="fitcal-kpi-value">{snapshot.targetReps}</p>
            </div>
            <div className="fitcal-kpi col-span-2">
              <p className="fitcal-kpi-label">Formel</p>
              <p className="fitcal-kpi-code">
                round_up(1 + 2.5 * sqrt({snapshot.daysSinceStart}))
              </p>
              <p className="mt-2 text-sm text-[var(--fc-muted)]">
                Ziel fuer Situps: <strong>{snapshot.targetReps}</strong> und
                Liegestuetz: <strong>{snapshot.targetReps}</strong>
              </p>
            </div>
          </aside>
        </section>

        <section id="rules" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">Regeln kompakt</h2>
            <p className="text-sm text-[var(--fc-muted)]">
              Schnell scanbar, direkt aus dem Challenge-Briefing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rules.map((rule, index) => (
              <article
                className="fitcal-mini-panel fitcal-rise"
                key={rule.title}
                style={cardAnimationStyles[index % cardAnimationStyles.length]}
              >
                <p className="text-xs font-semibold tracking-[0.11em] text-[var(--fc-muted)] uppercase">
                  {rule.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{rule.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="dashboard" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="fitcal-panel fitcal-rise [animation-delay:60ms]">
            <h3 className="text-2xl font-semibold tracking-tight">Referenzvideos</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fc-muted)]">
              Diese Videos sind in der Plattform verlinkt, damit Ausfuehrung und
              Qualitaet direkt vergleichbar bleiben.
            </p>
            <div className="mt-5 grid gap-3">
              <a
                className="fitcal-link-card"
                href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
                rel="noreferrer"
                target="_blank"
              >
                Liegestuetz Referenzvideo ansehen
              </a>
              <a
                className="fitcal-link-card"
                href="https://www.youtube.com/watch?v=czKvGbo5zAo"
                rel="noreferrer"
                target="_blank"
              >
                Situps Referenzvideo ansehen
              </a>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="fitcal-mini-panel">
                <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                  Joker Kontingent
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {snapshot.monthlyJokerLimit} / Monat
                </p>
              </div>
              <div className="fitcal-mini-panel">
                <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                  Upload Deadline
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {snapshot.uploadWindowHours}h
                </p>
              </div>
            </div>
          </article>

          <article className="fitcal-panel fitcal-rise [animation-delay:180ms]">
            <h3 className="text-2xl font-semibold tracking-tight">Dashboard Preview</h3>
            <p className="mt-2 text-sm text-[var(--fc-muted)]">
              Sicht fuer eingeloggte Nutzer: Tages-Uploads, Joker und Debt-Status.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="fitcal-mini-panel">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Heute: {snapshot.todayLabel}</p>
                  <span className="fitcal-tag fitcal-tag-ok">Upload offen</span>
                </div>
                <p className="mt-2 text-sm text-[var(--fc-muted)]">
                  Ziel: {snapshot.targetReps} Liegestuetz + {snapshot.targetReps}{" "}
                  Situps, verteilt auf max. 2 Sets je Uebung.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="fitcal-input-wrap">
                    Extra Liegestuetz
                    <input className="fitcal-input" defaultValue="8" />
                  </label>
                  <label className="fitcal-input-wrap">
                    Extra Situps
                    <input className="fitcal-input" defaultValue="18" />
                  </label>
                </div>
                <p className="mt-3 text-xs text-[var(--fc-muted)]">
                  Uploads: 1 bis 4 Videos, je Datei max 100 MB.
                </p>
              </div>

              <div className="fitcal-mini-panel">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Gestern: {snapshot.yesterdayLabel}</p>
                  <span className="fitcal-tag">Letzte Chance</span>
                </div>
                <p className="mt-2 text-sm text-[var(--fc-muted)]">
                  Wenn der Tag nicht dokumentiert wird und kein Joker gesetzt ist,
                  startet Debt bei 10 EUR und steigt danach pro weiterem Verstoss.
                </p>
              </div>

              <div className="fitcal-mini-panel">
                <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                  Debt Beispiel
                </p>
                <p className="mt-2 text-sm text-[var(--fc-muted)]">
                  {missedDaysPreview} Regelverstoesse ergeben aktuell{" "}
                  <strong>{debtPreview} EUR</strong> (10, 12, 14 ...).
                </p>
                <p className="mt-2 text-sm text-[var(--fc-muted)]">
                  Reduktion: 0.05 EUR pro extra Liegestuetz, 0.02 EUR pro extra
                  Situp.
                </p>
              </div>
            </div>
          </article>
        </section>

        <footer className="fitcal-panel flex flex-col gap-3 text-sm text-[var(--fc-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Freiphase: Tag 1 bis {snapshot.freeStartDays}. Ab Tag 15 werden
            Uploads erwartet.
          </p>
          <p>Mindestens 10 Upload-Tage sind notwendig, um teilzunehmen.</p>
        </footer>
      </div>
    </div>
  );
}
