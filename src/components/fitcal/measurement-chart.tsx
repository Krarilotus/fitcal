"use client";

import { MetaStatChart } from "@/components/fitcal/meta-stat-chart";

type MeasurementPoint = {
  measuredAt: string;
  weightKg: number | null;
  waistCircumferenceCm: number | null;
  restingPulseBpm: number | null;
};

export function MeasurementChart({ points }: { points: MeasurementPoint[] }) {
  return (
    <MetaStatChart
      description="Optionale Messwerte wie Gewicht und Bauchumfang im Zeitverlauf."
      emptyText="Noch keine Messwerte vorhanden. Trage unten einen ersten Messpunkt ein."
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
          label: "Gewicht",
          color: "var(--fc-chart-blue)",
          formatter: (value) => `${value.toFixed(1)} kg`,
        },
        {
          key: "waistCircumferenceCm",
          label: "Bauchumfang",
          color: "var(--fc-chart-rose)",
          formatter: (value) => `${value.toFixed(1)} cm`,
        },
        {
          key: "restingPulseBpm",
          label: "Ruhepuls",
          color: "var(--fc-chart-amber)",
          formatter: (value) => `${Math.round(value)} bpm`,
        },
      ]}
      title="Messwerte"
    />
  );
}
