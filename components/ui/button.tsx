import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * /login2 buttons: white primary · hairline secondary · flat, no soft shadows.
 * Heights: sm 32 · default 44 · lg 50 · icon 44
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[13.5px] font-semibold tracking-[-0.01em] shadow-none transition-[transform,background,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sk-brand,#02a7ff)]/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[color:var(--n-field,#15161a)] disabled:text-[color:var(--n-dim,#6b7078)] disabled:shadow-none disabled:opacity-100 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-[color:var(--sk-cta,#fff)] text-[color:var(--sk-cta-ink,#08090a)] hover:bg-[color:var(--sk-cta-hover,#f0f2f5)] active:scale-[0.985] active:bg-[color:var(--sk-cta-active,#dfe3e8)]",
        primary:
          "border-0 bg-[color:var(--sk-cta,#fff)] text-[color:var(--sk-cta-ink,#08090a)] hover:bg-[color:var(--sk-cta-hover,#f0f2f5)] active:scale-[0.985] active:bg-[color:var(--sk-cta-active,#dfe3e8)]",
        secondary:
          "border border-[color:var(--n-edge,rgba(255,255,255,0.1))] bg-[color:var(--n-field,#15161a)] text-[color:var(--sk-ink,#fafafb)] hover:border-[color:var(--n-edge-hover,rgba(255,255,255,0.22))] hover:bg-[color:var(--n-hover,#191a1e)] active:scale-[0.985]",
        outline:
          "border border-[color:var(--n-edge,rgba(255,255,255,0.1))] bg-[color:var(--n-field,#15161a)] text-[color:var(--sk-ink,#fafafb)] hover:border-[color:var(--n-edge-hover,rgba(255,255,255,0.22))] hover:bg-[color:var(--n-hover,#191a1e)] active:scale-[0.985]",
        engraved:
          "border border-[color:var(--n-edge,rgba(255,255,255,0.1))] bg-[color:var(--n-field,#15161a)] text-[color:var(--sk-muted,#8a8f98)] hover:text-[color:var(--sk-ink,#fafafb)] hover:bg-[color:var(--n-hover,#191a1e)] active:scale-[0.985]",
        ghost:
          "border-0 bg-transparent px-4 text-[color:var(--sk-link,#8a8f98)] shadow-none hover:bg-transparent hover:text-[color:var(--sk-ink-soft,#f2f3f5)]",
        brand:
          "border-0 bg-[color:var(--sk-brand,#02a7ff)] text-white hover:brightness-105 active:scale-[0.985]",
        destructive:
          "border border-[color:var(--n-edge,rgba(255,255,255,0.1))] bg-[color:var(--n-field,#15161a)] text-rose-400 hover:border-[color:var(--n-edge-hover,rgba(255,255,255,0.22))] hover:bg-[color:var(--n-hover,#191a1e)] active:scale-[0.985]",
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
