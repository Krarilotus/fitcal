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
  reviewBudgetLabel: string;
  reviewBudgetCents: number;
  hasStudentDiscount: boolean;
  isLightParticipant: boolean;
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
  "2 neue Slack-Day-Joker pro Monat. Ungenutzte Joker bleiben erhalten.",
  "Slacken kostet 10 €, dann 12 €, 14 €, 16 € und so weiter.",
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
  const pushupsForDebt = Math.ceil(debtCents / 10);
  const situpsForDebt = Math.ceil(debtCents / 5);
  const mixedPushups = Math.ceil(debtCents / 25);
  const mixedSitups = Math.max(0, Math.ceil((debtCents - mixedPushups * 10) / 5));
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
    <div className="grid gap-6 fc-has-bottom-nav">
      {/* ── Tab navigation ── */}
      <nav className="fc-tab-bar">
        {tabs.map((tab) => (
          <a
            className={`fc-tab ${activeTab === tab.key ? "is-active" : ""}`}
            href={`#${tab.key}`}
            key={tab.key}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════
          OVERVIEW
         ══════════════════════════════════════════════ */}
      <section className="fc-section fc-rise" data-fitcal-section id="overview">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fc-kicker">Übersicht</p>
            <h2 className="fc-heading mt-1 text-[clamp(1.5rem,2.5vw,2rem)]">
              Heute zählt nur, was wirklich drinsteht.
            </h2>
          </div>
        </div>

        <div className="fc-card-lg">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="warm">Tag {overview.dayNumber}</Badge>
            {overview.isQualificationPhase && <Badge variant="accent">Quali-Phase</Badge>}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-5">
            <div>
              <p className="fc-kicker">Heute pro Übung</p>
              <p className="fc-display fc-count-animated mt-2 text-[clamp(3.5rem,8vw,5.5rem)] text-[var(--fc-accent)]">
                {overview.currentTarget}
              </p>
            </div>
          </div>

          {/* Status chips grid */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-[rgba(255,255,255,0.06)] pt-5 sm:grid-cols-3 lg:grid-cols-6">
            <div className="fc-stat">
              <span className="fc-stat-label">
                {overview.isQualificationPhase ? "Quali-Tag" : "Qualifiziert"}
              </span>
              <span className="fc-stat-value">
                {overview.isQualificationPhase
                  ? `${overview.qualificationDay}/${overview.qualificationWindowDays}`
                  : `${overview.qualificationUploads}/${overview.qualificationRequiredUploads}`}
              </span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-label">Uploads</span>
              <span className="fc-stat-value">
                {overview.qualificationUploads}/{overview.qualificationRequiredUploads}
              </span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-label">{overview.isLightParticipant ? "Modus" : "Schulden"}</span>
              <span className="fc-stat-value">{overview.isLightParticipant ? "Light" : overview.outstandingDebtLabel}</span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-label">{overview.isLightParticipant ? "Pool" : "Review"}</span>
              <span className="fc-stat-value">{overview.isLightParticipant ? "Aus" : overview.reviewBudgetLabel}</span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-label">{overview.isLightParticipant ? "Pool" : "Joker frei"}</span>
              <span className="fc-stat-value">{overview.isLightParticipant ? "Aus" : overview.monthJokersRemaining}</span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-label">{overview.isLightParticipant ? "Review" : "Tage"}</span>
              <span className="fc-stat-value">{overview.isLightParticipant ? "Aus" : overview.documentedDays}</span>
            </div>
          </div>

          {overview.dailyMessage ? (
            <p className="fc-daily-message">{overview.dailyMessage}</p>
          ) : null}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          UPLOADS
         ══════════════════════════════════════════════ */}
      <section className="fc-section fc-rise" data-fitcal-section id="uploads">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fc-kicker">Uploads</p>
            <h2 className="fc-heading mt-1 text-[clamp(1.5rem,2.5vw,2rem)]">Offene Tage</h2>
          </div>
          <p className="text-sm text-[var(--fc-muted)]">Maximal 4 Videos · Max. 100 MB</p>
        </div>

        <div className="grid gap-4">
          {overview.isLightParticipant ? (
            <div className="fc-card text-sm text-[var(--fc-muted)]">
              In der Light-Variante sind Uploads und Joker ausgeblendet.
            </div>
          ) : openDays.length > 0 ? (
            openDays.map((day) => (
              <article className="fc-card" key={day.challengeDate}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="fc-kicker">{day.dateLabel}</p>
                    <h3 className="fc-heading mt-1.5 text-xl">
                      {day.targetReps} Liegestütze / {day.targetReps} Sit-ups
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="fc-chip fc-chip-accent">
                      {day.isCurrentDay ? "Heute" : "Gestern"}
                    </span>
                    {day.isQualificationDay ? <span className="fc-chip fc-chip-warm">Quali</span> : null}
                  </div>
                </div>

                <form
                  action="/api/submissions"
                  className="mt-5 space-y-4"
                  encType="multipart/form-data"
                  method="post"
                >
                  <input name="challengeDate" type="hidden" value={day.challengeDate} />

                  <div className="fc-grid-2">
                    <label className="fc-input-group">
                      <span className="fc-input-label">Liegestütze Set 1</span>
                      <input className="fc-input" min="0" name="pushupSet1" required type="number" />
                    </label>
                    <label className="fc-input-group">
                      <span className="fc-input-label">Liegestütze Set 2</span>
                      <input className="fc-input" min="0" name="pushupSet2" required type="number" />
                    </label>
                    <label className="fc-input-group">
                      <span className="fc-input-label">Sit-ups Set 1</span>
                      <input className="fc-input" min="0" name="situpSet1" required type="number" />
                    </label>
                    <label className="fc-input-group">
                      <span className="fc-input-label">Sit-ups Set 2</span>
                      <input className="fc-input" min="0" name="situpSet2" required type="number" />
                    </label>
                  </div>

                  <p className="text-sm text-[var(--fc-muted)]">
                    Alles über dem Tagesziel wird automatisch aus deinen Sets berechnet und nur auf offene
                    Schulden angerechnet.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                    <label className="fc-input-group">
                      <span className="fc-input-label">Videos</span>
                      <input
                        accept="video/*"
                        className="fc-input-file"
                        multiple
                        name="videos"
                        required
                        type="file"
                      />
                    </label>
                    <label className="fc-input-group">
                      <span className="fc-input-label">Notiz</span>
                      <textarea className="fc-input min-h-[5.5rem]" name="notes" />
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
            <div className="fc-card text-sm text-[var(--fc-muted)]">Aktuell sind keine Uploads offen.</div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TIMELINE
         ══════════════════════════════════════════════ */}
      <section className="fc-section fc-rise" data-fitcal-section id="timeline">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fc-kicker">Timeline</p>
            <h2 className="fc-heading mt-1 text-[clamp(1.5rem,2.5vw,2rem)]">Letzte Tage</h2>
          </div>
        </div>

        <div className="fc-card">
          {timelineEntries.map((day) => (
            <div className="fc-timeline-row" key={day.challengeDate}>
              <div className="space-y-2">
                <p className="font-semibold">{day.dateLabel}</p>
                <p className="text-sm text-[var(--fc-muted)]">Ziel {day.repsTarget} je Übung</p>
                {day.videos.length ? (
                  <div className="mt-2 grid gap-2">
                    {day.videos.map((video) => (
                      <div className="fc-video-row" key={video.id}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{video.originalName}</p>
                          <p className="text-xs text-[var(--fc-muted)]">{video.sizeLabel}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button asChild variant="ghost" size="sm">
                            <a href={`/api/videos/${video.id}`} target="_blank">
                              Öffnen
                            </a>
                          </Button>
                          <form action="/api/videos/delete" method="post">
                            <input name="videoId" type="hidden" value={video.id} />
                            <Button size="sm" type="submit" variant="secondary">
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
                <span className="fc-tag">{day.statusLabel}</span>
                {day.pushupTotal != null && day.situpTotal != null ? (
                  <div className="mt-2 space-y-0.5 text-sm text-[var(--fc-muted)]">
                    <p className="font-medium text-[var(--fc-ink)]">
                      {day.pushupTotal} / {day.situpTotal}
                    </p>
                    <p>
                      L {day.pushupSet1 ?? 0}+{day.pushupSet2 ?? 0} · S {day.situpSet1 ?? 0}+{day.situpSet2 ?? 0}
                    </p>
                    {(day.pushupOverTarget ?? 0) > 0 || (day.situpOverTarget ?? 0) > 0 ? (
                      <p className="text-[var(--fc-accent)]">
                        +{day.pushupOverTarget ?? 0} L · +{day.situpOverTarget ?? 0} S
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {day.debtLabel ? <p className="mt-1 text-sm font-medium text-[var(--fc-warm)]">{day.debtLabel}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          METASTATS
         ══════════════════════════════════════════════ */}
      <section className="fc-section fc-rise" data-fitcal-section id="metastats">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fc-kicker">Metastats</p>
            <h2 className="fc-heading mt-1 text-[clamp(1.5rem,2.5vw,2rem)]">Profil, Messdaten und Verlauf</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            {/* Profile */}
            <section className="fc-card">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="fc-kicker">Profil</p>
                  <h3 className="fc-heading mt-1 text-xl">Basisdaten</h3>
                </div>
                {profile.motivation ? <Badge>{profile.motivation}</Badge> : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {profile.birthDateLabel ? (
                  <div className="fc-stat">
                    <span className="fc-stat-label">Geburtsdatum</span>
                    <span className="fc-stat-value text-base">{profile.birthDateLabel}</span>
                  </div>
                ) : null}
                {profile.heightLabel ? (
                  <div className="fc-stat">
                    <span className="fc-stat-label">Körpergröße</span>
                    <span className="fc-stat-value text-base">{profile.heightLabel}</span>
                  </div>
                ) : null}
              </div>

              <form action="/api/profile" className="mt-5 space-y-4" method="post">
                <div className="fc-grid-2">
                  <label className="fc-input-group">
                    <span className="fc-input-label">Name</span>
                    <input className="fc-input" defaultValue={profile.name ?? ""} name="name" type="text" />
                  </label>
                  <label className="fc-input-group">
                    <span className="fc-input-label">Geburtsdatum</span>
                    <input
                      className="fc-input"
                      defaultValue={profile.birthDateInput}
                      inputMode="numeric"
                      name="birthDate"
                      pattern="\d{2}\.\d{2}\.\d{4}"
                      placeholder="TT.MM.JJJJ"
                      type="text"
                    />
                  </label>
                  <label className="fc-input-group">
                    <span className="fc-input-label">Körpergröße in cm</span>
                    <input
                      className="fc-input"
                      defaultValue={profile.heightInput}
                      inputMode="decimal"
                      name="heightCm"
                      step="0.1"
                      type="number"
                    />
                  </label>
                </div>
                <label className="fc-input-group">
                  <span className="fc-input-label">Warum machst du das?</span>
                  <textarea
                    className="fc-input min-h-20"
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
            {/* Measurements */}
            <section className="fc-card">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="fc-kicker">Messdaten</p>
                  <h3 className="fc-heading mt-1 text-xl">Verlauf und Einträge</h3>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {profile.weightLabel ? (
                  <div className="fc-stat">
                    <span className="fc-stat-label">Gewicht</span>
                    <span className="fc-stat-value text-base">{profile.weightLabel}</span>
                  </div>
                ) : null}
                {profile.waistLabel ? (
                  <div className="fc-stat">
                    <span className="fc-stat-label">Bauchumfang</span>
                    <span className="fc-stat-value text-base">{profile.waistLabel}</span>
                  </div>
                ) : null}
              </div>

              <form action="/api/measurements" className="mt-5 space-y-4" method="post">
                <div className="fc-grid-2">
                  <label className="fc-input-group">
                    <span className="fc-input-label">Gewicht in kg</span>
                    <input className="fc-input" inputMode="decimal" name="weightKg" step="0.1" type="number" />
                  </label>
                  <label className="fc-input-group">
                    <span className="fc-input-label">Bauchumfang in cm</span>
                    <input
                      className="fc-input"
                      inputMode="decimal"
                      name="waistCircumferenceCm"
                      step="0.1"
                      type="number"
                    />
                  </label>
                  <label className="fc-input-group">
                    <span className="fc-input-label">Ruhepuls</span>
                    <input className="fc-input" inputMode="numeric" name="restingPulseBpm" type="number" />
                  </label>
                </div>
                <label className="fc-input-group">
                  <span className="fc-input-label">Notiz</span>
                  <textarea className="fc-input min-h-20" name="notes" />
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

      {/* ══════════════════════════════════════════════
          REGELN
         ══════════════════════════════════════════════ */}
      <section className="fc-section fc-rise" data-fitcal-section id="regeln">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fc-kicker">Regeln</p>
            <h2 className="fc-heading mt-1 text-[clamp(1.5rem,2.5vw,2rem)]">Der Rahmen</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="fc-card">
            <ol className="fc-rule-list">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>

          <div className="fc-card-dark">
            <div>
              <span className="fc-kicker">Referenz</span>
              <p className="fc-heading mt-2 text-2xl">
                Technik und Vergleichsvideos.
              </p>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[var(--fc-muted)]">
              Die Referenzvideos helfen nur bei der Einordnung. Für die Challenge zählen deine dokumentierten Sets.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                className="fc-video-link"
                href="https://www.youtube.com/watch?v=JvX0ilRCBrU"
                rel="noreferrer"
                target="_blank"
              >
                Referenzvideo Liegestütze
              </a>
              <a
                className="fc-video-link"
                href="https://www.youtube.com/watch?v=czKvGbo5zAo"
                rel="noreferrer"
                target="_blank"
              >
                Referenzvideo Sit-Ups
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          RECHNER
         ══════════════════════════════════════════════ */}
      <section className="fc-section fc-rise" data-fitcal-section id="rechner">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fc-kicker">Rechner</p>
            <h2 className="fc-heading mt-1 text-[clamp(1.5rem,2.5vw,2rem)]">Schnell überschlagen statt raten.</h2>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Slack costs */}
          <section className="fc-card">
            <p className="fc-kicker">Slack-Kosten</p>
            <h3 className="fc-heading mt-1 text-lg">Wie teuer werden weitere Slack-Tage?</h3>
            <label className="fc-input-group mt-4">
              <span className="fc-input-label">Anzahl Slack-Tage</span>
              <input
                className="fc-input"
                inputMode="numeric"
                onChange={(event) => setSlackDaysInput(event.target.value)}
                type="number"
                value={slackDaysInput}
              />
            </label>
            <div className="mt-4 grid gap-2">
              <div className="fc-stat">
                <span className="fc-stat-label">Gesamt</span>
                <span className="fc-stat-value">{formatCurrency(totalSlackDebtCents)}</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-label">Staffelung</span>
                <span className="fc-stat-value text-sm">{slackPreview.length ? slackPreview.join(" · ") : "—"}</span>
              </div>
            </div>
            {slackDays > 6 ? (
              <p className="mt-3 text-sm text-[var(--fc-muted)]">
                Danach geht es im selben Muster weiter: immer 2 € mehr pro zusätzlichem Slack-Tag.
              </p>
            ) : null}
          </section>

          {/* Debt reduction */}
          <section className="fc-card">
            <p className="fc-kicker">Schuldabbau</p>
            <h3 className="fc-heading mt-1 text-lg">Wie viele Extras gleichen Schulden aus?</h3>
            <label className="fc-input-group mt-4">
              <span className="fc-input-label">Schulden in €</span>
              <input
                className="fc-input"
                inputMode="decimal"
                onChange={(event) => setDebtInput(event.target.value)}
                type="number"
                value={debtInput}
              />
            </label>
            <div className="mt-4 grid gap-2">
              <div className="fc-stat">
                <span className="fc-stat-label">Nur Liegestütze</span>
                <span className="fc-stat-value">{pushupsForDebt}</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-label">Nur Sit-ups</span>
                <span className="fc-stat-value">{situpsForDebt}</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-label">Gemischt</span>
                <span className="fc-stat-value text-sm">{mixedPushups} L + {mixedSitups} S</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--fc-muted)]">
              Rechnet mit 10 ct pro extra Liegestütz und 5 ct pro extra Sit-up.
            </p>
          </section>

          {/* Calories */}
          <section className="fc-card">
            <p className="fc-kicker">Kalorien</p>
            <h3 className="fc-heading mt-1 text-lg">Was verbrennt ein Satz ungefähr?</h3>
            <div className="mt-4 fc-grid-2">
              <label className="fc-input-group">
                <span className="fc-input-label">Liegestütze gesamt</span>
                <input
                  className="fc-input"
                  inputMode="numeric"
                  onChange={(event) => setPushupInput(event.target.value)}
                  type="number"
                  value={pushupInput}
                />
              </label>
              <label className="fc-input-group">
                <span className="fc-input-label">Sit-ups gesamt</span>
                <input
                  className="fc-input"
                  inputMode="numeric"
                  onChange={(event) => setSitupInput(event.target.value)}
                  type="number"
                  value={situpInput}
                />
              </label>
              <label className="fc-input-group col-span-full">
                <span className="fc-input-label">Gewicht in kg</span>
                <input
                  className="fc-input"
                  inputMode="decimal"
                  onChange={(event) => setWeightInput(event.target.value)}
                  type="number"
                  value={weightInput}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-2">
              <div className="fc-stat">
                <span className="fc-stat-label">Liegestütze</span>
                <span className="fc-stat-value">{pushupCalories.toFixed(1).replace(".", ",")} kcal</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-label">Sit-ups</span>
                <span className="fc-stat-value">{situpCalories.toFixed(1).replace(".", ",")} kcal</span>
              </div>
              <div className="fc-stat">
                <span className="fc-stat-label">Gesamt</span>
                <span className="fc-stat-value">{totalCalories.toFixed(1).replace(".", ",")} kcal</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--fc-muted)]">
              Grobe Schätzung auf Basis von Wiederholungen und Körpergewicht.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
