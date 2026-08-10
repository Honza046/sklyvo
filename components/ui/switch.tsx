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
      "peer relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-[background,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:bg-[image:var(--sk-sunken)] data-[state=unchecked]:shadow-[var(--sk-sunken-shadow)]",
      "data-[state=checked]:bg-[image:var(--sk-ink-bg)] data-[state=checked]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-[3px] top-[3px] block h-5 w-5 rounded-full bg-[color:var(--sk-thumb,#fff)] shadow-[0_4px_10px_-4px_rgba(0,0,0,0.45),inset_0_1.5px_0_var(--sk-highlight,#fff)] ring-0 transition-transform duration-[280ms] ease-[cubic-bezier(0.34,1.35,0.5,1)] data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
