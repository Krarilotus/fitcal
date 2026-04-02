"use client";

import type { AppDictionary } from "@/i18n";
import { MetaStatChart } from "@/components/fitcal/meta-stat-chart";
import type { MeasurementPoint } from "@/components/fitcal/dashboard-types";

type ChartLabels = AppDictionary["dashboard"]["charts"];

export function MeasurementChart({
  points,
  labels,
}: {
  points: MeasurementPoint[];
  labels: ChartLabels;
}) {
  return (
    <MetaStatChart
      description={labels.measurementDescription}
      emptyText={labels.measurementEmpty}
      focusLabel={labels.focus}
      noValueLabel={labels.noValue}
      points={points.map((point) => ({
        label: point.measuredAt,
        values: {
          weightKg: point.weightKg,
          waistCircumferenceCm: point.waistCircumferenceCm,
          restingPulseBpm: point.restingPulseBpm,
        },
      }))}
      series={[
        {
          key: "weightKg",
          label: labels.weight,
          color: "var(--fc-chart-blue)",
          formatter: (value) => `${value.toFixed(1)} kg`,
        },
        {
          key: "waistCircumferenceCm",
          label: labels.waist,
          color: "var(--fc-chart-rose)",
          formatter: (value) => `${value.toFixed(1)} cm`,
        },
        {
          key: "restingPulseBpm",
          label: labels.restingPulse,
          color: "var(--fc-chart-amber)",
          formatter: (value) => `${Math.round(value)} bpm`,
        },
      ]}
      title={labels.measurementTitle}
    />
  );
}
