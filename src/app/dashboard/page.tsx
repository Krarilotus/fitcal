import Link from "next/link";
import { redirect } from "next/navigation";
import { FlashMessage } from "@/components/fitcal/flash-message";
import { MeasurementChart } from "@/components/fitcal/measurement-chart";
import { PerformanceChart } from "@/components/fitcal/performance-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CHALLENGE_END_DATE,
  CHALLENGE_FREE_DAYS,
  CHALLENGE_START_DATE,
  formatCurrencyFromCents,
  getChallengeOverview,
  getRequiredReps,
} from "@/lib/challenge";
import { getCurrentUser } from "@/lib/auth/session";
import { formatMeasurementDate } from "@/lib/measurements";
import { getSpecialDayNote } from "@/lib/special-day";
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
      return "Quali";
    case "open":
      return "Offen";
    default:
      return "Später";
  }
}

function formatBirthDate(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null) {
    return null;
  }

  return value.toFixed(digits).replace(".", ",");
}

function formatChallengeDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
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
  const overview = getChallengeOverview({
    joinedChallengeDate: user.challengeEnrollment?.joinedChallengeDate ?? CHALLENGE_START_DATE,
    records,
  });
  const openDays = overview.days.filter((day) => day.canUpload);
  const recentDays = overview.days.slice(-12).reverse();
  const performancePoints = user.dailySubmissions
    .filter((submission) => submission.status === "COMPLETED")
    .map((submission) => {
      const pushupSets = deserializeSets(submission.pushupSets);
      const situpSets = deserializeSets(submission.situpSets);

      return {
        challengeDate: submission.challengeDate,
        pushups: pushupSets.reduce((sum, value) => sum + value, 0),
        situps: situpSets.reduce((sum, value) => sum + value, 0),
        pushupSet1: pushupSets[0] ?? 0,
        pushupSet2: pushupSets[1] ?? 0,
        situpSet1: situpSets[0] ?? 0,
        situpSet2: situpSets[1] ?? 0,
        target: getRequiredReps(submission.challengeDate),
      };
    })
    .slice(-24);
  const measurementPoints = user.measurements.slice(-18).map((entry) => ({
    measuredAt: formatMeasurementDate(entry.measuredAt),
    weightKg: entry.weightKg,
    waistCircumferenceCm: entry.waistCircumferenceCm,
    restingPulseBpm: entry.restingPulseBpm,
  }));
  const latestMeasurement = user.measurements.at(-1) ?? null;
  const birthDateLabel = formatBirthDate(user.birthDate);
  const totalPushups = performancePoints.reduce((sum, point) => sum + point.pushups, 0);
  const totalSitups = performancePoints.reduce((sum, point) => sum + point.situps, 0);
  const specialDayNote = getSpecialDayNote({
    currentDate: overview.currentDate,
    currentTarget: overview.currentTarget,
    name: user.name ?? null,
    birthDate: user.birthDate ?? null,
    latestWeightKg: latestMeasurement?.weightKg ?? null,
    latestWaistCm: latestMeasurement?.waistCircumferenceCm ?? null,
    outstandingDebtCents: overview.outstandingDebtCents,
    totalPushups,
    totalSitups,
    documentedDays: overview.documentedDays,
    motivation: user.motivation ?? null,
  });

  return (
    <div className="fitcal-shell min-h-screen px-4 py-5 text-[var(--fc-ink)] sm:px-6 sm:py-8">
      <div className="fitcal-noise pointer-events-none absolute inset-0 -z-20" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="fitcal-topbar">
          <div className="space-y-2">
            <p className="fitcal-section-kicker">Dashboard</p>
            <h1 className="text-4xl leading-[0.94] font-[var(--font-dm-serif-display)] sm:text-5xl">
              {user.name || user.email}
            </h1>
            <p className="text-sm text-[var(--fc-muted)]">
              {CHALLENGE_START_DATE} bis {CHALLENGE_END_DATE} · Europe/Berlin
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/">Start</Link>
            </Button>
            <form action="/api/auth/logout" method="post">
              <Button type="submit">Logout</Button>
            </form>
          </div>
        </header>

        <FlashMessage error={error} success={success} />

        {specialDayNote ? (
          <section className="fitcal-special-day fitcal-rise">
            <p className="fitcal-section-kicker">Besonderer Tag</p>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                  {specialDayNote.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--fc-muted)] sm:text-base">
                  {specialDayNote.body}
                </p>
              </div>
              <Badge variant="warm">{formatChallengeDate(overview.currentDate)}</Badge>
            </div>
          </section>
        ) : null}

        <section className="fitcal-dashboard-hero fitcal-rise">
          <div className="fitcal-target-panel">
            <Badge variant="warm">
              Tag {overview.days.at(-1)?.dayIndex != null ? overview.days.at(-1)!.dayIndex + 1 : 0}
            </Badge>
            <div className="mt-5 flex flex-wrap items-end gap-5">
              <div>
                <p className="fitcal-soft-label">Heute pro Übung</p>
                <p className="mt-2 text-6xl leading-none font-semibold tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                  {overview.currentTarget}
                </p>
              </div>
              <p className="max-w-md text-sm leading-7 text-[var(--fc-muted)]">
                Die Challenge läuft direkt mit deinem Account. In den ersten{" "}
                {CHALLENGE_FREE_DAYS} Tagen zählen Uploads für die Qualifikation,
                danach regeln Joker oder Schulden den Stand.
              </p>
            </div>
          </div>

          <div className="fitcal-stat-ribbon">
            <div>
              <span>Qualifikation</span>
              <strong>
                {overview.qualificationUploads} / {overview.qualificationRequiredUploads}
              </strong>
            </div>
            <div>
              <span>Offene Schulden</span>
              <strong>{formatCurrencyFromCents(overview.outstandingDebtCents)}</strong>
            </div>
            <div>
              <span>Joker frei</span>
              <strong>{overview.monthJokersRemaining}</strong>
            </div>
            <div>
              <span>Dokumentierte Tage</span>
              <strong>{overview.documentedDays}</strong>
            </div>
          </div>
        </section>

        <section className="fitcal-dashboard-grid">
          <div className="space-y-6">
            <section className="fitcal-stream-panel fitcal-rise">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="fitcal-section-kicker">Upload</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    Offene Tage
                  </h2>
                </div>
                <p className="text-sm text-[var(--fc-muted)]">
                  Maximal 4 Videos. Max. 100 MB pro Datei.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {openDays.length > 0 ? (
                  openDays.map((day) => (
                    <article className="fitcal-upload-slab" key={day.challengeDate}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="fitcal-soft-label">
                            {formatChallengeDate(day.challengeDate)}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold">
                            {getRequiredReps(day.challengeDate)} Liegestütze /{" "}
                            {getRequiredReps(day.challengeDate)} Sit-ups
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="fitcal-status-pill">
                            {day.isCurrentDay ? "Heute" : "Gestern"}
                          </span>
                          {day.status === "free" ? (
                            <span className="fitcal-status-pill">Quali</span>
                          ) : null}
                        </div>
                      </div>

                      <form
                        action="/api/submissions"
                        className="mt-5 space-y-4"
                        encType="multipart/form-data"
                        method="post"
                      >
                        <input
                          name="challengeDate"
                          type="hidden"
                          value={day.challengeDate}
                        />

                        <div className="fitcal-field-grid">
                          <label className="fitcal-input-wrap">
                            Liegestütze Set 1
                            <input className="fitcal-input" min="0" name="pushupSet1" required type="number" />
                          </label>
                          <label className="fitcal-input-wrap">
                            Liegestütze Set 2
                            <input className="fitcal-input" min="0" name="pushupSet2" required type="number" />
                          </label>
                          <label className="fitcal-input-wrap">
                            Sit-ups Set 1
                            <input className="fitcal-input" min="0" name="situpSet1" required type="number" />
                          </label>
                          <label className="fitcal-input-wrap">
                            Sit-ups Set 2
                            <input className="fitcal-input" min="0" name="situpSet2" required type="number" />
                          </label>
                          <label className="fitcal-input-wrap">
                            Extra Liegestütze
                            <input className="fitcal-input" min="0" name="extraPushups" required type="number" />
                          </label>
                          <label className="fitcal-input-wrap">
                            Extra Sit-ups
                            <input className="fitcal-input" min="0" name="extraSitups" required type="number" />
                          </label>
                        </div>

                        <div className="fitcal-upload-grid">
                          <label className="fitcal-input-wrap">
                            Videos
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
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button type="submit">Workout speichern</Button>
                        </div>
                      </form>

                      {day.canUseJoker ? (
                        <form action="/api/challenge/joker" className="mt-3" method="post">
                          <input
                            name="challengeDate"
                            type="hidden"
                            value={day.challengeDate}
                          />
                          <Button type="submit" variant="secondary">
                            Joker setzen
                          </Button>
                        </form>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="fitcal-empty-state">Aktuell sind keine Uploads offen.</div>
                )}
              </div>
            </section>

            <PerformanceChart points={performancePoints} />
          </div>

          <aside className="space-y-6">
            <section className="fitcal-stream-panel fitcal-rise">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="fitcal-section-kicker">Profil</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    Profil und Messwerte
                  </h2>
                </div>
                {user.motivation ? <Badge>{user.motivation}</Badge> : null}
              </div>

              <div className="mt-5 fitcal-profile-grid">
                {birthDateLabel ? (
                  <div>
                    <span className="fitcal-soft-label">Geburtsdatum</span>
                    <strong>{birthDateLabel}</strong>
                  </div>
                ) : null}
                {user.heightCm != null ? (
                  <div>
                    <span className="fitcal-soft-label">Körpergröße</span>
                    <strong>{formatNumber(user.heightCm, 0)} cm</strong>
                  </div>
                ) : null}
                {latestMeasurement?.weightKg != null ? (
                  <div>
                    <span className="fitcal-soft-label">Gewicht</span>
                    <strong>{formatNumber(latestMeasurement.weightKg)} kg</strong>
                  </div>
                ) : null}
                {latestMeasurement?.waistCircumferenceCm != null ? (
                  <div>
                    <span className="fitcal-soft-label">Bauchumfang</span>
                    <strong>{formatNumber(latestMeasurement.waistCircumferenceCm)} cm</strong>
                  </div>
                ) : null}
              </div>

              <form action="/api/measurements" className="mt-6 space-y-4" method="post">
                <div className="fitcal-field-grid">
                  <label className="fitcal-input-wrap">
                    Gewicht in kg
                    <input className="fitcal-input" inputMode="decimal" name="weightKg" step="0.1" type="number" />
                  </label>
                  <label className="fitcal-input-wrap">
                    Bauchumfang in cm
                    <input
                      className="fitcal-input"
                      inputMode="decimal"
                      name="waistCircumferenceCm"
                      step="0.1"
                      type="number"
                    />
                  </label>
                  <label className="fitcal-input-wrap">
                    Ruhepuls
                    <input className="fitcal-input" inputMode="numeric" name="restingPulseBpm" type="number" />
                  </label>
                </div>
                <label className="fitcal-input-wrap">
                  Notiz
                  <textarea className="fitcal-input min-h-24" name="notes" />
                </label>
                <Button type="submit" variant="secondary">
                  Messpunkt speichern
                </Button>
              </form>
            </section>

            <section className="fitcal-stream-panel fitcal-rise">
              <p className="fitcal-section-kicker">Stand</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="fitcal-mini-panel">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="fitcal-soft-label">Leistung</span>
                    <strong>{totalPushups + totalSitups} Wdh.</strong>
                  </div>
                  <p className="mt-2 text-sm text-[var(--fc-muted)]">
                    {totalPushups} Liegestütze und {totalSitups} Sit-ups in den letzten{" "}
                    {performancePoints.length} dokumentierten Tagen.
                  </p>
                </div>
                <div className="fitcal-mini-panel">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="fitcal-soft-label">Schuldenstand</span>
                    <strong>{formatCurrencyFromCents(overview.totalDebtCents)}</strong>
                  </div>
                  <p className="mt-2 text-sm text-[var(--fc-muted)]">
                    Reduktion: {formatCurrencyFromCents(overview.totalDebtReductionCents)}
                  </p>
                </div>
              </div>
            </section>

            <section className="fitcal-stream-panel fitcal-rise">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="fitcal-section-kicker">Timeline</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    Letzte Tage
                  </h2>
                </div>
                <Badge>
                  {overview.qualificationUploads} / {overview.qualificationRequiredUploads}
                </Badge>
              </div>

              <div className="mt-5 space-y-3">
                {recentDays.map((day) => {
                  const submission = user.dailySubmissions.find(
                    (entry) => entry.challengeDate === day.challengeDate,
                  );
                  const pushupSets = submission ? deserializeSets(submission.pushupSets) : [];
                  const situpSets = submission ? deserializeSets(submission.situpSets) : [];

                  return (
                    <div className="fitcal-timeline-row" key={day.challengeDate}>
                      <div className="space-y-3">
                        <p className="font-semibold">{formatChallengeDate(day.challengeDate)}</p>
                        <p className="text-sm text-[var(--fc-muted)]">
                          Ziel {day.repsTarget} je Übung
                        </p>
                        {submission?.videos.length ? (
                          <div className="fitcal-video-admin-list">
                            {submission.videos.map((video) => (
                              <div className="fitcal-video-admin-row" key={video.id}>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {video.originalName}
                                  </p>
                                  <p className="text-xs text-[var(--fc-muted)]">
                                    {formatFileSize(video.sizeBytes)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button asChild className="px-3 py-2 text-xs" variant="ghost">
                                    <a href={`/api/videos/${video.id}`} target="_blank">
                                      Öffnen
                                    </a>
                                  </Button>
                                  <form action="/api/videos/delete" method="post">
                                    <input name="videoId" type="hidden" value={video.id} />
                                    <Button
                                      className="px-3 py-2 text-xs"
                                      type="submit"
                                      variant="secondary"
                                    >
                                      Löschen
                                    </Button>
                                  </form>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="fitcal-tag">{statusLabel(day.status)}</span>
                        {submission ? (
                          <div className="mt-2 space-y-1 text-sm text-[var(--fc-muted)]">
                            <p>
                              {pushupSets.reduce((sum, value) => sum + value, 0)} /{" "}
                              {situpSets.reduce((sum, value) => sum + value, 0)}
                            </p>
                            <p>
                              L {pushupSets[0] ?? 0} + {pushupSets[1] ?? 0} · S{" "}
                              {situpSets[0] ?? 0} + {situpSets[1] ?? 0}
                            </p>
                          </div>
                        ) : null}
                        {day.debtCents > 0 ? (
                          <p className="mt-1 text-sm text-amber-900">
                            {formatCurrencyFromCents(day.debtCents)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  className="fitcal-video-link"
                  href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
                  rel="noreferrer"
                  target="_blank"
                >
                  Liegestütze
                </a>
                <a
                  className="fitcal-video-link"
                  href="https://www.youtube.com/watch?v=czKvGbo5zAo"
                  rel="noreferrer"
                  target="_blank"
                >
                  Sit-ups
                </a>
              </div>
            </section>

            <MeasurementChart points={measurementPoints} />
          </aside>
        </section>
      </div>
    </div>
  );
}
