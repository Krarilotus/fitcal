const BERLIN_TIMEZONE = "Europe/Berlin";
const DAY_MS = 24 * 60 * 60 * 1000;
const CHALLENGE_START_UTC = Date.UTC(2026, 3, 1);

export type ChallengeSnapshot = {
  todayLabel: string;
  yesterdayLabel: string;
  timezoneLabel: string;
  challengeDay: number;
  daysSinceStart: number;
  targetReps: number;
  monthlyJokerLimit: number;
  freeStartDays: number;
  uploadWindowHours: number;
};

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function getBerlinCalendarDate(date: Date): CalendarDate {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

function toUtcMidnight(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function formatBerlinDateFromUtc(dateUtcMs: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateUtcMs));
}

export function getTargetReps(daysSinceStart: number): number {
  return Math.ceil(1 + 2.5 * Math.sqrt(Math.max(daysSinceStart, 0)));
}

export function calculateDebtForMissedDays(missedDays: number): number {
  const safeMissedDays = Math.max(0, Math.floor(missedDays));
  return safeMissedDays * (safeMissedDays + 9);
}

export function getChallengeSnapshot(now: Date = new Date()): ChallengeSnapshot {
  const berlinDate = getBerlinCalendarDate(now);
  const todayUtc = toUtcMidnight(berlinDate);
  const yesterdayUtc = todayUtc - DAY_MS;
  const daysSinceStart = Math.max(
    0,
    Math.floor((todayUtc - CHALLENGE_START_UTC) / DAY_MS),
  );

  return {
    todayLabel: formatBerlinDateFromUtc(todayUtc),
    yesterdayLabel: formatBerlinDateFromUtc(yesterdayUtc),
    timezoneLabel: "Europe/Berlin (CET/CEST)",
    challengeDay: daysSinceStart + 1,
    daysSinceStart,
    targetReps: getTargetReps(daysSinceStart),
    monthlyJokerLimit: 2,
    freeStartDays: 14,
    uploadWindowHours: 24,
  };
}
