import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fc-radius-sm)] text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fc-bg)] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--fc-accent)] px-4 py-2 text-white hover:bg-[var(--fc-accent-hover)] active:brightness-90",
        secondary:
          "bg-[var(--fc-surface)] px-4 py-2 text-[var(--fc-ink-secondary)] border border-[var(--fc-border)] hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-ink)]",
        ghost:
          "px-3 py-2 text-[var(--fc-muted)] hover:text-[var(--fc-ink)] hover:bg-[var(--fc-surface-hover)]",
        danger:
          "bg-red-500/10 px-4 py-2 text-red-400 border border-red-500/20 hover:bg-red-500/15",
      },
      size: {
        default: "",
        lg: "px-7 py-3.5 text-base",
        sm: "px-3.5 py-2 text-xs",
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
