import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
  {
    variants: {
      variant: {
        default: "bg-[var(--fc-bg-alt)] text-[var(--fc-muted)] ring-1 ring-[var(--fc-border)]",
        accent: "bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] ring-1 ring-[var(--fc-accent-border)]",
        warm: "bg-[var(--fc-warm-soft)] text-[var(--fc-warm)] ring-1 ring-[var(--fc-warm-border)]",
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
