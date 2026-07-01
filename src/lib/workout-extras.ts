export type WorkoutExtraInput = {
  categoryName: string;
  value: number;
};

const MAX_EXTRA_CATEGORY_NAME_LENGTH = 60;
const MAX_EXTRA_CATEGORY_VALUE = 1000000;
const MAX_EXTRA_CATEGORIES_PER_SUBMISSION = 12;

export function normalizeWorkoutExtraCategoryName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_EXTRA_CATEGORY_NAME_LENGTH);
}

export function parseWorkoutExtraValue(value: FormDataEntryValue | undefined) {
  const parsedValue =
    typeof value === "string" ? Number.parseInt(value, 10) : 0;

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.max(0, Math.min(MAX_EXTRA_CATEGORY_VALUE, parsedValue));
}

export function mergeWorkoutExtraEntries(entries: WorkoutExtraInput[]) {
  const byName = new Map<string, WorkoutExtraInput>();

  for (const entry of entries) {
    const categoryName = normalizeWorkoutExtraCategoryName(entry.categoryName);
    const value = Math.max(0, Math.min(MAX_EXTRA_CATEGORY_VALUE, entry.value));

    if (!categoryName || value <= 0) {
      continue;
    }

    const key = categoryName.toLocaleLowerCase();
    const existing = byName.get(key);

    byName.set(key, {
      categoryName: existing?.categoryName ?? categoryName,
      value: (existing?.value ?? 0) + value,
    });
  }

  return [...byName.values()].slice(0, MAX_EXTRA_CATEGORIES_PER_SUBMISSION);
}

export function parseWorkoutExtraEntries(formData: FormData) {
  const names = formData.getAll("extraCategoryName");
  const values = formData.getAll("extraCategoryValue");

  return mergeWorkoutExtraEntries(
    names.map((rawName, index) => ({
      categoryName: typeof rawName === "string" ? rawName : "",
      value: parseWorkoutExtraValue(values[index]),
    })),
  );
}

export function buildWorkoutExtraTotals(
  submissions: Array<{
    status: string;
    extraEntries?: WorkoutExtraInput[];
  }>,
) {
  const totals: Record<string, number> = {};

  for (const submission of submissions) {
    if (submission.status !== "COMPLETED") {
      continue;
    }

    for (const entry of submission.extraEntries ?? []) {
      totals[entry.categoryName] = (totals[entry.categoryName] ?? 0) + entry.value;
    }
  }

  return totals;
}

export function listWorkoutExtraCategories(rows: Array<{ extraTotals: Record<string, number> }>) {
  return [...new Set(rows.flatMap((row) => Object.keys(row.extraTotals)))].sort(
    (left, right) => left.localeCompare(right),
  );
}
