import test from "node:test";
import assert from "node:assert/strict";
import { WorkoutReviewDecision } from "@prisma/client";
import {
  parseArbitrationWorkoutReviewAction,
  parsePrimaryWorkoutReviewAction,
  resolvePrimaryWorkoutReviewDecision,
} from "@/lib/workout-reviews";

test("primary review requires an explicit button action", () => {
  assert.equal(parsePrimaryWorkoutReviewAction(""), null);
  assert.equal(parsePrimaryWorkoutReviewAction("approve"), "approve");
  assert.equal(parsePrimaryWorkoutReviewAction("adjust"), "adjust");
});

test("arbitration review requires an explicit button action", () => {
  assert.equal(parseArbitrationWorkoutReviewAction(""), null);
  assert.equal(parseArbitrationWorkoutReviewAction("accept"), "accept");
  assert.equal(parseArbitrationWorkoutReviewAction("reject"), "reject");
});

test("approve action keeps the original claim totals", () => {
  assert.deepEqual(
    resolvePrimaryWorkoutReviewDecision({
      action: "approve",
      rawPushups: 12,
      rawSitups: 10,
      countedPushups: 0,
      countedSitups: 0,
    }),
    {
      countedPushups: 12,
      countedSitups: 10,
      decision: WorkoutReviewDecision.APPROVE,
    },
  );
});

test("adjust action can reduce or reject a workout", () => {
  assert.deepEqual(
    resolvePrimaryWorkoutReviewDecision({
      action: "adjust",
      rawPushups: 12,
      rawSitups: 10,
      countedPushups: 8,
      countedSitups: 7,
    }),
    {
      countedPushups: 8,
      countedSitups: 7,
      decision: WorkoutReviewDecision.REDUCE,
    },
  );

  assert.deepEqual(
    resolvePrimaryWorkoutReviewDecision({
      action: "adjust",
      rawPushups: 12,
      rawSitups: 10,
      countedPushups: 0,
      countedSitups: 0,
    }),
    {
      countedPushups: 0,
      countedSitups: 0,
      decision: WorkoutReviewDecision.REJECT,
    },
  );
});
