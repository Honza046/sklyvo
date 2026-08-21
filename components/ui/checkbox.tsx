"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => {
  const on = checked === true || checked === "indeterminate";

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn("sk-crm-check", on && "sk-crm-check--on", className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-content-center">
        {checked === "indeterminate" ? (
          <span className="sk-crm-check__dash" aria-hidden />
        ) : (
          <Check
            className="h-3 w-3 text-[#08090A]"
            strokeWidth={3}
            aria-hidden
          />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
