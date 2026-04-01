import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "bg-[rgba(255,248,239,0.88)] text-[var(--fc-muted)] ring-1 ring-black/8",
        accent: "bg-[rgba(13,119,104,0.12)] text-[var(--fc-accent)] ring-1 ring-[rgba(13,119,104,0.18)]",
        warm: "bg-[rgba(233,120,60,0.12)] text-[var(--fc-accent-2)] ring-1 ring-[rgba(233,120,60,0.18)]",
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
