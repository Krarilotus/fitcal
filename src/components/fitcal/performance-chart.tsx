"use client";

import type { AppDictionary } from "@/i18n";
import { MetaStatChart } from "@/components/fitcal/meta-stat-chart";
import type { PerformancePoint } from "@/components/fitcal/dashboard-types";
import { useMemo, useState } from "react";

type ChartLabels = AppDictionary["dashboard"]["charts"];

export function PerformanceChart({
  points,
  labels,
}: {
  points: PerformancePoint[];
  labels: ChartLabels;
}) {
  const [range, setRange] = useState<"7" | "14" | "30" | "all">("30");
  const extraCategories = useMemo(
    () =>
      [...new Set(points.flatMap((point) => Object.keys(point.extras)))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [points],
  );
  const visiblePoints =
    range === "all" ? points : points.slice(-Number.parseInt(range, 10));
  const extraColors = [
    "#8b5cf6",
    "#14b8a6",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#84cc16",
    "#ec4899",
    "#06b6d4",
  ];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="fc-meta-label">{labels.rangeLabel}</span>
        {[
          ["7", labels.rangeLast7],
          ["14", labels.rangeLast14],
          ["30", labels.rangeLast30],
          ["all", labels.rangeAll],
        ].map(([value, label]) => (
          <button
            className={`fc-toggle-chip ${range === value ? "" : "is-off"}`}
            key={value}
            onClick={() => setRange(value as typeof range)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <MetaStatChart
        description={labels.performanceDescription}
        emptyText={labels.performanceEmpty}
        focusLabel={labels.focus}
        noValueLabel={labels.noValue}
        points={visiblePoints.map((point) => ({
          label: point.challengeDate,
          values: {
            pushups: point.pushups,
            situps: point.situps,
            pushupSet1: point.pushupSet1,
            pushupSet2: point.pushupSet2,
            situpSet1: point.situpSet1,
            situpSet2: point.situpSet2,
            target: point.target,
            ...Object.fromEntries(
              Object.entries(point.extras).map(([key, value]) => [`extra:${key}`, value]),
            ),
          },
        }))}
        series={[
        {
          key: "pushups",
          label: labels.totalPushups,
          color: "var(--fc-accent)",
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "situps",
          label: labels.totalSitups,
          color: "var(--fc-accent-2)",
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "pushupSet1",
          label: labels.pushupSet1,
          color: "#00d4aa",
          defaultHidden: true,
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "pushupSet2",
          label: labels.pushupSet2,
          color: "#66e8d0",
          defaultHidden: true,
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "situpSet1",
          label: labels.situpSet1,
          color: "#ff8c42",
          defaultHidden: true,
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "situpSet2",
          label: labels.situpSet2,
          color: "#ffba80",
          defaultHidden: true,
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "target",
          label: labels.target,
          color: "#8896a7",
          dashed: true,
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        ...extraCategories.map((categoryName, index) => ({
          key: `extra:${categoryName}`,
          label: categoryName,
          color: extraColors[index % extraColors.length],
          defaultHidden: true,
          formatter: (value: number) => `${value} ${labels.repetitions}`,
        })),
      ]}
        title={labels.performanceTitle}
      />
    </div>
  );
}
