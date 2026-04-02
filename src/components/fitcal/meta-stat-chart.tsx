"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

type ChartSeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  formatter?: (value: number) => string;
};

type ChartPoint = {
  label: string;
  values: Record<string, number | null>;
};

type MetaStatChartProps = {
  title: string;
  description: string;
  points: ChartPoint[];
  series: ChartSeries[];
  emptyText: string;
  focusLabel: string;
  noValueLabel: string;
};

function buildSeriesCoordinates(
  points: ChartPoint[],
  seriesKey: string,
  width: number,
  height: number,
  maxValue: number,
) {
  return points.flatMap((point, index) => {
    const value = point.values[seriesKey];

    if (value == null) {
      return [];
    }

    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - (value / maxValue) * height;

    return [{ x, y, value, label: point.label, index }];
  });
}

export function MetaStatChart({
  title,
  description,
  points,
  series,
  emptyText,
  focusLabel,
  noValueLabel,
}: MetaStatChartProps) {
  const [activeIndex, setActiveIndex] = useState(points.length - 1);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  if (points.length === 0) {
    return <div className="fc-card text-sm text-[var(--fc-muted)]">{emptyText}</div>;
  }

  const width = 100;
  const height = 52;
  const visibleSeries = series.filter((item) => !hiddenSeries.includes(item.key));
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) =>
      visibleSeries.flatMap((item) => point.values[item.key] ?? []),
    ),
  );
  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), points.length - 1);
  const activePoint = points[safeActiveIndex];

  return (
    <section className="fc-card">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="fc-heading text-lg">{title}</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--fc-muted)]">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {series.map((item) => {
            const isHidden = hiddenSeries.includes(item.key);

            return (
              <button
                className={`fc-toggle-chip ${isHidden ? "is-off" : ""}`}
                key={item.key}
                onClick={() =>
                  setHiddenSeries((current) =>
                    current.includes(item.key)
                      ? current.filter((entry) => entry !== item.key)
                      : [...current, item.key],
                  )
                }
                style={{ "--chip-color": item.color } as CSSProperties}
                type="button"
              >
                <span className="fc-toggle-dot" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
        <div className="fc-chart-area overflow-hidden">
          <svg
            aria-label={title}
            className="h-64 w-full sm:h-72"
            preserveAspectRatio="none"
            viewBox={`0 0 ${width} ${height}`}
          >
            {[0, 1, 2, 3, 4].map((step) => {
              const y = (height / 4) * step;
              return (
                <line
                  key={step}
                  stroke="var(--fc-border)"
                  strokeDasharray="1.4 1.8"
                  strokeWidth="0.35"
                  x1="0"
                  x2={width}
                  y1={y}
                  y2={y}
                />
              );
            })}

            {visibleSeries.map((item) => {
              const coordinates = buildSeriesCoordinates(
                points,
                item.key,
                width,
                height,
                maxValue,
              );

              return (
                <g key={item.key}>
                  {coordinates.length > 1 ? (
                    <polyline
                      fill="none"
                      points={coordinates
                        .map((coordinate) => `${coordinate.x.toFixed(1)},${coordinate.y.toFixed(1)}`)
                        .join(" ")}
                      stroke={item.color}
                      strokeDasharray={item.dashed ? "2 1.4" : undefined}
                      strokeWidth={item.dashed ? "0.8" : "1.15"}
                    />
                  ) : null}
                  {coordinates.map((coordinate) => (
                    <circle
                      cx={coordinate.x}
                      cy={coordinate.y}
                      fill={item.color}
                      key={`${item.key}-${coordinate.index}`}
                      onMouseEnter={() => setActiveIndex(coordinate.index)}
                      onFocus={() => setActiveIndex(coordinate.index)}
                      r={safeActiveIndex === coordinate.index ? 1.6 : 1.1}
                      tabIndex={0}
                    />
                  ))}
                </g>
              );
            })}
          </svg>

          <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">
            <span>{points[0]?.label}</span>
            <span>{activePoint.label}</span>
            <span>{points[points.length - 1]?.label}</span>
          </div>
        </div>

        <div className="fc-chart-readout">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--fc-muted)]">
            {focusLabel}
          </p>
          <p className="mt-2 text-lg font-semibold">{activePoint.label}</p>
          <div className="mt-4 space-y-3">
            {series.map((item) => {
              const value = activePoint.values[item.key];
              const formatted =
                value == null
                  ? noValueLabel
                  : item.formatter
                    ? item.formatter(value)
                    : String(value);

              return (
                <div className="fc-chart-readout-row" key={item.key}>
                  <span className="fc-chart-readout-label">
                    <span
                      className="fc-toggle-dot"
                      style={{ background: item.color }}
                    />
                    {item.label}
                  </span>
                  <strong>{formatted}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
