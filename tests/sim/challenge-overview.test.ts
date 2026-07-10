import test from "node:test";
import assert from "node:assert/strict";
import {
  canApplyJokerToDay,
  getChallengeOverview,
  getSlackDebtCents,
} from "@/lib/challenge";

function qualificationRecords(count = 10) {
  return Array.from({ length: count }, (_, index) => ({
    challengeDate: `2026-04-${String(index + 1).padStart(2, "0")}`,
    status: "COMPLETED" as const,
    pushupTotal: 20,
    situpTotal: 20,
  }));
}

test("student discount halves slack pricing", () => {
  assert.equal(getSlackDebtCents(0, false), 1000);
  assert.equal(getSlackDebtCents(1, false), 1200);
  assert.equal(getSlackDebtCents(0, true), 500);
  assert.equal(getSlackDebtCents(1, true), 600);
});

test("light participants never build debt or joker allowance", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [
      ...qualificationRecords(),
      {
        challengeDate: "2026-04-15",
        status: "SLACK",
        pushupTotal: 0,
        situpTotal: 0,
      },
      {
        challengeDate: "2026-04-16",
        status: "COMPLETED",
        pushupTotal: 3,
        situpTotal: 3,
      },
    ],
    isLightParticipant: true,
    now: new Date("2026-04-20T12:00:00Z"),
  });

  assert.equal(overview.totalDebtCents, 0);
  assert.equal(overview.outstandingDebtCents, 0);
  assert.equal(overview.jokerAllowance, 0);
  assert.equal(overview.jokerBalance, 0);
  assert.equal(
    overview.days.find((day) => day.challengeDate === "2026-04-15")?.status,
    "open",
  );
});

test("light participants can track current and previous day entries", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [],
    isLightParticipant: true,
    now: new Date("2026-04-20T12:00:00Z"),
  });

  const currentDay = overview.days.find((day) => day.challengeDate === "2026-04-20");
  const previousDay = overview.days.find((day) => day.challengeDate === "2026-04-19");
  const staleDay = overview.days.find((day) => day.challengeDate === "2026-04-18");

  assert.equal(currentDay?.canUpload, true);
  assert.equal(previousDay?.canUpload, true);
  assert.equal(staleDay?.canUpload, true);
  assert.equal(currentDay?.canUseJoker, false);
  assert.equal(previousDay?.canUseJoker, false);
});

test("full participants can backfill past workout claims from the timeline", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: qualificationRecords(),
    now: new Date("2026-04-20T12:00:00Z"),
  });

  const staleDay = overview.days.find((day) => day.challengeDate === "2026-04-18");

  assert.equal(staleDay?.status, "slack");
  assert.equal(staleDay?.canUpload, true);
  assert.equal(staleDay?.canUseJoker, true);
});

test("light participants can track during qualification days", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [],
    isLightParticipant: true,
    now: new Date("2026-04-02T12:00:00Z"),
  });

  const currentQualificationDay = overview.days.find(
    (day) => day.challengeDate === "2026-04-02",
  );

  assert.equal(currentQualificationDay?.status, "free");
  assert.equal(currentQualificationDay?.canUpload, true);
});

test("challenge overview honors the configured test clock when now is omitted", () => {
  const previousOverride = process.env.FITCAL_TODAY_OVERRIDE;
  process.env.FITCAL_TODAY_OVERRIDE = "2026-04-20";
  try {
    const overview = getChallengeOverview({
      joinedChallengeDate: "2026-04-01",
      records: [],
    });
    assert.equal(overview.currentDate, "2026-04-20");
  } finally {
    if (previousOverride === undefined) delete process.env.FITCAL_TODAY_OVERRIDE;
    else process.env.FITCAL_TODAY_OVERRIDE = previousOverride;
  }
});

test("full participants accumulate debt after the free qualification period", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [
      ...qualificationRecords(),
      {
        challengeDate: "2026-04-15",
        status: "SLACK",
        pushupTotal: 0,
        situpTotal: 0,
      },
      {
        challengeDate: "2026-04-16",
        status: "SLACK",
        pushupTotal: 0,
        situpTotal: 0,
      },
    ],
    now: new Date("2026-04-17T12:00:00Z"),
  });

  assert.equal(overview.totalDebtCents, 2200);
  assert.equal(overview.outstandingDebtCents, 2200);
});

test("student discount also affects accumulated overview debt", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [
      ...qualificationRecords(),
      {
        challengeDate: "2026-04-15",
        status: "SLACK",
        pushupTotal: 0,
        situpTotal: 0,
      },
      {
        challengeDate: "2026-04-16",
        status: "SLACK",
        pushupTotal: 0,
        situpTotal: 0,
      },
    ],
    hasStudentDiscount: true,
    now: new Date("2026-04-17T12:00:00Z"),
  });

  assert.equal(overview.totalDebtCents, 1100);
  assert.equal(overview.outstandingDebtCents, 1100);
});

test("unqualified full participants do not accumulate debt", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [
      ...qualificationRecords(9),
      {
        challengeDate: "2026-04-15",
        status: "SLACK",
        pushupTotal: 0,
        situpTotal: 0,
      },
      {
        challengeDate: "2026-04-16",
        status: "SLACK",
        pushupTotal: 0,
        situpTotal: 0,
      },
    ],
    now: new Date("2026-04-17T12:00:00Z"),
  });

  const slackDay = overview.days.find((day) => day.challengeDate === "2026-04-15");

  assert.equal(overview.qualificationUploads, 9);
  assert.equal(overview.totalDebtCents, 0);
  assert.equal(overview.outstandingDebtCents, 0);
  assert.equal(slackDay?.status, "slack");
  assert.equal(slackDay?.debtCents, 0);
});

test("retroactive slack days can still accept jokers", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [],
    now: new Date("2026-04-20T12:00:00Z"),
  });

  const slackDay = overview.days.find((day) => day.challengeDate === "2026-04-18");

  assert.ok(slackDay);
  assert.equal(slackDay.status, "slack");
  assert.equal(slackDay.canUseJoker, true);
});

test("joker application helper allows only eligible days", () => {
  assert.equal(
    canApplyJokerToDay({
      challengeDate: "2026-04-18",
      jokerBalance: 1,
      status: "slack",
    }),
    true,
  );
  assert.equal(
    canApplyJokerToDay({
      challengeDate: "2026-04-20",
      jokerBalance: 1,
      now: new Date("2026-04-20T12:00:00Z"),
      status: "open",
    }),
    true,
  );
  assert.equal(
    canApplyJokerToDay({
      challengeDate: "2026-04-18",
      jokerBalance: 0,
      status: "slack",
    }),
    false,
  );
  assert.equal(
    canApplyJokerToDay({
      challengeDate: "2026-04-18",
      isLightParticipant: true,
      jokerBalance: 1,
      status: "slack",
    }),
    false,
  );
  assert.equal(
    canApplyJokerToDay({
      challengeDate: "2026-04-18",
      jokerBalance: 1,
      status: "completed",
    }),
    false,
  );
});
