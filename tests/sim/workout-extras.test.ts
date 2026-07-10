import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWorkoutExtraTotals,
  listWorkoutExtraCategories,
  parseWorkoutExtraEntries,
} from "@/lib/workout-extras";

test("workout extra form parsing normalizes valid set entries", () => {
  const formData = new FormData();
  formData.append("extraCategoryName", " Plank ");
  formData.append("extraCategoryValue", "60");
  formData.append("extraCategoryName", "");
  formData.append("extraCategoryValue", "20");
  formData.append("extraCategoryName", "Running");
  formData.append("extraCategoryValue", "0");
  formData.append("extraCategoryName", "  Farmer   Carry  ");
  formData.append("extraCategoryValue", "4");

  assert.deepEqual(
    parseWorkoutExtraEntries(formData),
    [
      { categoryName: "Plank", orderIndex: 0, value: 60 },
      { categoryName: "Farmer Carry", orderIndex: 1, value: 4 },
    ],
  );
});

test("workout extra form parsing preserves sets for repeated categories", () => {
  const formData = new FormData();
  formData.append("extraCategoryName", "Plank");
  formData.append("extraCategoryValue", "30");
  formData.append("extraCategoryName", "plank");
  formData.append("extraCategoryValue", "45");

  assert.deepEqual(parseWorkoutExtraEntries(formData), [
    { categoryName: "Plank", orderIndex: 0, value: 30 },
    { categoryName: "plank", orderIndex: 1, value: 45 },
  ]);
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
