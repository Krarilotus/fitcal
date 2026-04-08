import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fc-radius-sm)] border border-transparent font-medium leading-none transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fc-bg)] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--fc-accent)] text-white hover:bg-[var(--fc-accent-hover)] active:brightness-90",
        secondary:
          "border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-ink-secondary)] hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-ink)]",
        ghost:
          "text-[var(--fc-muted)] hover:bg-[var(--fc-surface-hover)] hover:text-[var(--fc-ink)]",
        danger:
          "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/15",
      },
      size: {
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-7 text-base",
        sm: "h-8 px-3.5 text-xs",
        action: "h-8 px-3.5 text-xs font-medium",
        compact: "h-8 px-3.5 text-xs font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
