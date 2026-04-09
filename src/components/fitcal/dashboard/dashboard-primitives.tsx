import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

export function DashboardCardTitle({
  title,
}: {
  title: string;
}) {
  return <h3 className="fc-heading text-lg">{title}</h3>;
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

export function DashboardActionCluster({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="fc-action-row">{children}</div>;
}

export function DashboardActionButton({
  className,
  size = "action",
  variant = "secondary",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("fc-action-button min-w-0", className)}
      size={size}
      variant={variant}
      {...props}
    />
  );
}

export function DashboardStatusBadge({
  children,
  className,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "warm";
}) {
  return (
    <Badge className={cn("fc-status-badge shrink-0", className)} variant={tone}>
      {children}
    </Badge>
  );
}
