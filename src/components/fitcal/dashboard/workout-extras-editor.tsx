import type { AppDictionary } from "@/i18n";
import { DashboardActionButton } from "@/components/fitcal/dashboard/dashboard-primitives";

export type WorkoutExtraDraft = {
  id: string;
  categoryName: string;
  value: number;
};

export function WorkoutExtrasEditor({
  disabled,
  entries,
  labels,
  onAdd,
  onChange,
  onRemove,
}: {
  disabled: boolean;
  entries: WorkoutExtraDraft[];
  labels: AppDictionary["dashboard"]["uploads"];
  onAdd: () => void;
  onChange: (
    entryId: string,
    field: "categoryName" | "value",
    value: string,
  ) => void;
  onRemove: (entryId: string) => void;
}) {
  return (
    <div className="rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-surface)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="fc-meta-label">{labels.extraCategories}</p>
        <DashboardActionButton disabled={disabled} onClick={onAdd} type="button">
          +
        </DashboardActionButton>
      </div>
      {entries.length ? (
        <div className="mt-3 grid gap-2">
          {entries.map((entry) => (
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]" key={entry.id}>
              <input
                aria-label={labels.extraCategoryName}
                className="fc-input"
                disabled={disabled}
                list="workout-extra-category-suggestions"
                maxLength={60}
                name="extraCategoryName"
                onChange={(event) =>
                  onChange(entry.id, "categoryName", event.target.value)
                }
                placeholder={labels.extraCategoryName}
                value={entry.categoryName}
              />
              <input
                aria-label={labels.extraCategoryValue}
                className="fc-input"
                disabled={disabled}
                min="0"
                name="extraCategoryValue"
                onChange={(event) => onChange(entry.id, "value", event.target.value)}
                placeholder="0"
                type="number"
                value={entry.value || ""}
              />
              <DashboardActionButton
                disabled={disabled}
                onClick={() => onRemove(entry.id)}
                type="button"
                variant="danger"
              >
                {labels.removeExtraCategory}
              </DashboardActionButton>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 fc-text-muted">{labels.extraCategoriesHint}</p>
      )}
    </div>
  );
}
