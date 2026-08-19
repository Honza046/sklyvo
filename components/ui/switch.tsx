"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border p-0 transition-[background,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sk-brand,#02a7ff)]/35 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:border-[color:var(--n-edge,rgba(255,255,255,0.12))] data-[state=unchecked]:bg-[color:var(--n-field,#15161a)]",
      "data-[state=checked]:border-transparent data-[state=checked]:bg-[color:var(--sk-brand,#02a7ff)]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-[3px] top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full shadow-none ring-0 transition-[transform,background] duration-[220ms] ease-[cubic-bezier(0.34,1.2,0.5,1)]",
        "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-[color:var(--n-dim,#6b7078)]",
        "data-[state=checked]:translate-x-5 data-[state=checked]:-translate-y-1/2 data-[state=checked]:bg-white",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
