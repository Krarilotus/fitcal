"use client";

import { useEffect, useState } from "react";
import { MeasurementChart } from "@/components/fitcal/measurement-chart";
import { PerformanceChart } from "@/components/fitcal/performance-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type OpenDay = {
  challengeDate: string;
  dateLabel: string;
  targetReps: number;
  isCurrentDay: boolean;
  isQualificationDay: boolean;
  canUseJoker: boolean;
};

type TimelineVideo = {
  id: string;
  originalName: string;
  sizeLabel: string;
};

type TimelineEntry = {
  challengeDate: string;
  dateLabel: string;
  repsTarget: number;
  statusLabel: string;
  debtLabel: string | null;
  pushupTotal: number | null;
  situpTotal: number | null;
  pushupSet1: number | null;
  pushupSet2: number | null;
  situpSet1: number | null;
  situpSet2: number | null;
  pushupOverTarget: number | null;
  situpOverTarget: number | null;
  videos: TimelineVideo[];
};

type PerformancePoint = {
  challengeDate: string;
  pushups: number;
  situps: number;
  pushupSet1: number;
  pushupSet2: number;
  situpSet1: number;
  situpSet2: number;
  target: number;
};

type MeasurementPoint = {
  measuredAt: string;
  weightKg: number | null;
  waistCircumferenceCm: number | null;
  restingPulseBpm: number | null;
};

type ProfileSummary = {
  name: string | null;
  motivation: string | null;
  birthDateInput: string;
  birthDateLabel: string | null;
  heightInput: string;
  heightLabel: string | null;
  weightLabel: string | null;
  waistLabel: string | null;
  latestWeightKg: number | null;
};

type OverviewSummary = {
  dayNumber: number;
  currentTarget: number;
  isQualificationPhase: boolean;
  qualificationDay: number;
  qualificationWindowDays: number;
  qualificationUploads: number;
  qualificationRequiredUploads: number;
  outstandingDebtLabel: string;
  outstandingDebtCents: number;
  hasStudentDiscount: boolean;
  monthJokersRemaining: number;
  documentedDays: number;
  dailyMessage: string | null;
};

const tabs = [
  { key: "overview", label: "Übersicht" },
  { key: "uploads", label: "Uploads" },
  { key: "timeline", label: "Timeline" },
  { key: "metastats", label: "Metastats" },
  { key: "regeln", label: "Regeln" },
  { key: "rechner", label: "Rechner" },
] as const;

const rules = [
  "Maximal 2 Sets pro Sportart.",
  "Videos bis zu 24 Stunden später hochladen.",
  "Qualifikation durch 10 Uploads in den ersten 14 Tagen.",
  "2 Slack-Day-Joker pro Monat.",
  "Slacken kostet 10 €, dann 12 €, 14 €, 16 € und so weiter.",
  "Maximal 4 Videos, weil maximal 4 Sets dokumentiert werden.",
  "Max. 100 MB pro Datei.",
];

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function parseNumberInput(value: string, fallback = 0) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function DashboardTabs({
  openDays,
  timelineEntries,
  performancePoints,
  measurementPoints,
  profile,
  overview,
}: {
  openDays: OpenDay[];
  timelineEntries: TimelineEntry[];
  performancePoints: PerformancePoint[];
  measurementPoints: MeasurementPoint[];
  profile: ProfileSummary;
  overview: OverviewSummary;
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("overview");
  const [slackDaysInput, setSlackDaysInput] = useState("10");
  const [debtInput, setDebtInput] = useState((overview.outstandingDebtCents / 100).toFixed(2));
  const [pushupInput, setPushupInput] = useState(String(overview.currentTarget));
  const [situpInput, setSitupInput] = useState(String(overview.currentTarget));
  const [weightInput, setWeightInput] = useState(
    profile.latestWeightKg != null ? String(profile.latestWeightKg).replace(".", ",") : "75",
  );

  const slackDays = Math.max(0, Math.floor(parseNumberInput(slackDaysInput)));
  const totalSlackDebtCents = Array.from({ length: slackDays }, (_, index) => {
    const fullDebt = 1000 + index * 200;
    return overview.hasStudentDiscount ? Math.round(fullDebt / 2) : fullDebt;
  }).reduce((sum, value) => sum + value, 0);
  const slackPreview = Array.from({ length: Math.min(slackDays, 6) }, (_, index) =>
    formatCurrency(overview.hasStudentDiscount ? Math.round((1000 + index * 200) / 2) : 1000 + index * 200),
  );
  const debtCents = Math.max(0, Math.round(parseNumberInput(debtInput) * 100));
  const pushupsForDebt = Math.ceil(debtCents / 5);
  const situpsForDebt = Math.ceil(debtCents / 2);
  const mixedPushups = Math.ceil(debtCents / 14);
  const mixedSitups = Math.max(0, Math.ceil((debtCents - mixedPushups * 5) / 2));
  const pushups = Math.max(0, Math.floor(parseNumberInput(pushupInput)));
  const situps = Math.max(0, Math.floor(parseNumberInput(situpInput)));
  const weightKg = Math.max(1, parseNumberInput(weightInput, profile.latestWeightKg ?? 75));
  const pushupCalories = pushups * 0.45 * (weightKg / 75);
  const situpCalories = situps * 0.3 * (weightKg / 75);
  const totalCalories = pushupCalories + situpCalories;

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-fitcal-section]"),
    );

    if (!sections.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveTab(visible.target.id as (typeof tabs)[number]["key"]);
        }
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fitcal-tab-shell">
      <nav className="fitcal-tab-bar">
        {tabs.map((tab) => (
          <a
            className={`fitcal-tab-trigger ${activeTab === tab.key ? "is-active" : ""}`}
            href={`#${tab.key}`}
            key={tab.key}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <section className="fitcal-scroll-section fitcal-rise" data-fitcal-section id="overview">
        <div className="fitcal-section-head">
          <div>
            <p className="fitcal-section-kicker">Übersicht</p>
            <h2 className="fitcal-section-title">Heute zählt nur, was wirklich drinsteht.</h2>
          </div>
        </div>

        <div className="fitcal-target-panel">
          <Badge variant="warm">Tag {overview.dayNumber}</Badge>
          <div className="mt-5 flex flex-wrap items-end gap-5">
            <div>
              <p className="fitcal-soft-label">Heute pro Übung</p>
              <p className="mt-2 text-6xl leading-none font-semibold tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                {overview.currentTarget}
              </p>
            </div>
          </div>

          <div className="fitcal-status-strip">
            <div className="fitcal-status-chip">
              <span>{overview.isQualificationPhase ? "Quali-Tag" : "Qualifiziert"}</span>
              <strong>
                {overview.isQualificationPhase
                  ? `${overview.qualificationDay}/${overview.qualificationWindowDays}`
                  : `${overview.qualificationUploads}/${overview.qualificationRequiredUploads}`}
              </strong>
            </div>
            <div className="fitcal-status-chip">
              <span>Uploads</span>
              <strong>
                {overview.qualificationUploads}/{overview.qualificationRequiredUploads}
              </strong>
            </div>
            <div className="fitcal-status-chip">
              <span>Schulden offen</span>
              <strong>{overview.outstandingDebtLabel}</strong>
            </div>
            <div className="fitcal-status-chip">
              <span>Joker frei</span>
              <strong>{overview.monthJokersRemaining}</strong>
            </div>
            <div className="fitcal-status-chip">
              <span>Tage gesamt</span>
              <strong>{overview.documentedDays}</strong>
            </div>
          </div>

          {overview.dailyMessage ? (
            <p className="fitcal-status-message">{overview.dailyMessage}</p>
          ) : null}
        </div>
      </section>

      <section className="fitcal-scroll-section fitcal-rise" data-fitcal-section id="uploads">
        <div className="fitcal-section-head">
          <div>
            <p className="fitcal-section-kicker">Uploads</p>
            <h2 className="fitcal-section-title">Offene Tage</h2>
          </div>
          <p className="text-sm text-[var(--fc-muted)]">Maximal 4 Videos. Max. 100 MB pro Datei.</p>
        </div>

        <div className="fitcal-section-stack">
          {openDays.length > 0 ? (
            openDays.map((day) => (
              <article className="fitcal-upload-slab" key={day.challengeDate}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="fitcal-soft-label">{day.dateLabel}</p>
                    <h3 className="mt-2 text-xl font-semibold">
                      {day.targetReps} Liegestütze / {day.targetReps} Sit-ups
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="fitcal-status-pill">
                      {day.isCurrentDay ? "Heute" : "Gestern"}
                    </span>
                    {day.isQualificationDay ? <span className="fitcal-status-pill">Quali</span> : null}
                  </div>
                </div>

                <form
                  action="/api/submissions"
                  className="mt-5 space-y-4"
                  encType="multipart/form-data"
                  method="post"
                >
                  <input name="challengeDate" type="hidden" value={day.challengeDate} />

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
                  </div>

                  <p className="text-sm text-[var(--fc-muted)]">
                    Alles über dem Tagesziel wird automatisch aus deinen Sets berechnet und nur auf offene
                    Schulden angerechnet.
                  </p>

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
                    <input name="challengeDate" type="hidden" value={day.challengeDate} />
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

      <section className="fitcal-scroll-section fitcal-rise" data-fitcal-section id="timeline">
        <div className="fitcal-section-head">
          <div>
            <p className="fitcal-section-kicker">Timeline</p>
            <h2 className="fitcal-section-title">Letzte Tage</h2>
          </div>
        </div>

        <div className="fitcal-section-stack">
          {timelineEntries.map((day) => (
            <div className="fitcal-timeline-row" key={day.challengeDate}>
              <div className="space-y-3">
                <p className="font-semibold">{day.dateLabel}</p>
                <p className="text-sm text-[var(--fc-muted)]">Ziel {day.repsTarget} je Übung</p>
                {day.videos.length ? (
                  <div className="fitcal-video-admin-list">
                    {day.videos.map((video) => (
                      <div className="fitcal-video-admin-row" key={video.id}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{video.originalName}</p>
                          <p className="text-xs text-[var(--fc-muted)]">{video.sizeLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild className="px-3 py-2 text-xs" variant="ghost">
                            <a href={`/api/videos/${video.id}`} target="_blank">
                              Öffnen
                            </a>
                          </Button>
                          <form action="/api/videos/delete" method="post">
                            <input name="videoId" type="hidden" value={video.id} />
                            <Button className="px-3 py-2 text-xs" type="submit" variant="secondary">
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
                <span className="fitcal-tag">{day.statusLabel}</span>
                {day.pushupTotal != null && day.situpTotal != null ? (
                  <div className="mt-2 space-y-1 text-sm text-[var(--fc-muted)]">
                    <p>
                      {day.pushupTotal} / {day.situpTotal}
                    </p>
                    <p>
                      L {day.pushupSet1 ?? 0} + {day.pushupSet2 ?? 0} · S {day.situpSet1 ?? 0} +{" "}
                      {day.situpSet2 ?? 0}
                    </p>
                    {(day.pushupOverTarget ?? 0) > 0 || (day.situpOverTarget ?? 0) > 0 ? (
                      <p>
                        Über Soll: +{day.pushupOverTarget ?? 0} Liegestütze · +{day.situpOverTarget ?? 0} Sit-ups
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {day.debtLabel ? <p className="mt-1 text-sm text-amber-900">{day.debtLabel}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="fitcal-scroll-section fitcal-rise" data-fitcal-section id="metastats">
        <div className="fitcal-section-head">
          <div>
            <p className="fitcal-section-kicker">Metastats</p>
            <h2 className="fitcal-section-title">Profil, Messdaten und Verlauf</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="fitcal-stream-panel">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="fitcal-section-kicker">Profil</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Basisdaten</h3>
                </div>
                {profile.motivation ? <Badge>{profile.motivation}</Badge> : null}
              </div>

              <div className="mt-5 fitcal-profile-grid">
                {profile.birthDateLabel ? (
                  <div>
                    <span className="fitcal-soft-label">Geburtsdatum</span>
                    <strong>{profile.birthDateLabel}</strong>
                  </div>
                ) : null}
                {profile.heightLabel ? (
                  <div>
                    <span className="fitcal-soft-label">Körpergröße</span>
                    <strong>{profile.heightLabel}</strong>
                  </div>
                ) : null}
              </div>

              <form action="/api/profile" className="mt-6 space-y-4" method="post">
                <div className="fitcal-field-grid">
                  <label className="fitcal-input-wrap">
                    Name
                    <input className="fitcal-input" defaultValue={profile.name ?? ""} name="name" type="text" />
                  </label>
                  <label className="fitcal-input-wrap">
                    Geburtsdatum
                    <input
                      className="fitcal-input"
                      defaultValue={profile.birthDateInput}
                      inputMode="numeric"
                      name="birthDate"
                      pattern="\d{2}\.\d{2}\.\d{4}"
                      placeholder="TT.MM.JJJJ"
                      type="text"
                    />
                  </label>
                  <label className="fitcal-input-wrap">
                    Körpergröße in cm
                    <input
                      className="fitcal-input"
                      defaultValue={profile.heightInput}
                      inputMode="decimal"
                      name="heightCm"
                      step="0.1"
                      type="number"
                    />
                  </label>
                </div>
                <label className="fitcal-input-wrap">
                  Warum machst du das?
                  <textarea
                    className="fitcal-input min-h-24"
                    defaultValue={profile.motivation ?? ""}
                    maxLength={240}
                    name="motivation"
                    placeholder="Optional."
                  />
                </label>
                <Button type="submit">Profil speichern</Button>
              </form>
            </section>

            <PerformanceChart points={performancePoints} />
          </div>

          <div className="space-y-6">
            <section className="fitcal-stream-panel">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="fitcal-section-kicker">Messdaten</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Verlauf und Einträge</h3>
                </div>
              </div>

              <div className="mt-5 fitcal-profile-grid">
                {profile.weightLabel ? (
                  <div>
                    <span className="fitcal-soft-label">Gewicht</span>
                    <strong>{profile.weightLabel}</strong>
                  </div>
                ) : null}
                {profile.waistLabel ? (
                  <div>
                    <span className="fitcal-soft-label">Bauchumfang</span>
                    <strong>{profile.waistLabel}</strong>
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

            <MeasurementChart points={measurementPoints} />
          </div>
        </div>
      </section>

      <section className="fitcal-scroll-section fitcal-rise" data-fitcal-section id="regeln">
        <div className="fitcal-section-head">
          <div>
            <p className="fitcal-section-kicker">Regeln</p>
            <h2 className="fitcal-section-title">Der Rahmen</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="fitcal-section-stack">
            <ol className="fitcal-rule-list">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>

          <section className="fitcal-proof-panel">
            <div>
              <p className="fitcal-section-kicker">Referenz</p>
              <p className="mt-3 text-3xl leading-tight font-[var(--font-dm-serif-display)]">
                Technik und Vergleichsvideos.
              </p>
            </div>

            <p className="text-sm leading-7 text-[rgba(246,239,227,0.78)]">
              Die Referenzvideos helfen nur bei der Einordnung. Für die Challenge zählen deine dokumentierten Sets.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                className="fitcal-video-link"
                href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
                rel="noreferrer"
                target="_blank"
              >
                Referenzvideo Liegestütze
              </a>
              <a
                className="fitcal-video-link"
                href="https://www.youtube.com/watch?v=czKvGbo5zAo"
                rel="noreferrer"
                target="_blank"
              >
                Referenzvideo Sit-Ups
              </a>
            </div>
          </section>
        </div>
      </section>

      <section className="fitcal-scroll-section fitcal-rise" data-fitcal-section id="rechner">
        <div className="fitcal-section-head">
          <div>
            <p className="fitcal-section-kicker">Rechner</p>
            <h2 className="fitcal-section-title">Schnell überschlagen statt raten.</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="fitcal-stream-panel">
            <p className="fitcal-section-kicker">Slack-Kosten</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Wie teuer werden weitere Slack-Tage?</h3>
            <label className="fitcal-input-wrap mt-5">
              Anzahl Slack-Tage
              <input
                className="fitcal-input"
                inputMode="numeric"
                onChange={(event) => setSlackDaysInput(event.target.value)}
                type="number"
                value={slackDaysInput}
              />
            </label>
            <div className="mt-5 fitcal-profile-grid">
              <div>
                <span className="fitcal-soft-label">Gesamt</span>
                <strong>{formatCurrency(totalSlackDebtCents)}</strong>
              </div>
              <div>
                <span className="fitcal-soft-label">Staffelung</span>
                <strong>{slackPreview.length ? slackPreview.join(" · ") : "—"}</strong>
              </div>
            </div>
            {slackDays > 6 ? (
              <p className="mt-4 text-sm text-[var(--fc-muted)]">
                Danach geht es im selben Muster weiter: immer 2 € mehr pro zusätzlichem Slack-Tag.
              </p>
            ) : null}
          </section>

          <section className="fitcal-stream-panel">
            <p className="fitcal-section-kicker">Schuldabbau</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Wie viele Extras gleichen Schulden aus?</h3>
            <label className="fitcal-input-wrap mt-5">
              Schulden in €
              <input
                className="fitcal-input"
                inputMode="decimal"
                onChange={(event) => setDebtInput(event.target.value)}
                type="number"
                value={debtInput}
              />
            </label>
            <div className="mt-5 fitcal-profile-grid">
              <div>
                <span className="fitcal-soft-label">Nur Liegestütze</span>
                <strong>{pushupsForDebt}</strong>
              </div>
              <div>
                <span className="fitcal-soft-label">Nur Sit-ups</span>
                <strong>{situpsForDebt}</strong>
              </div>
              <div>
                <span className="fitcal-soft-label">Gemischt, grob</span>
                <strong>
                  {mixedPushups} Liegestütze + {mixedSitups} Sit-ups
                </strong>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--fc-muted)]">
              Rechnet mit 5 ct pro extra Liegestütz und 2 ct pro extra Sit-up. Angerechnet wird nur auf offene Schulden.
            </p>
          </section>

          <section className="fitcal-stream-panel">
            <p className="fitcal-section-kicker">Kalorien</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Was verbrennt ein Satz ungefähr?</h3>
            <div className="mt-5 fitcal-field-grid">
              <label className="fitcal-input-wrap">
                Liegestütze gesamt
                <input
                  className="fitcal-input"
                  inputMode="numeric"
                  onChange={(event) => setPushupInput(event.target.value)}
                  type="number"
                  value={pushupInput}
                />
              </label>
              <label className="fitcal-input-wrap">
                Sit-ups gesamt
                <input
                  className="fitcal-input"
                  inputMode="numeric"
                  onChange={(event) => setSitupInput(event.target.value)}
                  type="number"
                  value={situpInput}
                />
              </label>
              <label className="fitcal-input-wrap lg:col-span-2">
                Gewicht in kg
                <input
                  className="fitcal-input"
                  inputMode="decimal"
                  onChange={(event) => setWeightInput(event.target.value)}
                  type="number"
                  value={weightInput}
                />
              </label>
            </div>
            <div className="mt-5 fitcal-profile-grid">
              <div>
                <span className="fitcal-soft-label">Liegestütze</span>
                <strong>{pushupCalories.toFixed(1).replace(".", ",")} kcal</strong>
              </div>
              <div>
                <span className="fitcal-soft-label">Sit-ups</span>
                <strong>{situpCalories.toFixed(1).replace(".", ",")} kcal</strong>
              </div>
              <div>
                <span className="fitcal-soft-label">Gesamt grob</span>
                <strong>{totalCalories.toFixed(1).replace(".", ",")} kcal</strong>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--fc-muted)]">
              Grobe Schätzung auf Basis von Wiederholungen und Körpergewicht, eher als Orientierung als als Wissenschaft.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
