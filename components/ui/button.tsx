import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[transform,box-shadow,background,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sk-brand,#02a7ff)]/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-[linear-gradient(180deg,#3bbcff_0%,#02a7ff_48%,#0290e0_100%)] text-white shadow-[var(--sk-brand-shadow,0_12px_22px_-10px_rgba(2,167,255,0.55))] hover:brightness-105 hover:-translate-y-px active:translate-y-px active:shadow-[0_3px_8px_-1px_rgba(2,167,255,0.3),inset_0_2px_4px_rgba(0,90,140,0.35)]",
        outline:
          "border border-[color:var(--sk-border,rgba(255,255,255,0.9))] bg-[image:var(--sk-light-bg,linear-gradient(180deg,#ffffff_0%,oklch(0.955_0.006_240)_100%))] text-[color:var(--sk-ink,#1a2332)] shadow-[var(--sk-raised-shadow)] hover:-translate-y-px hover:shadow-[var(--sk-shadow-raised-hover)] active:translate-y-0 active:bg-[image:var(--sk-sunken)] active:shadow-[var(--sk-sunken-shadow)]",
        ghost:
          "hover:bg-[color-mix(in_oklab,var(--sk-brand,#02a7ff)_8%,var(--sk-mix-base,white))] hover:text-[color:var(--sk-ink,#1a2332)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-11 rounded-xl px-8",
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
