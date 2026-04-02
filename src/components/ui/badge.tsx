import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// noinspection JSUnusedLocalSymbols
const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--fc-radius-sm)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] font-[family-name:var(--font-syne)]",
  {
    variants: {
      variant: {
        default: "bg-[rgba(255,255,255,0.04)] text-[var(--fc-muted)] ring-1 ring-[var(--fc-border-strong)]",
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
