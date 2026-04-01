export const CHALLENGE_TIME_ZONE = "Europe/Berlin";
export const CHALLENGE_START_DATE = "2026-04-01";
export const CHALLENGE_LENGTH_DAYS = 365;
export const CHALLENGE_FREE_DAYS = 14;
export const MAX_VIDEO_FILES_PER_DAY = 4;
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const MONTHLY_JOKER_LIMIT = 2;
export const MISSED_DAY_BASE_DEBT_CENTS = 1000;
export const MISSED_DAY_INCREMENT_CENTS = 200;
export const EXTRA_PUSHUP_REDUCTION_CENTS = 10;
export const EXTRA_SITUP_REDUCTION_CENTS = 5;
export const MAX_SETS_PER_EXERCISE = 2;
export const MIN_DOCUMENTED_DAYS_FOR_PARTICIPATION = 10;

export type DayCompletionState =
  | "upcoming"
  | "free"
  | "open"
  | "completed"
  | "joker"
  | "sickPending"
  | "sick"
  | "slack";

export type PersistedDayStatus =
  | "COMPLETED"
  | "JOKER"
  | "SICK_PENDING"
  | "SICK_VERIFIED";

export interface DailyRecordLike {
  challengeDate: string;
  status: PersistedDayStatus;
  pushupTotal: number;
  situpTotal: number;
  hasStudentDiscount?: boolean;
}

export interface ChallengeDaySummary {
  challengeDate: string;
  dayIndex: number;
  repsTarget: number;
  status: DayCompletionState;
  canUpload: boolean;
  canUseJoker: boolean;
  isCurrentDay: boolean;
  isPreviousDay: boolean;
  debtCents: number;
  debtReductionCents: number;
  rawDebtReductionCents: number;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return { year, month, day };
}

function dateKeyToUtcTime(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return Date.UTC(year, month - 1, day);
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function getBerlinDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHALLENGE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function addDaysToDateKey(dateKey: string, amount: number) {
  const utcTime = dateKeyToUtcTime(dateKey);
  const next = new Date(utcTime + amount * 24 * 60 * 60 * 1000);

  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(
    next.getUTCDate(),
  )}`;
}

export function differenceInDays(startDateKey: string, endDateKey: string) {
  const diffMs = dateKeyToUtcTime(endDateKey) - dateKeyToUtcTime(startDateKey);
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function getChallengeDayIndex(dateKey: string) {
  return differenceInDays(CHALLENGE_START_DATE, dateKey);
}

export function getChallengeEndDateKey() {
  return addDaysToDateKey(CHALLENGE_START_DATE, CHALLENGE_LENGTH_DAYS - 1);
}

export const CHALLENGE_END_DATE = getChallengeEndDateKey();

export function isWithinChallenge(dateKey: string) {
  return (
    getChallengeDayIndex(dateKey) >= 0 &&
    getChallengeDayIndex(dateKey) < CHALLENGE_LENGTH_DAYS
  );
}

export function isFreeChallengeDay(dateKey: string) {
  const dayIndex = getChallengeDayIndex(dateKey);
  return dayIndex >= 0 && dayIndex < CHALLENGE_FREE_DAYS;
}

export function getRequiredReps(dateKey: string) {
  const dayIndex = Math.max(0, getChallengeDayIndex(dateKey));
  return Math.ceil(1 + 2.5 * Math.sqrt(dayIndex));
}

export function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function getOpenUploadDateKeys(now = new Date()) {
  const todayKey = getBerlinDateKey(now);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  return [todayKey, yesterdayKey].filter((dateKey) => isWithinChallenge(dateKey));
}

export function canSubmitForDate(dateKey: string, now = new Date()) {
  return getOpenUploadDateKeys(now).includes(dateKey);
}

export function getMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function getMonthIndex(dateKey: string) {
  const { year, month } = parseDateKey(dateKey);
  return year * 12 + (month - 1);
}

export function countJokersForMonth(
  records: Pick<DailyRecordLike, "challengeDate" | "status">[],
  monthKey: string,
) {
  return records.filter(
    (record) => record.status === "JOKER" && getMonthKey(record.challengeDate) === monthKey,
  ).length;
}

export function countUsedJokers(
  records: Pick<DailyRecordLike, "challengeDate" | "status">[],
  upToDateKey?: string,
) {
  return records.filter(
    (record) =>
      record.status === "JOKER" &&
      (upToDateKey == null || differenceInDays(record.challengeDate, upToDateKey) >= 0),
  ).length;
}

export function getAccruedJokerAllowance(
  joinedChallengeDate: string,
  currentDate: string,
) {
  const effectiveStart =
    getChallengeDayIndex(joinedChallengeDate) < 0 ? CHALLENGE_START_DATE : joinedChallengeDate;

  if (differenceInDays(effectiveStart, currentDate) < 0) {
    return 0;
  }

  const monthSpan = getMonthIndex(currentDate) - getMonthIndex(effectiveStart) + 1;
  return Math.max(0, monthSpan) * MONTHLY_JOKER_LIMIT;
}

export function getDebtReductionCents(
  record: Pick<DailyRecordLike, "challengeDate" | "pushupTotal" | "situpTotal">,
) {
  const target = getRequiredReps(record.challengeDate);
  const extraPushups = Math.max(0, record.pushupTotal - target);
  const extraSitups = Math.max(0, record.situpTotal - target);

  return (
    extraPushups * EXTRA_PUSHUP_REDUCTION_CENTS +
    extraSitups * EXTRA_SITUP_REDUCTION_CENTS
  );
}

export function getSlackDebtCents(slackIndex: number, hasStudentDiscount = false) {
  const fullDebt = MISSED_DAY_BASE_DEBT_CENTS + slackIndex * MISSED_DAY_INCREMENT_CENTS;
  return hasStudentDiscount ? Math.round(fullDebt / 2) : fullDebt;
}

export interface ChallengeOverviewInput {
  joinedChallengeDate: string;
  records: DailyRecordLike[];
  hasStudentDiscount?: boolean;
  isLightParticipant?: boolean;
  now?: Date;
}

export interface ChallengeOverview {
  currentDate: string;
  currentTarget: number;
  previousDate: string | null;
  previousTarget: number | null;
  documentedDays: number;
  qualificationUploads: number;
  qualificationRequiredUploads: number;
  qualificationWindowDays: number;
  totalDebtCents: number;
  totalDebtReductionCents: number;
  outstandingDebtCents: number;
  monthJokersUsed: number;
  monthJokersRemaining: number;
  jokerAllowance: number;
  jokerUsed: number;
  jokerBalance: number;
  days: ChallengeDaySummary[];
}

export function getChallengeOverview({
  joinedChallengeDate,
  records,
  hasStudentDiscount = false,
  isLightParticipant = false,
  now = new Date(),
}: ChallengeOverviewInput): ChallengeOverview {
  const currentDate = getBerlinDateKey(now);
  const previousDate = isWithinChallenge(addDaysToDateKey(currentDate, -1))
    ? addDaysToDateKey(currentDate, -1)
    : null;
  const recordMap = new Map(records.map((record) => [record.challengeDate, record]));
  const days: ChallengeDaySummary[] = [];
  const firstRelevantDate =
    getChallengeDayIndex(joinedChallengeDate) < 0
      ? CHALLENGE_START_DATE
      : joinedChallengeDate;
  const lastEvaluatedDate = isWithinChallenge(currentDate)
    ? currentDate
    : getChallengeEndDateKey();
  let slackCount = 0;
  let totalDebtCents = 0;
  let totalDebtReductionCents = 0;
  let outstandingDebtCents = 0;
  const jokerAllowance = isLightParticipant
    ? 0
    : getAccruedJokerAllowance(firstRelevantDate, lastEvaluatedDate);
  const jokerUsed = isLightParticipant ? 0 : countUsedJokers(records, lastEvaluatedDate);
  const jokerBalance = Math.max(0, jokerAllowance - jokerUsed);

  for (
    let cursor = firstRelevantDate;
    differenceInDays(cursor, lastEvaluatedDate) >= 0;
    cursor = addDaysToDateKey(cursor, 1)
  ) {
    if (!isWithinChallenge(cursor)) {
      continue;
    }

    const dayIndex = getChallengeDayIndex(cursor);
    const record = recordMap.get(cursor);
    const isCurrentDay = cursor === currentDate;
    const isPreviousDay = previousDate === cursor;
    const isPastClosedDay = differenceInDays(cursor, currentDate) >= 1;
    const rawDebtReductionCents = record ? getDebtReductionCents(record) : 0;
    let debtReductionCents = 0;
    let status: DayCompletionState;
    let dayDebtCents = 0;

    if (record?.status === "COMPLETED") {
      status = "completed";
      if (!isLightParticipant) {
        debtReductionCents = Math.min(rawDebtReductionCents, outstandingDebtCents);
        outstandingDebtCents -= debtReductionCents;
        totalDebtReductionCents += debtReductionCents;
      }
    } else if (record?.status === "JOKER") {
      status = "joker";
    } else if (record?.status === "SICK_VERIFIED") {
      status = "sick";
    } else if (record?.status === "SICK_PENDING") {
      status = "sickPending";
    } else if (dayIndex < CHALLENGE_FREE_DAYS) {
      status = "free";
    } else if (isCurrentDay || isPreviousDay || (isLightParticipant && isPastClosedDay)) {
      status = "open";
    } else if (isPastClosedDay) {
      status = "slack";
      dayDebtCents = getSlackDebtCents(slackCount, hasStudentDiscount);
      slackCount += 1;
      totalDebtCents += dayDebtCents;
      outstandingDebtCents += dayDebtCents;
    } else {
      status = "upcoming";
    }

    days.push({
      challengeDate: cursor,
      dayIndex,
      repsTarget: getRequiredReps(cursor),
      status,
      canUpload:
        !isLightParticipant &&
        (status === "open" || status === "free" || status === "sickPending") &&
        canSubmitForDate(cursor, now),
      canUseJoker:
        !isLightParticipant &&
        (status === "open" || status === "sickPending") &&
        jokerBalance > 0 &&
        canSubmitForDate(cursor, now),
      isCurrentDay,
      isPreviousDay,
      debtCents: dayDebtCents,
      debtReductionCents,
      rawDebtReductionCents,
    });
  }

  const currentMonthJokersUsed = countJokersForMonth(records, getMonthKey(currentDate));
  const documentedDays = records.filter((record) => record.status === "COMPLETED").length;
  const qualificationUploads = records.filter((record) => {
    if (record.status !== "COMPLETED") {
      return false;
    }

    const dayIndex = getChallengeDayIndex(record.challengeDate);
    return dayIndex >= 0 && dayIndex < CHALLENGE_FREE_DAYS;
  }).length;

  return {
    currentDate,
    currentTarget: isWithinChallenge(currentDate) ? getRequiredReps(currentDate) : 0,
    previousDate,
    previousTarget: previousDate ? getRequiredReps(previousDate) : null,
    documentedDays,
    qualificationUploads,
    qualificationRequiredUploads: MIN_DOCUMENTED_DAYS_FOR_PARTICIPATION,
    qualificationWindowDays: CHALLENGE_FREE_DAYS,
    totalDebtCents,
    totalDebtReductionCents,
    outstandingDebtCents: Math.max(0, outstandingDebtCents),
    monthJokersUsed: currentMonthJokersUsed,
    monthJokersRemaining: jokerBalance,
    jokerAllowance,
    jokerUsed,
    jokerBalance,
    days,
  };
}
