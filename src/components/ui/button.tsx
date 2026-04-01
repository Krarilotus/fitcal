import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--fc-ink)] px-5 py-3 text-[var(--fc-bg)] hover:-translate-y-0.5 hover:bg-[#2d352f]",
        secondary:
          "bg-[rgba(255,248,239,0.9)] px-5 py-3 text-[var(--fc-ink)] ring-1 ring-black/10 hover:-translate-y-0.5 hover:bg-white",
        ghost:
          "px-3 py-2 text-[var(--fc-muted)] hover:text-[var(--fc-ink)]",
      },
      size: {
        default: "",
        lg: "px-6 py-3.5 text-base",
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
