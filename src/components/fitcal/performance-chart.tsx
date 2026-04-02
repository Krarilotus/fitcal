"use client";

import type { AppDictionary } from "@/i18n";
import { MetaStatChart } from "@/components/fitcal/meta-stat-chart";
import type { PerformancePoint } from "@/components/fitcal/dashboard-types";

type ChartLabels = AppDictionary["dashboard"]["charts"];

export function PerformanceChart({
  points,
  labels,
}: {
  points: PerformancePoint[];
  labels: ChartLabels;
}) {
  return (
    <MetaStatChart
      description={labels.performanceDescription}
      emptyText={labels.performanceEmpty}
      focusLabel={labels.focus}
      noValueLabel={labels.noValue}
      points={points.map((point) => ({
        label: point.challengeDate,
        values: {
          pushups: point.pushups,
          situps: point.situps,
          pushupSet1: point.pushupSet1,
          pushupSet2: point.pushupSet2,
          situpSet1: point.situpSet1,
          situpSet2: point.situpSet2,
          target: point.target,
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
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "pushupSet2",
          label: labels.pushupSet2,
          color: "#66e8d0",
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "situpSet1",
          label: labels.situpSet1,
          color: "#ff8c42",
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "situpSet2",
          label: labels.situpSet2,
          color: "#ffba80",
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
        {
          key: "target",
          label: labels.target,
          color: "#8896a7",
          dashed: true,
          formatter: (value) => `${value} ${labels.repetitions}`,
        },
      ]}
      title={labels.performanceTitle}
    />
  );
}
