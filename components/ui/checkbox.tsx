"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer grid h-4 w-4 shrink-0 place-content-center rounded-[4px] border-[1.5px] border-[color-mix(in_oklab,var(--sk-ink)_22%,transparent)] bg-transparent text-white shadow-none transition-[background,border-color] duration-150 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[color:var(--sk-ink)] data-[state=checked]:bg-[color:var(--sk-ink)] data-[state=checked]:shadow-none data-[state=indeterminate]:border-[color:var(--sk-ink)] data-[state=indeterminate]:bg-[color:var(--sk-ink)] data-[state=indeterminate]:shadow-none",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-3 w-3 stroke-[3]" aria-hidden />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
