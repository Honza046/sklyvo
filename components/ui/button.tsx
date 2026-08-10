import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Soft-UI buttons (Matěj design system):
 * primary · secondary · engraved · ghost · brand (optional accent)
 * Heights: sm 32 · default 44 · lg 50 · icon 44
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13.5px] font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sk-brand,#02a7ff)]/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[image:var(--sk-sunken)] disabled:text-[color:oklch(0.72_0.01_250)] disabled:shadow-[var(--sk-sunken-shadow)] disabled:opacity-100 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-[image:var(--sk-ink-bg)] text-white shadow-[var(--sk-shadow-dark)] hover:-translate-y-px hover:shadow-[var(--sk-shadow-dark-hover)] active:translate-y-px active:shadow-[0_3px_8px_-1px_rgba(20,32,50,0.28),inset_0_2px_4px_rgba(0,0,0,0.45)]",
        primary:
          "border-0 bg-[image:var(--sk-ink-bg)] text-white shadow-[var(--sk-shadow-dark)] hover:-translate-y-px hover:shadow-[var(--sk-shadow-dark-hover)] active:translate-y-px active:shadow-[0_3px_8px_-1px_rgba(20,32,50,0.28),inset_0_2px_4px_rgba(0,0,0,0.45)]",
        secondary:
          "border-0 bg-[image:var(--sk-light-bg)] text-[color:var(--sk-ink,#1a2332)] shadow-[var(--sk-raised-shadow)] hover:-translate-y-px hover:shadow-[var(--sk-shadow-raised-hover)] active:translate-y-px active:bg-[image:var(--sk-sunken)] active:shadow-[inset_0_2px_5px_rgba(90,130,165,0.38),inset_0_-1px_0_var(--sk-highlight-soft,rgba(255,255,255,0.9))]",
        outline:
          "border-0 bg-[image:var(--sk-light-bg)] text-[color:var(--sk-ink,#1a2332)] shadow-[var(--sk-raised-shadow)] hover:-translate-y-px hover:shadow-[var(--sk-shadow-raised-hover)] active:translate-y-px active:bg-[image:var(--sk-sunken)] active:shadow-[inset_0_2px_5px_rgba(90,130,165,0.38),inset_0_-1px_0_var(--sk-highlight-soft,rgba(255,255,255,0.9))]",
        engraved:
          "border border-[color:var(--sk-border,rgba(255,255,255,0.9))] bg-[image:var(--sk-sunken)] text-[color:var(--sk-muted,oklch(0.58_0.015_250))] shadow-[var(--sk-sunken-shadow)] hover:text-[color:var(--sk-ink,#1a2332)] active:translate-y-px active:shadow-[inset_0_3px_6px_rgba(90,130,165,0.45)]",
        ghost:
          "border-0 bg-transparent px-4 text-[color:var(--sk-link,#64748b)] shadow-none hover:bg-transparent hover:text-[color:var(--sk-ink-soft,#1a2332)] active:translate-y-px active:text-[color:var(--sk-ink-press,#1a2332)]",
        brand:
          "border-0 bg-[linear-gradient(180deg,#3bbcff_0%,var(--sk-brand,#02a7ff)_48%,#0290e0_100%)] text-white shadow-[var(--sk-brand-shadow,0_12px_22px_-10px_rgba(2,167,255,0.55))] hover:-translate-y-px hover:brightness-105 hover:shadow-[var(--sk-brand-shadow-hover,0_16px_28px_-12px_rgba(2,167,255,0.55))] active:translate-y-px active:shadow-[0_3px_8px_-1px_rgba(2,167,255,0.3),inset_0_2px_4px_rgba(0,90,140,0.35)]",
        destructive:
          "border-0 bg-[image:var(--sk-light-bg)] text-rose-700 shadow-[var(--sk-raised-shadow)] hover:-translate-y-px hover:shadow-[var(--sk-shadow-raised-hover)] active:translate-y-px active:bg-[image:var(--sk-sunken)]",
      },
      size: {
        default: "h-11 px-[22px]",
        sm: "h-8 rounded-[10px] px-3.5 text-xs",
        lg: "h-[50px] rounded-[13px] px-[26px] text-[14.5px]",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
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
