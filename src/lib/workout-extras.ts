export type WorkoutExtraInput = {
  categoryName: string;
  orderIndex?: number;
  value: number;
};

const MAX_EXTRA_CATEGORY_NAME_LENGTH = 60;
const MAX_EXTRA_CATEGORY_VALUE = 1000000;
const MAX_EXTRA_CATEGORIES_PER_SUBMISSION = 12;
const MAX_EXTRA_SETS_PER_SUBMISSION = 100;

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

export function parseWorkoutExtraEntries(formData: FormData) {
  const names = formData.getAll("extraCategoryName");
  const values = formData.getAll("extraCategoryValue");
  const acceptedCategoryKeys = new Set<string>();
  const entries: WorkoutExtraInput[] = [];

  for (const [index, rawName] of names.entries()) {
    const categoryName = normalizeWorkoutExtraCategoryName(
      typeof rawName === "string" ? rawName : "",
    );
    const value = parseWorkoutExtraValue(values[index]);

    if (!categoryName || value <= 0) {
      continue;
    }

    const key = categoryName.toLocaleLowerCase();
    if (!acceptedCategoryKeys.has(key)) {
      if (acceptedCategoryKeys.size >= MAX_EXTRA_CATEGORIES_PER_SUBMISSION) {
        continue;
      }
      acceptedCategoryKeys.add(key);
    }

    entries.push({ categoryName, orderIndex: entries.length, value });

    if (entries.length >= MAX_EXTRA_SETS_PER_SUBMISSION) {
      break;
    }
  }

  return entries;
}

export function buildWorkoutExtraTotals(
  submissions: Array<{
    status: string;
    extraEntries?: WorkoutExtraInput[];
  }>,
) {
  const totalsByKey = new Map<string, { label: string; value: number }>();

  for (const submission of submissions) {
    if (submission.status !== "COMPLETED") {
      continue;
    }

    for (const entry of submission.extraEntries ?? []) {
      const label = normalizeWorkoutExtraCategoryName(entry.categoryName);
      if (!label) continue;
      const key = label.toLocaleLowerCase();
      const existing = totalsByKey.get(key);
      totalsByKey.set(key, {
        label: existing?.label ?? label,
        value: (existing?.value ?? 0) + entry.value,
      });
    }
  }

  return Object.fromEntries(
    [...totalsByKey.values()]
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((entry) => [entry.label, entry.value]),
  );
}

export function listWorkoutExtraCategories(rows: Array<{ extraTotals: Record<string, number> }>) {
  return [...new Set(rows.flatMap((row) => Object.keys(row.extraTotals)))].sort(
    (left, right) => left.localeCompare(right),
  );
}
