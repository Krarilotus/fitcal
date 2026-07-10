import type { AppDictionary } from "@/i18n";
import { DashboardActionButton } from "@/components/fitcal/dashboard/dashboard-primitives";

export type WorkoutExtraDraft = {
  id: string;
  categoryName: string;
  values: Array<{
    id: string;
    value: number;
  }>;
};

export function WorkoutExtrasEditor({
  disabled,
  entries,
  labels,
  onAddCategory,
  onAddValue,
  onCategoryNameChange,
  onRemoveCategory,
  onRemoveValue,
  onValueChange,
}: {
  disabled: boolean;
  entries: WorkoutExtraDraft[];
  labels: AppDictionary["dashboard"]["uploads"];
  onAddCategory: () => void;
  onAddValue: (entryId: string) => void;
  onCategoryNameChange: (entryId: string, value: string) => void;
  onRemoveCategory: (entryId: string) => void;
  onRemoveValue: (entryId: string, valueId: string) => void;
  onValueChange: (entryId: string, valueId: string, value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="fc-meta-label">{labels.extraCategories}</p>
        <DashboardActionButton disabled={disabled} onClick={onAddCategory} type="button">
          +
        </DashboardActionButton>
      </div>
      {entries.length ? (
        <div className="mt-3 grid gap-2">
          {entries.map((entry) => (
            <div className="grid gap-2" key={entry.id}>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  aria-label={labels.extraCategoryName}
                  className="fc-input"
                  disabled={disabled}
                  list="workout-extra-category-suggestions"
                  maxLength={60}
                  onChange={(event) =>
                    onCategoryNameChange(entry.id, event.target.value)
                  }
                  placeholder={labels.extraCategoryName}
                  value={entry.categoryName}
                />
                <DashboardActionButton
                  disabled={disabled}
                  onClick={() => onRemoveCategory(entry.id)}
                  type="button"
                  variant="danger"
                >
                  {labels.removeExtraCategory}
                </DashboardActionButton>
              </div>
              <div className="grid gap-2">
                {entry.values.map((setEntry, index) => (
                  <div
                    className="grid grid-cols-[1fr_auto] items-end gap-2"
                    key={setEntry.id}
                  >
                    <input
                      name="extraCategoryName"
                      type="hidden"
                      value={entry.categoryName}
                    />
                    <label className="fc-input-group">
                      <span className="fc-input-label">
                        {labels.extraCategoryValue} {index + 1}
                      </span>
                      <input
                        aria-label={`${labels.extraCategoryValue} ${index + 1}`}
                        className="fc-input"
                        disabled={disabled}
                        min="0"
                        name="extraCategoryValue"
                        onChange={(event) =>
                          onValueChange(entry.id, setEntry.id, event.target.value)
                        }
                        placeholder="0"
                        type="number"
                        value={setEntry.value || ""}
                      />
                    </label>
                    {entry.values.length > 1 ? (
                      <DashboardActionButton
                        disabled={disabled}
                        onClick={() => onRemoveValue(entry.id, setEntry.id)}
                        type="button"
                        variant="danger"
                      >
                        {labels.removeSet}
                      </DashboardActionButton>
                    ) : null}
                  </div>
                ))}
                <DashboardActionButton
                  disabled={disabled}
                  onClick={() => onAddValue(entry.id)}
                  type="button"
                >
                  {labels.addSet}
                </DashboardActionButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
