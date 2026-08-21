"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CrmMatejCheckbox({
  checked,
  indeterminate,
  onChange,
  "aria-label": ariaLabel,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label"?: string;
  className?: string;
}) {
  const on = checked || indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      data-state={
        indeterminate ? "indeterminate" : checked ? "checked" : "unchecked"
      }
      aria-label={ariaLabel}
      className={cn("sk-crm-check", on && "sk-crm-check--on", className)}
      onClick={onChange}
    >
      {checked ? (
        <Check className="h-3 w-3 text-[#08090A]" strokeWidth={3} aria-hidden />
      ) : indeterminate ? (
        <span className="sk-crm-check__dash" aria-hidden />
      ) : null}
    </button>
  );
}
