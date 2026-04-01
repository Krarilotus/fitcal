import Link from "next/link";
import { redirect } from "next/navigation";
import { FlashMessage } from "@/components/fitcal/flash-message";
import {
  CHALLENGE_END_DATE,
  CHALLENGE_FREE_DAYS,
  CHALLENGE_START_DATE,
  MIN_DOCUMENTED_DAYS_FOR_PARTICIPATION,
  formatCurrencyFromCents,
  getChallengeOverview,
  getRequiredReps,
} from "@/lib/challenge";
import { getCurrentUser } from "@/lib/auth/session";
import { deserializeSets } from "@/lib/submission";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Erledigt";
    case "joker":
      return "Joker";
    case "slack":
      return "Slack";
    case "free":
      return "Gratis";
    case "open":
      return "Offen";
    default:
      return "Spaeter";
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;
  const records = user.dailySubmissions.map((submission) => ({
    challengeDate: submission.challengeDate,
    status: submission.status,
    extraPushups: submission.extraPushups,
    extraSitups: submission.extraSitups,
  }));
  const overview = user.challengeEnrollment
    ? getChallengeOverview({
        joinedChallengeDate: user.challengeEnrollment.joinedChallengeDate,
        records,
      })
    : null;
  const openDays = overview?.days.filter((day) => day.canUpload) ?? [];
  const recentDays = overview?.days.slice(-12).reverse() ?? [];

  return (
    <div className="fitcal-bg min-h-screen px-6 py-8 text-[var(--fc-ink)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.14em] text-[var(--fc-muted)] uppercase">
              Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-[var(--font-dm-serif-display)]">
              {user.name || user.email}
            </h1>
            <p className="mt-2 text-sm text-[var(--fc-muted)]">
              Challenge vom {CHALLENGE_START_DATE} bis {CHALLENGE_END_DATE} nach
              Europe/Berlin.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="fitcal-btn fitcal-btn-ghost" href="/">
              Regeln
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="fitcal-btn fitcal-btn-main" type="submit">
                Logout
              </button>
            </form>
          </div>
        </header>

        <FlashMessage error={error} success={success} />

        {!user.challengeEnrollment ? (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="fitcal-panel">
              <p className="text-sm tracking-[0.14em] text-[var(--fc-muted)] uppercase">
                Noch nicht aktiv
              </p>
              <h2 className="mt-3 text-4xl font-[var(--font-dm-serif-display)]">
                Challenge jetzt opt-in aktivieren.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--fc-muted)]">
                Mit dem Opt-in startet deine persoenliche Challenge-Zaehlung ab
                heute. Die ersten {CHALLENGE_FREE_DAYS} globalen Challenge-Tage sind
                gratis und ohne Uploads, danach sind nur heutige und gestrige Tage
                dokumentierbar.
              </p>
              <form action="/api/challenge/opt-in" className="mt-6" method="post">
                <button className="fitcal-btn fitcal-btn-main" type="submit">
                  Challenge beitreten
                </button>
              </form>
            </article>

            <article className="fitcal-panel">
              <h3 className="text-2xl font-semibold">Was danach im Dashboard passiert</h3>
              <div className="mt-4 grid gap-3">
                <div className="fitcal-mini-panel">
                  Tagesziel wird nach `round_up(1 + 2.5 * sqrt(days since 2026-04-01))`
                  fuer beide Uebungen angezeigt.
                </div>
                <div className="fitcal-mini-panel">
                  Pro Tag kannst du 1 bis 4 Videos hochladen und Extras fuer
                  Schuldenreduktion eintragen.
                </div>
                <div className="fitcal-mini-panel">
                  2 Joker pro Monat stehen direkt als Aktion fuer offene Tage bereit.
                </div>
              </div>
            </article>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="fitcal-kpi">
                <p className="fitcal-kpi-label">Heute Ziel / Uebung</p>
                <p className="fitcal-kpi-value">{overview?.currentTarget ?? 0}</p>
              </article>
              <article className="fitcal-kpi">
                <p className="fitcal-kpi-label">Offene Schulden</p>
                <p className="fitcal-kpi-value">
                  {formatCurrencyFromCents(overview?.outstandingDebtCents ?? 0)}
                </p>
              </article>
              <article className="fitcal-kpi">
                <p className="fitcal-kpi-label">Joker diesen Monat</p>
                <p className="fitcal-kpi-value">
                  {overview?.monthJokersRemaining ?? 0} frei
                </p>
              </article>
              <article className="fitcal-kpi">
                <p className="fitcal-kpi-label">Dokumentierte Tage</p>
                <p className="fitcal-kpi-value">{overview?.documentedDays ?? 0}</p>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="fitcal-panel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">Upload-Fenster</h2>
                    <p className="mt-2 text-sm text-[var(--fc-muted)]">
                      Heute und gestern sind offen, solange sie noch nicht
                      dokumentiert wurden. Jede Datei darf bis 100 MB gross sein.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--fc-panel-stroke)] bg-white/60 px-4 py-3 text-sm text-[var(--fc-muted)]">
                    Minimum fuer Teilnahme:{" "}
                    <strong>{MIN_DOCUMENTED_DAYS_FOR_PARTICIPATION} Upload-Tage</strong>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  {openDays.length > 0 ? (
                    openDays.map((day) => (
                      <article className="fitcal-mini-panel space-y-4" key={day.challengeDate}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                              Upload fuer {day.challengeDate}
                            </p>
                            <h3 className="mt-1 text-xl font-semibold">
                              Ziel: {getRequiredReps(day.challengeDate)} Liegestuetz und{" "}
                              {getRequiredReps(day.challengeDate)} Situps
                            </h3>
                          </div>
                          <span className="fitcal-tag">
                            {day.isCurrentDay ? "Heute" : "Gestern"}
                          </span>
                        </div>

                        <form
                          action="/api/submissions"
                          className="space-y-4"
                          encType="multipart/form-data"
                          method="post"
                        >
                          <input
                            name="challengeDate"
                            type="hidden"
                            value={day.challengeDate}
                          />
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="fitcal-input-wrap">
                              Liegestuetz Set 1
                              <input className="fitcal-input" min="0" name="pushupSet1" required type="number" />
                            </label>
                            <label className="fitcal-input-wrap">
                              Liegestuetz Set 2
                              <input className="fitcal-input" min="0" name="pushupSet2" required type="number" />
                            </label>
                            <label className="fitcal-input-wrap">
                              Situps Set 1
                              <input className="fitcal-input" min="0" name="situpSet1" required type="number" />
                            </label>
                            <label className="fitcal-input-wrap">
                              Situps Set 2
                              <input className="fitcal-input" min="0" name="situpSet2" required type="number" />
                            </label>
                            <label className="fitcal-input-wrap">
                              Extra Liegestuetz
                              <input className="fitcal-input" min="0" name="extraPushups" required type="number" />
                            </label>
                            <label className="fitcal-input-wrap">
                              Extra Situps
                              <input className="fitcal-input" min="0" name="extraSitups" required type="number" />
                            </label>
                          </div>

                          <label className="fitcal-input-wrap">
                            Videos (1 bis 4 Dateien)
                            <input
                              accept="video/*"
                              className="fitcal-input"
                              multiple
                              name="videos"
                              required
                              type="file"
                            />
                          </label>

                          <label className="fitcal-input-wrap">
                            Notiz
                            <textarea className="fitcal-input min-h-28" name="notes" />
                          </label>

                          <button className="fitcal-btn fitcal-btn-main" type="submit">
                            Workout speichern
                          </button>
                        </form>

                        {day.canUseJoker ? (
                          <form action="/api/challenge/joker" method="post">
                            <input
                              name="challengeDate"
                              type="hidden"
                              value={day.challengeDate}
                            />
                            <button className="fitcal-btn fitcal-btn-ghost" type="submit">
                              Joker fuer {day.challengeDate}
                            </button>
                          </form>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <div className="fitcal-mini-panel">
                      Fuer heute und gestern gibt es aktuell keine offenen Uploads mehr.
                    </div>
                  )}
                </div>
              </article>

              <article className="fitcal-panel">
                <h2 className="text-2xl font-semibold">Status und Historie</h2>
                <div className="mt-5 grid gap-3">
                  <div className="fitcal-mini-panel">
                    <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                      Schuldenaufbau
                    </p>
                    <p className="mt-2 text-sm text-[var(--fc-muted)]">
                      Verpasste Tage ausserhalb der Regeln kosten 10 EUR, danach je
                      weiterem Slack-Tag 2 EUR mehr. Extra-Wiederholungen reduzieren
                      die Summe um 0,05 EUR bzw. 0,02 EUR.
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      Gesamt: {formatCurrencyFromCents(overview?.totalDebtCents ?? 0)} /
                      Reduktion: {formatCurrencyFromCents(overview?.totalDebtReductionCents ?? 0)}
                    </p>
                  </div>
                  <div className="fitcal-mini-panel">
                    <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                      Upload-Fortschritt
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {overview?.documentedDays ?? 0} / {MIN_DOCUMENTED_DAYS_FOR_PARTICIPATION}
                    </p>
                    <p className="mt-2 text-sm text-[var(--fc-muted)]">
                      Die ersten {CHALLENGE_FREE_DAYS} Challenge-Tage sind gratis und
                      ohne Uploadpflicht.
                    </p>
                  </div>
                  <div className="fitcal-mini-panel">
                    <p className="text-xs tracking-[0.1em] text-[var(--fc-muted)] uppercase">
                      Referenzen
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <a href="https://www.youtube.com/watch?v=JvX0ilRCBrU" rel="noreferrer" target="_blank">
                        Liegestuetz-Video
                      </a>
                      <a href="https://www.youtube.com/watch?v=czKvGbo5zAo" rel="noreferrer" target="_blank">
                        Situp-Video
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section className="fitcal-panel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">Letzte Tage</h2>
                <p className="text-sm text-[var(--fc-muted)]">
                  Schnelluebersicht ueber Upload-, Joker- und Slack-Status.
                </p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {recentDays.map((day) => {
                  const submission = user.dailySubmissions.find(
                    (entry) => entry.challengeDate === day.challengeDate,
                  );
                  const pushupSets = submission ? deserializeSets(submission.pushupSets) : [];
                  const situpSets = submission ? deserializeSets(submission.situpSets) : [];

                  return (
                    <article className="fitcal-mini-panel" key={day.challengeDate}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{day.challengeDate}</p>
                          <p className="text-sm text-[var(--fc-muted)]">
                            Ziel {day.repsTarget} / Uebung
                          </p>
                        </div>
                        <span className="fitcal-tag">{statusLabel(day.status)}</span>
                      </div>
                      {submission ? (
                        <div className="mt-3 text-sm text-[var(--fc-muted)]">
                          <p>Liegestuetz: {pushupSets.join(" + ") || "0"}</p>
                          <p>Situps: {situpSets.join(" + ") || "0"}</p>
                          <p>
                            Extras: +{submission.extraPushups} Liegestuetz / +
                            {submission.extraSitups} Situps
                          </p>
                        </div>
                      ) : null}
                      {day.debtCents > 0 ? (
                        <p className="mt-3 text-sm font-semibold text-amber-900">
                          Slack-Kosten: {formatCurrencyFromCents(day.debtCents)}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
