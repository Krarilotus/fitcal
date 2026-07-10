"use client";

import type { AppDictionary } from "@/i18n";
import { MetaStatChart } from "@/components/fitcal/meta-stat-chart";
import type { PerformancePoint } from "@/components/fitcal/dashboard-types";
import { useMemo, useState } from "react";

type ChartLabels = AppDictionary["dashboard"]["charts"];
type PerformanceRange = "7" | "14" | "30" | "all";

const PERFORMANCE_RANGES: PerformanceRange[] = ["7", "14", "30", "all"];
const EXTRA_SERIES_COLORS = [
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#84cc16",
  "#ec4899",
  "#06b6d4",
];

function getRangeLabel(labels: ChartLabels, range: PerformanceRange) {
  if (range === "7") return labels.rangeLast7;
  if (range === "14") return labels.rangeLast14;
  if (range === "30") return labels.rangeLast30;
  return labels.rangeAll;
}

function getVisiblePerformancePoints(points: PerformancePoint[], range: PerformanceRange) {
  return range === "all" ? points : points.slice(-Number.parseInt(range, 10));
}

function getPerformanceExtraCategories(points: PerformancePoint[]) {
  return [...new Set(points.flatMap((point) => Object.keys(point.extras)))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function buildPerformanceChartPoints(points: PerformancePoint[]) {
  return points.map((point) => ({
    label: point.challengeDate,
    values: {
      pushups: point.pushups,
      situps: point.situps,
      ...Object.fromEntries(point.pushupSets.map((value, index) => [`pushupSet:${index}`, value])),
      ...Object.fromEntries(point.situpSets.map((value, index) => [`situpSet:${index}`, value])),
      target: point.target,
      ...Object.fromEntries(
        Object.entries(point.extras).map(([key, value]) => [`extra:${key}`, value]),
      ),
    },
  }));
}

function buildPerformanceSeries(
  labels: ChartLabels,
  extraCategories: string[],
  maximumPushupSets: number,
  maximumSitupSets: number,
) {
  const formatRepetitions = (value: number) => `${value} ${labels.repetitions}`;

  return [
    {
      key: "pushups",
      label: labels.totalPushups,
      color: "var(--fc-accent)",
      formatter: formatRepetitions,
    },
    {
      key: "situps",
      label: labels.totalSitups,
      color: "var(--fc-accent-2)",
      formatter: formatRepetitions,
    },
    ...Array.from({ length: maximumPushupSets }, (_, index) => ({
      key: `pushupSet:${index}`,
      label: labels.pushupSet.replace("{index}", String(index + 1)),
      color: EXTRA_SERIES_COLORS[index % EXTRA_SERIES_COLORS.length],
      defaultHidden: true,
      formatter: formatRepetitions,
    })),
    ...Array.from({ length: maximumSitupSets }, (_, index) => ({
      key: `situpSet:${index}`,
      label: labels.situpSet.replace("{index}", String(index + 1)),
      color: EXTRA_SERIES_COLORS[(index + maximumPushupSets) % EXTRA_SERIES_COLORS.length],
      defaultHidden: true,
      formatter: formatRepetitions,
    })),
    {
      key: "target",
      label: labels.target,
      color: "#8896a7",
      dashed: true,
      formatter: formatRepetitions,
    },
    ...extraCategories.map((categoryName, index) => ({
      key: `extra:${categoryName}`,
      label: categoryName,
      color: EXTRA_SERIES_COLORS[index % EXTRA_SERIES_COLORS.length],
      defaultHidden: true,
      formatter: formatRepetitions,
    })),
  ];
}

export function PerformanceChart({
  points,
  labels,
}: {
  points: PerformancePoint[];
  labels: ChartLabels;
}) {
  const [range, setRange] = useState<PerformanceRange>("30");
  const extraCategories = useMemo(
    () => getPerformanceExtraCategories(points),
    [points],
  );
  const visiblePoints = getVisiblePerformancePoints(points, range);
  const chartPoints = buildPerformanceChartPoints(visiblePoints);
  const maximumPushupSets = Math.max(0, ...visiblePoints.map((point) => point.pushupSets.length));
  const maximumSitupSets = Math.max(0, ...visiblePoints.map((point) => point.situpSets.length));
  const series = buildPerformanceSeries(
    labels,
    extraCategories,
    maximumPushupSets,
    maximumSitupSets,
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="fc-meta-label">{labels.rangeLabel}</span>
        {PERFORMANCE_RANGES.map((value) => (
          <button
            className={`fc-toggle-chip ${range === value ? "" : "is-off"}`}
            key={value}
            onClick={() => setRange(value)}
            type="button"
          >
            {getRangeLabel(labels, value)}
          </button>
        ))}
      </div>
      <MetaStatChart
        description={labels.performanceDescription}
        emptyText={labels.performanceEmpty}
        focusLabel={labels.focus}
        noValueLabel={labels.noValue}
        points={chartPoints}
        series={series}
        title={labels.performanceTitle}
      />
    </div>
  );
}
