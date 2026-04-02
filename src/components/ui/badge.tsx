import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// noinspection JSUnusedLocalSymbols
const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--fc-radius-sm)] px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[var(--fc-surface)] text-[var(--fc-muted)] border border-[var(--fc-border)]",
        accent: "bg-[var(--fc-accent-soft)] text-[var(--fc-accent-2)] border border-[var(--fc-accent-border)]",
        warm: "bg-[var(--fc-warm-soft)] text-[var(--fc-warm)] border border-[var(--fc-warm-border)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
