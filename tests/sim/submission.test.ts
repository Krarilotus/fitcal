import test from "node:test";
import assert from "node:assert/strict";
import { getChallengeOverview, getSlackDebtCents } from "@/lib/challenge";
import { deserializeSets, parseSubmissionInput } from "@/lib/submission";

function qualificationRecords() {
  return Array.from({ length: 10 }, (_, index) => ({
    challengeDate: `2026-04-${String(index + 1).padStart(2, "0")}`,
    status: "COMPLETED" as const,
    pushupTotal: 20,
    situpTotal: 20,
  }));
}

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
    extraEntries: [],
    pushupSets: [3, 0],
    situpSets: [2, 0],
    notes: "good faith",
  });
});

test("optional submission categories preserve repeated category sets", () => {
  const formData = new FormData();
  formData.set("challengeDate", "2026-04-20");
  formData.set("notes", "");
  formData.set("pushupSet1", "0");
  formData.set("pushupSet2", "0");
  formData.set("situpSet1", "0");
  formData.set("situpSet2", "0");
  formData.set("notes", "");
  formData.append("extraCategoryName", " Plank ");
  formData.append("extraCategoryValue", "60");
  formData.append("extraCategoryName", "plank");
  formData.append("extraCategoryValue", "30");
  formData.append("extraCategoryName", "Running");
  formData.append("extraCategoryValue", "5");

  const parsed = parseSubmissionInput(formData);

  assert.deepEqual(parsed.extraEntries, [
    {
      categoryName: "Plank",
      orderIndex: 0,
      value: 60,
    },
    {
      categoryName: "plank",
      orderIndex: 1,
      value: 30,
    },
    {
      categoryName: "Running",
      orderIndex: 2,
      value: 5,
    },
  ]);
});

test("light submissions retain more than two sets", () => {
  const formData = new FormData();
  formData.set("challengeDate", "2026-04-20");
  formData.set("notes", "");
  for (const value of [10, 20, 30]) formData.append("pushupSet", String(value));
  for (const value of [5, 15, 25]) formData.append("situpSet", String(value));

  assert.deepEqual(parseSubmissionInput(formData, { isLightParticipant: true }).pushupSets, [10, 20, 30]);
  assert.deepEqual(parseSubmissionInput(formData, { isLightParticipant: true }).situpSets, [5, 15, 25]);
});

test("persisted set parsing is total and rejects corrupt values", () => {
  assert.deepEqual(deserializeSets("not-json"), []);
  assert.deepEqual(deserializeSets('{"sets": [1]}'), []);
  assert.deepEqual(deserializeSets('[12,-1,"x",4,10001]'), [12, 4]);
});

test("partial completed days only charge proportional debt", () => {
  const overview = getChallengeOverview({
    joinedChallengeDate: "2026-04-01",
    records: [
      ...qualificationRecords(),
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
