"use client";

import { MetaStatChart } from "@/components/fitcal/meta-stat-chart";

type PerformancePoint = {
  challengeDate: string;
  pushups: number;
  situps: number;
  pushupSet1: number;
  pushupSet2: number;
  situpSet1: number;
  situpSet2: number;
  target: number;
};

export function PerformanceChart({ points }: { points: PerformancePoint[] }) {
  return (
    <MetaStatChart
      description={`Verlauf der letzten ${points.length || 0} dokumentierten Workout-Tage mit Gesamtwerten und Set-Aufteilung.`}
      emptyText="Noch keine Workout-Tage vorhanden. Sobald Einträge da sind, erscheint hier die Verlaufsgrafik."
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
          label: "Liegestütze gesamt",
          color: "var(--fc-accent)",
          formatter: (value) => `${value} Wdh.`,
        },
        {
          key: "situps",
          label: "Sit-ups gesamt",
          color: "var(--fc-accent-2)",
          formatter: (value) => `${value} Wdh.`,
        },
        {
          key: "pushupSet1",
          label: "Liegestütze Set 1",
          color: "#00d4aa",
          formatter: (value) => `${value} Wdh.`,
        },
        {
          key: "pushupSet2",
          label: "Liegestütze Set 2",
          color: "#66e8d0",
          formatter: (value) => `${value} Wdh.`,
        },
        {
          key: "situpSet1",
          label: "Sit-ups Set 1",
          color: "#ff8c42",
          formatter: (value) => `${value} Wdh.`,
        },
        {
          key: "situpSet2",
          label: "Sit-ups Set 2",
          color: "#ffba80",
          formatter: (value) => `${value} Wdh.`,
        },
        {
          key: "target",
          label: "Ziel",
          color: "#8896a7",
          dashed: true,
          formatter: (value) => `${value} Wdh.`,
        },
      ]}
      title="Leistung"
    />
  );
}
