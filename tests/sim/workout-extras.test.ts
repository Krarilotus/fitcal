import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWorkoutExtraTotals,
  listWorkoutExtraCategories,
  mergeWorkoutExtraEntries,
} from "@/lib/workout-extras";

test("workout extra entries normalize names and merge duplicates", () => {
  assert.deepEqual(
    mergeWorkoutExtraEntries([
      { categoryName: " Plank ", value: 60 },
      { categoryName: "plank", value: 30 },
      { categoryName: "", value: 20 },
      { categoryName: "Running", value: 0 },
      { categoryName: "  Farmer   Carry  ", value: 4 },
    ]),
    [
      { categoryName: "Plank", value: 90 },
      { categoryName: "Farmer Carry", value: 4 },
    ],
  );
});

test("workout extra totals include completed submissions only", () => {
  assert.deepEqual(
    buildWorkoutExtraTotals([
      {
        status: "COMPLETED",
        extraEntries: [
          { categoryName: "Plank", value: 60 },
          { categoryName: "Run", value: 2 },
        ],
      },
      {
        status: "SLACK",
        extraEntries: [{ categoryName: "Plank", value: 999 }],
      },
      {
        status: "COMPLETED",
        extraEntries: [{ categoryName: "Plank", value: 30 }],
      },
    ]),
    {
      Plank: 90,
      Run: 2,
    },
  );
});

test("workout extra totals use case-insensitive category identity", () => {
  assert.deepEqual(
    buildWorkoutExtraTotals([
      { status: "COMPLETED", extraEntries: [{ categoryName: "Plank", value: 30 }] },
      { status: "COMPLETED", extraEntries: [{ categoryName: "plank", value: 45 }] },
    ]),
    { Plank: 75 },
  );
});

test("workout extra category list is unique and sorted", () => {
  assert.deepEqual(
    listWorkoutExtraCategories([
      { extraTotals: { Run: 2, Plank: 60 } },
      { extraTotals: { Burpees: 30, Run: 1 } },
    ]),
    ["Burpees", "Plank", "Run"],
  );
});
