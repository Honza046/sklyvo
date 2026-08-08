"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full border-0 p-0.5 transition-[background,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sk-brand,#02a7ff)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:bg-[image:var(--sk-sunken)] data-[state=unchecked]:shadow-[var(--sk-sunken-shadow)]",
      "data-[state=checked]:bg-[linear-gradient(180deg,#3bbcff_0%,#02a7ff_52%,#0290e0_100%)] data-[state=checked]:shadow-[inset_0_1px_2px_rgba(0,90,140,0.28),0_6px_14px_-6px_rgba(2,167,255,0.55)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[18px] w-[18px] rounded-full bg-[color:var(--sk-thumb,#fff)] shadow-[0_3px_7px_rgba(30,70,110,0.3),inset_0_1px_0_var(--sk-highlight,#fff)] ring-0 transition-transform duration-150 data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
