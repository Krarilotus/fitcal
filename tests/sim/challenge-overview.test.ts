import test from "node:test";
import assert from "node:assert/strict";
import { getChallengeOverview, getSlackDebtCents } from "@/lib/challenge";

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
