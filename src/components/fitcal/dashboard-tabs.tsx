"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { MeasurementChart } from "@/components/fitcal/measurement-chart";
import { PerformanceChart } from "@/components/fitcal/performance-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CHALLENGE_END_DATE,
  CHALLENGE_START_DATE,
  getChallengeDayIndex,
  getRequiredReps,
  isWithinChallenge,
} from "@/lib/challenge";

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
  verifiedPushupTotal: number | null;
  verifiedSitupTotal: number | null;
  reviewStatusLabel: string | null;
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
  existingSlackDays: number;
  monthJokersRemaining: number;
  documentedDays: number;
  dailyMessage: string | null;
};

type ParticipantRow = {
  id: string;
  name: string;
  modeLabel: string;
  todayLabel: string;
  yesterdayLabel: string;
  qualificationLabel: string;
  documentedDays: number;
  debtLabel: string | null;
  reviewLabel: string;
};

type ReviewVideo = {
  id: string;
  label: string;
};

type PrimaryReviewItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  targetReps: number;
  claimedPushups: number;
  claimedSitups: number;
  statusLabel: string | null;
  priorNote: string | null;
  videos: ReviewVideo[];
};

type EscalationReviewItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  targetReps: number;
  claimedPushups: number;
  claimedSitups: number;
  reviewedPushups: number;
  reviewedSitups: number;
  reviewComment: string | null;
  reviewerLabel: string;
  videos: ReviewVideo[];
};

type SicknessReviewItem = {
  id: string;
  challengeDate: string;
  dateLabel: string;
  userLabel: string;
  notes: string | null;
};

const baseTabs = [
  { key: "overview", label: "Übersicht" },
  { key: "uploads", label: "Uploads" },
  { key: "timeline", label: "Timeline" },
  { key: "metastats", label: "Metastats" },
  { key: "regeln", label: "Regeln" },
  { key: "rechner", label: "Rechner" },
] as const;

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

function formatDateKeyForInput(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return "";
  }
  return `${day}.${month}.${year}`;
}

function parseDateInputToDateKey(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const response = await fetch("/api/submissions", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
    redirect: "follow",
  });
  window.location.assign(response.url || "/dashboard?error=Upload%20fehlgeschlagen");
}

export function DashboardTabs({
  escalationReviewItems,
  measurementPoints,
  openDays,
  overview,
  participantRows,
  performancePoints,
  primaryReviewItems,
  profile,
  sicknessReviewItems,
  timelineEntries,
}: {
  escalationReviewItems: EscalationReviewItem[];
  measurementPoints: MeasurementPoint[];
  openDays: OpenDay[];
  overview: OverviewSummary;
  participantRows: ParticipantRow[];
  performancePoints: PerformancePoint[];
  primaryReviewItems: PrimaryReviewItem[];
  profile: ProfileSummary;
  sicknessReviewItems: SicknessReviewItem[];
  timelineEntries: TimelineEntry[];
}) {
  const tabs = useMemo(
    () =>
      overview.isLightParticipant
        ? baseTabs
        : ([...baseTabs.slice(0, 4), { key: "review", label: "Review" }, ...baseTabs.slice(4)] as const),
    [overview.isLightParticipant],
  );
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("overview");
  const [reviewSubtab, setReviewSubtab] = useState<"progress" | "pending">("progress");
  const hasStudentPricing = overview.hasStudentDiscount && !overview.isLightParticipant;
  const slackBaseCents = hasStudentPricing ? 500 : 1000;
  const slackIncrementCents = hasStudentPricing ? 100 : 200;
  const rules = overview.isLightParticipant
    ? [
        "Maximal 2 Sets pro Sportart.",
        "Einträge für heute und gestern bleiben offen.",
        "Qualifikation durch 10 Einträge in den ersten 14 Tagen.",
        "Light heißt: kein Pool, kein Review, keine Kosten.",
        "Du trägst deine Wiederholungen nur als Selbsteintrag ohne Video ein.",
      ]
    : [
        "Maximal 2 Sets pro Sportart.",
        "Videos bis zu 24 Stunden später hochladen.",
        "Qualifikation durch 10 Uploads in den ersten 14 Tagen.",
        "2 neue Slack-Day-Joker pro Monat. Ungenutzte Joker bleiben erhalten.",
        hasStudentPricing
          ? "Slacken kostet 5 €, dann 6 €, 7 €, 8 € und so weiter."
          : "Slacken kostet 10 €, dann 12 €, 14 €, 16 € und so weiter.",
      ];
  const [slackDaysInput, setSlackDaysInput] = useState("1");
  const [debtInput, setDebtInput] = useState((overview.outstandingDebtCents / 100).toFixed(2));
  const [pushupInput, setPushupInput] = useState(String(overview.currentTarget));
  const [situpInput, setSitupInput] = useState(String(overview.currentTarget));
  const [weightInput, setWeightInput] = useState(
    profile.latestWeightKg != null ? String(profile.latestWeightKg).replace(".", ",") : "75",
  );
  const [targetDateInput, setTargetDateInput] = useState(formatDateKeyForInput(CHALLENGE_START_DATE));
  const additionalSlackDays = Math.max(0, Math.floor(parseNumberInput(slackDaysInput)));
  const totalSlackDebtCents = Array.from({ length: additionalSlackDays }, (_, index) => {
    return slackBaseCents + (overview.existingSlackDays + index) * slackIncrementCents;
  }).reduce((sum, value) => sum + value, 0);
  const nextSlackDayCostCents =
    slackBaseCents + overview.existingSlackDays * slackIncrementCents;
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
  const selectedDateKey = parseDateInputToDateKey(targetDateInput);
  const selectedDateInChallenge = selectedDateKey ? isWithinChallenge(selectedDateKey) : false;
  const selectedDateTarget =
    selectedDateKey && selectedDateInChallenge ? getRequiredReps(selectedDateKey) : null;
  const selectedChallengeDay =
    selectedDateKey && selectedDateInChallenge ? getChallengeDayIndex(selectedDateKey) + 1 : null;

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-fitcal-section]"));
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
  }, [tabs]);

  return (
    <div className="grid gap-6 fc-has-bottom-nav">
      <nav className="fc-tab-bar">
        {tabs.map((tab) => (
          <a className={`fc-tab ${activeTab === tab.key ? "is-active" : ""}`} href={`#${tab.key}`} key={tab.key}>
            {tab.label}
          </a>
        ))}
      </nav>

      <section className="fc-section fc-rise" data-fitcal-section id="overview">
        <div className="fc-card-lg">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="warm">Tag {overview.dayNumber}</Badge>
            {overview.isQualificationPhase ? <Badge variant="accent">Quali-Phase</Badge> : null}
            {overview.isLightParticipant ? <Badge>Light</Badge> : null}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-5">
            <div>
              <p className="text-sm text-[var(--fc-muted)]">Heute pro Übung</p>
              <p className="fc-display fc-count-animated mt-1 text-[clamp(3.5rem,8vw,5.5rem)] text-[var(--fc-accent)]">
                {overview.currentTarget}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-[var(--fc-border)] pt-5 sm:grid-cols-3 lg:grid-cols-6">
            <div className="fc-stat">
              <span className="fc-stat-label">{overview.isQualificationPhase ? "Quali-Tag" : "Qualifiziert"}</span>
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
              <span className="fc-stat-label">{overview.isLightParticipant ? "Review" : "Review-Guthaben"}</span>
              <span className="fc-stat-value">{overview.isLightParticipant ? "Aus" : overview.reviewBudgetLabel}</span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-label">{overview.isLightParticipant ? "Pool" : "Joker frei"}</span>
              <span className="fc-stat-value">{overview.isLightParticipant ? "Aus" : overview.monthJokersRemaining}</span>
            </div>
            <div className="fc-stat">
              <span className="fc-stat-label">Tage</span>
              <span className="fc-stat-value">{overview.documentedDays}</span>
            </div>
          </div>

          {overview.dailyMessage ? <p className="fc-daily-message">{overview.dailyMessage}</p> : null}
        </div>
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="uploads">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="fc-heading text-xl">Offene Tage</h2>
          <p className="text-sm text-[var(--fc-muted)]">Upload-Fenster für heute und gestern</p>
        </div>

        <div className="grid gap-4">
          {openDays.length > 0 ? (
            openDays.map((day) => (
              <article className="fc-card" key={day.challengeDate}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="fc-heading text-lg">{day.dateLabel}</h3>
                    <p className="mt-1 text-sm text-[var(--fc-muted)]">
                      {day.targetReps} Liegestütze / {day.targetReps} Sit-ups
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="fc-chip fc-chip-accent">{day.isCurrentDay ? "Heute" : "Gestern"}</span>
                    {day.isQualificationDay ? <span className="fc-chip fc-chip-warm">Quali</span> : null}
                  </div>
                </div>

                <form className="mt-5 space-y-4" encType="multipart/form-data" onSubmit={handleUploadSubmit}>
                  <input name="challengeDate" type="hidden" value={day.challengeDate} />
                  <div className="fc-grid-2">
                    <label className="fc-input-group"><span className="fc-input-label">Liegestütze Set 1</span><input className="fc-input" min="0" name="pushupSet1" required type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">Liegestütze Set 2</span><input className="fc-input" min="0" name="pushupSet2" required type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">Sit-ups Set 1</span><input className="fc-input" min="0" name="situpSet1" required type="number" /></label>
                    <label className="fc-input-group"><span className="fc-input-label">Sit-ups Set 2</span><input className="fc-input" min="0" name="situpSet2" required type="number" /></label>
                  </div>
                  <p className="text-sm text-[var(--fc-muted)]">
                    {overview.isLightParticipant
                      ? "In der Light-Variante speicherst du nur deine Wiederholungen als Selbsteintrag."
                      : "Alles über dem Tagesziel wird automatisch aus deinen Sets berechnet und nur auf offene Schulden angerechnet."}
                  </p>
                  <div
                    className={`grid gap-3 ${
                      overview.isLightParticipant ? "sm:grid-cols-1" : "sm:grid-cols-[1.1fr_0.9fr]"
                    }`}
                  >
                    {!overview.isLightParticipant ? (
                      <label className="fc-input-group"><span className="fc-input-label">Videos</span><input accept="video/*" className="fc-input-file" multiple name="videos" required type="file" /></label>
                    ) : null}
                    <label className="fc-input-group"><span className="fc-input-label">Notiz</span><textarea className="fc-input min-h-[5.5rem]" name="notes" /></label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit">
                      {overview.isLightParticipant ? "Eintrag speichern" : "Workout speichern"}
                    </Button>
                  </div>
                </form>

                {!overview.isLightParticipant ? (
                  <>
                    <details className="mt-4 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-[var(--fc-ink)]">Männergrippe?</summary>
                      <form action="/api/challenge/sickness" className="mt-4 space-y-4" method="post">
                        <input name="challengeDate" type="hidden" value={day.challengeDate} />
                        <label className="flex items-start gap-3 text-sm text-[var(--fc-muted)]">
                          <input className="mt-1" name="consent" type="checkbox" />
                          <span>Ich willige ein und lasse reviewen, dass ich heute leider krank war und deshalb kein Workout machen konnte. Ich beantrage daher, dass heute kein Slack Day war.</span>
                        </label>
                        <label className="fc-input-group">
                          <span className="fc-input-label">Kommentar</span>
                          <textarea className="fc-input min-h-20" name="notes" placeholder="Optional." />
                        </label>
                        <Button type="submit" variant="secondary">Krankmeldung einreichen</Button>
                      </form>
                    </details>

                    {day.canUseJoker ? (
                      <form action="/api/challenge/joker" className="mt-3" method="post">
                        <input name="challengeDate" type="hidden" value={day.challengeDate} />
                        <Button type="submit" variant="secondary">Joker setzen</Button>
                      </form>
                    ) : null}
                  </>
                ) : null}
              </article>
            ))
          ) : (
            <div className="fc-card text-sm text-[var(--fc-muted)]">Aktuell sind keine Einträge offen.</div>
          )}
        </div>
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="timeline">
        <h2 className="fc-heading mb-4 text-xl">Letzte Tage</h2>
        <div className="space-y-0">
          {timelineEntries.map((day) => (
            <div className="fc-timeline-row" key={day.challengeDate}>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{day.dateLabel}</p>
                  {day.reviewStatusLabel ? <span className="fc-chip fc-chip-muted">{day.reviewStatusLabel}</span> : null}
                </div>
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
                          <Button asChild size="sm" variant="ghost">
                            <a href={`/api/videos/${video.id}`} target="_blank">Öffnen</a>
                          </Button>
                          <form action="/api/videos/delete" method="post">
                            <input name="videoId" type="hidden" value={video.id} />
                            <Button size="sm" type="submit" variant="secondary">Löschen</Button>
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
                    <p className="font-medium text-[var(--fc-ink)]">{day.pushupTotal} / {day.situpTotal}</p>
                    <p>L {day.pushupSet1 ?? 0}+{day.pushupSet2 ?? 0} · S {day.situpSet1 ?? 0}+{day.situpSet2 ?? 0}</p>
                    {day.verifiedPushupTotal != null && day.verifiedSitupTotal != null ? (
                      <p className="text-[var(--fc-accent)]">Zählt: {day.verifiedPushupTotal} / {day.verifiedSitupTotal}</p>
                    ) : null}
                    {(day.pushupOverTarget ?? 0) > 0 || (day.situpOverTarget ?? 0) > 0 ? (
                      <p className="text-[var(--fc-accent)]">+{day.pushupOverTarget ?? 0} L · +{day.situpOverTarget ?? 0} S</p>
                    ) : null}
                  </div>
                ) : null}
                {day.debtLabel ? <p className="mt-1 text-sm font-medium text-[var(--fc-warm)]">{day.debtLabel}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="metastats">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fc-kicker">Metastats</p>
            <h2 className="fc-heading mt-1 text-[clamp(1.5rem,2.5vw,2rem)]">Profil und Einträge</h2>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <section className="fc-card">
            <h3 className="fc-heading text-lg">Profil</h3>
            {profile.motivation ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{profile.motivation}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {profile.birthDateLabel ? <div className="fc-stat"><span className="fc-stat-label">Geburtsdatum</span><span className="fc-stat-value text-base">{profile.birthDateLabel}</span></div> : null}
              {profile.heightLabel ? <div className="fc-stat"><span className="fc-stat-label">Körpergröße</span><span className="fc-stat-value text-base">{profile.heightLabel}</span></div> : null}
            </div>
            <form action="/api/profile" className="mt-5 space-y-4" method="post">
              <div className="fc-grid-2">
                <label className="fc-input-group"><span className="fc-input-label">Name</span><input className="fc-input" defaultValue={profile.name ?? ""} name="name" type="text" /></label>
                <label className="fc-input-group"><span className="fc-input-label">Geburtsdatum</span><input className="fc-input" defaultValue={profile.birthDateInput} inputMode="numeric" name="birthDate" pattern="\\d{2}\\.\\d{2}\\.\\d{4}" placeholder="TT.MM.JJJJ" type="text" /></label>
                <label className="fc-input-group"><span className="fc-input-label">Körpergröße in cm</span><input className="fc-input" defaultValue={profile.heightInput} inputMode="decimal" name="heightCm" step="0.1" type="number" /></label>
              </div>
              <label className="fc-input-group"><span className="fc-input-label">Warum machst du das?</span><textarea className="fc-input min-h-20" defaultValue={profile.motivation ?? ""} maxLength={240} name="motivation" placeholder="Optional." /></label>
              <Button type="submit">Profil speichern</Button>
            </form>
          </section>

          <PerformanceChart points={performancePoints} />

          <section className="fc-card">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="fc-kicker">Messdaten</p>
                <h3 className="fc-heading mt-1 text-xl">Einträge</h3>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {profile.weightLabel ? <div className="fc-stat"><span className="fc-stat-label">Gewicht</span><span className="fc-stat-value text-base">{profile.weightLabel}</span></div> : null}
              {profile.waistLabel ? <div className="fc-stat"><span className="fc-stat-label">Bauchumfang</span><span className="fc-stat-value text-base">{profile.waistLabel}</span></div> : null}
            </div>
            <form action="/api/measurements" className="mt-5 space-y-4" method="post">
              <div className="fc-grid-2">
                <label className="fc-input-group"><span className="fc-input-label">Gewicht in kg</span><input className="fc-input" inputMode="decimal" name="weightKg" step="0.1" type="number" /></label>
                <label className="fc-input-group"><span className="fc-input-label">Bauchumfang in cm</span><input className="fc-input" inputMode="decimal" name="waistCircumferenceCm" step="0.1" type="number" /></label>
                <label className="fc-input-group"><span className="fc-input-label">Ruhepuls</span><input className="fc-input" inputMode="numeric" name="restingPulseBpm" type="number" /></label>
              </div>
              <label className="fc-input-group"><span className="fc-input-label">Notiz</span><textarea className="fc-input min-h-20" name="notes" /></label>
              <Button type="submit" variant="secondary">Eintrag speichern</Button>
            </form>
          </section>

          <MeasurementChart points={measurementPoints} />
        </div>
      </section>

      {!overview.isLightParticipant ? (
        <section className="fc-section fc-rise" data-fitcal-section id="review">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="fc-heading text-xl">Review</h2>
            <div className="flex flex-wrap gap-2">
              <button className={`fc-chip ${reviewSubtab === "progress" ? "fc-chip-accent" : "fc-chip-muted"}`} onClick={() => setReviewSubtab("progress")} type="button">Fortschritt</button>
              <button className={`fc-chip ${reviewSubtab === "pending" ? "fc-chip-accent" : "fc-chip-muted"}`} onClick={() => setReviewSubtab("pending")} type="button">Ausstehend</button>
            </div>
          </div>

          {reviewSubtab === "progress" ? (
            <div className="fc-card overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[var(--fc-border)] text-[var(--fc-muted)]">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Modus</th>
                    <th className="pb-3 pr-4 font-medium">Heute</th>
                    <th className="pb-3 pr-4 font-medium">Gestern</th>
                    <th className="pb-3 pr-4 font-medium">Quali</th>
                    <th className="pb-3 pr-4 font-medium">Tage</th>
                    <th className="pb-3 pr-4 font-medium">Schulden</th>
                    <th className="pb-3 font-medium">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {participantRows.map((row) => (
                    <tr className="border-b border-[var(--fc-border)]/70 last:border-b-0" key={row.id}>
                      <td className="py-3 pr-4 font-medium">{row.name}</td>
                      <td className="py-3 pr-4">{row.modeLabel}</td>
                      <td className="py-3 pr-4">{row.todayLabel}</td>
                      <td className="py-3 pr-4">{row.yesterdayLabel}</td>
                      <td className="py-3 pr-4">{row.qualificationLabel}</td>
                      <td className="py-3 pr-4">{row.documentedDays}</td>
                      <td className="py-3 pr-4">{row.debtLabel ?? "—"}</td>
                      <td className="py-3">{row.reviewLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="fc-heading text-lg">Krankmeldungen</h3>
                  <span className="fc-chip fc-chip-muted">{sicknessReviewItems.length} offen</span>
                </div>
                {sicknessReviewItems.length ? sicknessReviewItems.map((item) => (
                  <article className="fc-card" key={item.id}>
                    <div>
                      <h4 className="fc-heading text-lg">{item.userLabel} · {item.dateLabel}</h4>
                      <p className="mt-1 text-sm text-[var(--fc-muted)]">
                        Ich willige ein und lasse reviewen, dass ich heute leider krank war und deshalb kein Workout machen konnte. Ich beantrage daher, dass heute kein Slack Day war.
                      </p>
                      {item.notes ? <p className="mt-2 text-sm text-[var(--fc-muted)]">Kommentar: {item.notes}</p> : null}
                    </div>
                    <form action="/api/challenge/sickness-reviews" className="mt-5 space-y-4" method="post">
                      <input name="verificationId" type="hidden" value={item.id} />
                      <label className="fc-input-group">
                        <span className="fc-input-label">Kommentar</span>
                        <textarea className="fc-input min-h-20" name="notes" placeholder="Optional." />
                      </label>
                      <div className="flex flex-wrap gap-3">
                        <Button name="decision" type="submit" value="approve">Krankmeldung akzeptieren</Button>
                        <Button name="decision" type="submit" value="reject" variant="secondary">Krankmeldung ablehnen</Button>
                      </div>
                    </form>
                  </article>
                )) : <div className="fc-card text-sm text-[var(--fc-muted)]">Keine offenen Krankmeldungen.</div>}
              </div>

              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="fc-heading text-lg">Erstreviews</h3>
                  <span className="fc-chip fc-chip-muted">{primaryReviewItems.length} offen</span>
                </div>
                {primaryReviewItems.length ? primaryReviewItems.map((item) => (
                  <article className="fc-card" key={item.id}>
                    <div><h4 className="fc-heading text-lg">{item.userLabel} · {item.dateLabel}</h4><p className="mt-1 text-sm text-[var(--fc-muted)]">Claim {item.claimedPushups} Liegestütze / {item.claimedSitups} Sit-ups · Ziel {item.targetReps}</p>{item.statusLabel ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{item.statusLabel}</p> : null}{item.priorNote ? <p className="mt-2 text-sm text-[var(--fc-muted)]">{item.priorNote}</p> : null}</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">{item.videos.map((video) => <video className="w-full rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-black" controls key={video.id} preload="metadata" src={`/api/videos/${video.id}`} />)}</div>
                    <form action="/api/workout-reviews" className="mt-5 space-y-4" method="post">
                      <input name="submissionId" type="hidden" value={item.id} />
                      <input name="mode" type="hidden" value="primary" />
                      <div className="fc-grid-2">
                        <label className="fc-input-group"><span className="fc-input-label">Zählende Liegestütze</span><input className="fc-input" defaultValue={item.claimedPushups} max={item.claimedPushups} min="0" name="countedPushups" type="number" /></label>
                        <label className="fc-input-group"><span className="fc-input-label">Zählende Sit-ups</span><input className="fc-input" defaultValue={item.claimedSitups} max={item.claimedSitups} min="0" name="countedSitups" type="number" /></label>
                      </div>
                      <label className="fc-input-group"><span className="fc-input-label">Feedback</span><textarea className="fc-input min-h-20" name="notes" placeholder="Optional." /></label>
                      <div className="flex flex-wrap gap-3">
                        <Button name="decision" type="submit" value="approve">Workout zählt komplett</Button>
                        <Button name="decision" type="submit" value="adjust" variant="secondary">Korrektur einreichen</Button>
                      </div>
                    </form>
                  </article>
                )) : <div className="fc-card text-sm text-[var(--fc-muted)]">Keine offenen Erstreviews.</div>}
              </div>

              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="fc-heading text-lg">Prüf-Reviews</h3>
                  <span className="fc-chip fc-chip-muted">{escalationReviewItems.length} offen</span>
                </div>
                {escalationReviewItems.length ? escalationReviewItems.map((item) => (
                  <article className="fc-card" key={item.id}>
                    <div><h4 className="fc-heading text-lg">{item.userLabel} · {item.dateLabel}</h4><p className="mt-1 text-sm text-[var(--fc-muted)]">Claim {item.claimedPushups} Liegestütze / {item.claimedSitups} Sit-ups · Ziel {item.targetReps}</p><p className="mt-2 text-sm text-[var(--fc-muted)]">{item.reviewerLabel} zählt {item.reviewedPushups} Liegestütze / {item.reviewedSitups} Sit-ups.</p>{item.reviewComment ? <p className="mt-1 text-sm text-[var(--fc-muted)]">Kommentar: {item.reviewComment}</p> : null}</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">{item.videos.map((video) => <video className="w-full rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-black" controls key={video.id} preload="metadata" src={`/api/videos/${video.id}`} />)}</div>
                    <form action="/api/workout-reviews" className="mt-5 space-y-4" method="post">
                      <input name="submissionId" type="hidden" value={item.id} />
                      <input name="mode" type="hidden" value="arbitration" />
                      <label className="fc-input-group"><span className="fc-input-label">Kommentar</span><textarea className="fc-input min-h-20" name="notes" placeholder="Optional." /></label>
                      <div className="flex flex-wrap gap-3">
                        <Button name="decision" type="submit" value="accept">Review bestätigen</Button>
                        <Button name="decision" type="submit" value="reject" variant="secondary">Neue Prüfung anfordern</Button>
                      </div>
                    </form>
                  </article>
                )) : <div className="fc-card text-sm text-[var(--fc-muted)]">Keine offenen Prüf-Reviews.</div>}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <section className="fc-section fc-rise" data-fitcal-section id="regeln">
        <h2 className="fc-heading mb-4 text-xl">Regeln</h2>
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <ol className="fc-rule-list">{rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
          <div>
            {!overview.isLightParticipant ? (
              <>
                <p className="text-sm leading-relaxed text-[var(--fc-muted)]">Die Referenzvideos helfen nur bei der Einordnung. Für die Challenge zählen deine dokumentierten Sets.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <a className="fc-video-link" href="https://www.youtube.com/watch?v=JvX0ilRCBrU" rel="noreferrer" target="_blank">Referenzvideo Liegestütze</a>
                  <a className="fc-video-link" href="https://www.youtube.com/watch?v=czKvGbo5zAo" rel="noreferrer" target="_blank">Referenzvideo Sit-Ups</a>
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--fc-muted)]">
                In Light dokumentierst du nur deine Wiederholungen. Videos, Reviews, Pool und
                Kosten bleiben draußen.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="fc-section fc-rise" data-fitcal-section id="rechner">
        <h2 className="fc-heading mb-4 text-xl">Rechner</h2>
        <div
          className={`grid gap-4 md:grid-cols-2 ${
            overview.isLightParticipant ? "xl:grid-cols-2" : "xl:grid-cols-4"
          }`}
        >
          <section className="fc-card">
            <h3 className="fc-heading text-base">Tagesziel</h3>
            <label className="fc-input-group mt-4"><span className="fc-input-label">Datum</span><input className="fc-input" inputMode="numeric" onChange={(event) => setTargetDateInput(event.target.value)} pattern="\\d{2}\\.\\d{2}\\.\\d{4}" placeholder="TT.MM.JJJJ" type="text" value={targetDateInput} /></label>
            <div className="mt-4 grid gap-2">
              <div className="fc-stat"><span className="fc-stat-label">Challenge-Tag</span><span className="fc-stat-value">{selectedChallengeDay ?? "-"}</span></div>
              <div className="fc-stat"><span className="fc-stat-label">Pro Übung</span><span className="fc-stat-value">{selectedDateTarget ?? "-"}</span></div>
            </div>
            {!selectedDateInChallenge ? <p className="mt-3 text-sm text-[var(--fc-muted)]">Wähle ein Datum zwischen {formatDateKeyForInput(CHALLENGE_START_DATE)} und {formatDateKeyForInput(CHALLENGE_END_DATE)}.</p> : null}
          </section>
          {!overview.isLightParticipant ? (
            <>
              <section className="fc-card">
                <h3 className="fc-heading text-base">Slack-Kosten</h3>
                <div className="mt-4 fc-grid-2">
                  <label className="fc-input-group"><span className="fc-input-label">Bisherige Slack-Tage</span><input className="fc-input" readOnly type="number" value={overview.existingSlackDays} /></label>
                  <label className="fc-input-group"><span className="fc-input-label">Zusätzliche Slack-Tage</span><input className="fc-input" inputMode="numeric" onChange={(event) => setSlackDaysInput(event.target.value)} type="number" value={slackDaysInput} /></label>
                </div>
                <div className="mt-4 grid gap-2">
                  <div className="fc-stat"><span className="fc-stat-label">Gesamt</span><span className="fc-stat-value">{formatCurrency(totalSlackDebtCents)}</span></div>
                  <div className="fc-stat"><span className="fc-stat-label">Nächster Slack-Tag</span><span className="fc-stat-value">{formatCurrency(nextSlackDayCostCents)}</span></div>
                </div>
                <p className="mt-3 text-sm text-[var(--fc-muted)]">
                  Formel: {hasStudentPricing ? "5 € + 1 €" : "10 € + 2 €"} × bisherige
                  Slack-Tage, jeweils für den nächsten zusätzlichen Tag.
                </p>
              </section>
              <section className="fc-card">
                <h3 className="fc-heading text-base">Schuldabbau</h3>
                <label className="fc-input-group mt-4"><span className="fc-input-label">Schulden in €</span><input className="fc-input" inputMode="decimal" onChange={(event) => setDebtInput(event.target.value)} type="number" value={debtInput} /></label>
                <div className="mt-4 grid gap-2">
                  <div className="fc-stat"><span className="fc-stat-label">Nur Liegestütze</span><span className="fc-stat-value">{pushupsForDebt}</span></div>
                  <div className="fc-stat"><span className="fc-stat-label">Nur Sit-ups</span><span className="fc-stat-value">{situpsForDebt}</span></div>
                  <div className="fc-stat"><span className="fc-stat-label">Gemischt</span><span className="fc-stat-value text-sm">{mixedPushups} L + {mixedSitups} S</span></div>
                </div>
                <p className="mt-3 text-sm text-[var(--fc-muted)]">Rechnet mit 10 ct pro extra Liegestütz und 5 ct pro extra Sit-up.</p>
              </section>
            </>
          ) : null}
          <section className="fc-card">
            <h3 className="fc-heading text-base">Kalorien</h3>
            <div className="mt-4 fc-grid-2">
              <label className="fc-input-group"><span className="fc-input-label">Liegestütze gesamt</span><input className="fc-input" inputMode="numeric" onChange={(event) => setPushupInput(event.target.value)} type="number" value={pushupInput} /></label>
              <label className="fc-input-group"><span className="fc-input-label">Sit-ups gesamt</span><input className="fc-input" inputMode="numeric" onChange={(event) => setSitupInput(event.target.value)} type="number" value={situpInput} /></label>
              <label className="fc-input-group col-span-full"><span className="fc-input-label">Gewicht in kg</span><input className="fc-input" inputMode="decimal" onChange={(event) => setWeightInput(event.target.value)} type="number" value={weightInput} /></label>
            </div>
            <div className="mt-4 grid gap-2">
              <div className="fc-stat"><span className="fc-stat-label">Liegestütze</span><span className="fc-stat-value">{pushupCalories.toFixed(1).replace(".", ",")} kcal</span></div>
              <div className="fc-stat"><span className="fc-stat-label">Sit-ups</span><span className="fc-stat-value">{situpCalories.toFixed(1).replace(".", ",")} kcal</span></div>
              <div className="fc-stat"><span className="fc-stat-label">Gesamt</span><span className="fc-stat-value">{totalCalories.toFixed(1).replace(".", ",")} kcal</span></div>
            </div>
            <p className="mt-3 text-sm text-[var(--fc-muted)]">Grobe Schätzung auf Basis von Wiederholungen und Körpergewicht.</p>
          </section>
        </div>
      </section>
    </div>
  );
}
