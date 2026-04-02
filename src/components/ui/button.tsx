import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--fc-radius-sm)] text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fc-bg)] cursor-pointer font-[family-name:var(--font-syne)] tracking-wide uppercase",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--fc-accent)] px-5 py-2.5 text-[#0c0c0c] shadow-[0_0_16px_rgba(200,255,0,0.2)] hover:-translate-y-0.5 hover:bg-[var(--fc-accent-hover)] hover:shadow-[0_0_24px_rgba(200,255,0,0.3)] active:translate-y-0",
        secondary:
          "bg-transparent px-5 py-2.5 text-[var(--fc-ink)] ring-1 ring-[var(--fc-border-strong)] hover:-translate-y-0.5 hover:ring-[var(--fc-accent-border)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] active:translate-y-0",
        ghost:
          "px-3 py-2 text-[var(--fc-muted)] hover:text-[var(--fc-ink)] hover:bg-white/[0.04] normal-case tracking-normal",
        danger:
          "bg-[rgba(239,68,68,0.1)] px-5 py-2.5 text-red-400 ring-1 ring-[rgba(239,68,68,0.25)] hover:-translate-y-0.5 hover:bg-[rgba(239,68,68,0.15)]",
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
