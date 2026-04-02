import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fc-bg)] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--fc-accent)] px-5 py-3 text-white shadow-[0_2px_8px_rgba(5,150,105,0.25)] hover:-translate-y-0.5 hover:bg-[var(--fc-accent-hover)] hover:shadow-[0_4px_16px_rgba(5,150,105,0.3)] active:translate-y-0 active:shadow-[0_1px_4px_rgba(5,150,105,0.2)]",
        secondary:
          "bg-white/90 px-5 py-3 text-[var(--fc-ink)] ring-1 ring-[var(--fc-border-strong)] hover:-translate-y-0.5 hover:bg-white hover:ring-[var(--fc-accent-border)] hover:shadow-[0_4px_12px_rgba(28,25,23,0.06)] active:translate-y-0",
        ghost:
          "px-3 py-2 text-[var(--fc-muted)] hover:text-[var(--fc-ink)] hover:bg-black/[0.04]",
        danger:
          "bg-red-50 px-5 py-3 text-red-700 ring-1 ring-red-200 hover:-translate-y-0.5 hover:bg-red-100",
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
