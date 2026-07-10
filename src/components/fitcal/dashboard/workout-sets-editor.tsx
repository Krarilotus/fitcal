import type { MutableRefObject } from "react";
import type { AppDictionary } from "@/i18n";
import { DashboardActionButton } from "@/components/fitcal/dashboard/dashboard-primitives";

type ExerciseKey = "pushupSets" | "situpSets";

export function WorkoutSetsEditor({
  challengeDate,
  disabled,
  labels,
  maximumSets,
  onAdd,
  onChange,
  onRemove,
  primaryInputRefs,
  pushupSets,
  situpSets,
}: {
  challengeDate: string;
  disabled: boolean;
  labels: AppDictionary["dashboard"]["uploads"];
  maximumSets: number;
  onAdd: (exercise: ExerciseKey) => void;
  onChange: (exercise: ExerciseKey, index: number, value: string) => void;
  onRemove: (exercise: ExerciseKey, index: number) => void;
  primaryInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  pushupSets: number[];
  situpSets: number[];
}) {
  return (
    <div className="fc-grid-2">
      {([
        ["pushupSets", labels.pushupSet, pushupSets],
        ["situpSets", labels.situpSet, situpSets],
      ] as const).map(([exercise, setLabel, sets]) => (
        <fieldset className="grid gap-2" key={exercise}>
          <legend className="sr-only">
            {setLabel.replace(" {index}", "")}
          </legend>
          {sets.map((value, index) => (
            <div
              className="grid grid-cols-[1fr_auto] items-end gap-2"
              key={`${exercise}-${index}`}
            >
              <label className="fc-input-group">
                <span className="fc-input-label">
                  {setLabel.replace("{index}", String(index + 1))}
                </span>
                <input
                  className="fc-input"
                  disabled={disabled}
                  min="0"
                  name={exercise === "pushupSets" ? "pushupSet" : "situpSet"}
                  onChange={(event) => onChange(exercise, index, event.target.value)}
                  placeholder="0"
                  ref={
                    index === 0 && exercise === "pushupSets"
                      ? (node) => {
                          primaryInputRefs.current[challengeDate] = node;
                        }
                      : undefined
                  }
                  type="number"
                  value={value || ""}
                />
              </label>
              {sets.length > 1 ? (
                <DashboardActionButton
                  disabled={disabled}
                  onClick={() => onRemove(exercise, index)}
                  type="button"
                  variant="danger"
                >
                  {labels.removeSet}
                </DashboardActionButton>
              ) : null}
            </div>
          ))}
          {sets.length < maximumSets ? (
            <DashboardActionButton
              disabled={disabled}
              onClick={() => onAdd(exercise)}
              type="button"
            >
              {labels.addSet}
            </DashboardActionButton>
          ) : null}
        </fieldset>
      ))}
    </div>
  );
}
