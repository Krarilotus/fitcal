import test from "node:test";
import assert from "node:assert/strict";
import { getChallengeOverview, getSlackDebtCents } from "@/lib/challenge";
import { parseSubmissionInput } from "@/lib/submission";

test("partial submissions below the daily target are parsed without rejection", () => {
  const formData = new FormData();
  formData.set("challengeDate", "2026-04-20");
  formData.set("pushupSet1", "3");
  formData.set("pushupSet2", "0");
  formData.set("situpSet1", "2");
  formData.set("situpSet2", "0");
  formData.set("notes", "good faith");

  const parsed = parseSubmissionInput(formData);

  assert.deepEqual(parsed, {
    challengeDate: "2026-04-20",
    pushupSets: [3, 0],
    situpSets: [2, 0],
    notes: "good faith",
  });
});

test("partial completed days only charge proportional debt", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [
      {
        challengeDate: "2026-04-15",
        status: "COMPLETED",
        pushupTotal: 3,
        situpTotal: 0,
      },
    ],
    now: new Date("2026-04-16T12:00:00Z"),
  });

  const target = overview.days.find((day) => day.challengeDate === "2026-04-15")?.repsTarget;
  assert.equal(target, 11);

  const partialDay = overview.days.find((day) => day.challengeDate === "2026-04-15");
  assert.equal(partialDay?.status, "partial");
  assert.equal(partialDay?.debtCents, Math.round(getSlackDebtCents(0) * (1 - 3 / 22)));
  assert.equal(overview.outstandingDebtCents, partialDay?.debtCents ?? 0);
});
