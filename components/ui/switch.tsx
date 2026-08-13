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
      "peer relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border p-0 transition-[background,border-color] duration-200 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:border-[color:var(--n-edge,rgba(255,255,255,0.1))] data-[state=unchecked]:bg-[color:var(--n-field,#15161a)] data-[state=unchecked]:shadow-none",
      "data-[state=checked]:border-transparent data-[state=checked]:bg-white data-[state=checked]:shadow-none",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-[3px] top-[3px] block h-5 w-5 rounded-full bg-[color:var(--n-text-soft,#f2f3f5)] shadow-none ring-0 transition-transform duration-[280ms] ease-[cubic-bezier(0.34,1.35,0.5,1)] data-[state=checked]:translate-x-5 data-[state=checked]:bg-[#08090a] data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
