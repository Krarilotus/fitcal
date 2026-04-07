import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardSectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="fc-heading text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--fc-muted)]">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function DashboardStatBox({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="fc-stat">
      <span className="fc-stat-label">{label}</span>
      <span className={cn("fc-stat-value", valueClassName)}>{value}</span>
    </div>
  );
}
