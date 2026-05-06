import test from "node:test";
import assert from "node:assert/strict";
import {
  canApplyJokerToDay,
  getChallengeOverview,
  getSlackDebtCents,
} from "@/lib/challenge";

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
});

test("full participants accumulate debt after the free qualification period", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [
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
