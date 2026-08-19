"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
  "aria-label"?: string;
};

/** Raised chip search — icon lives in the wrapper, not overlaid on the input. */
export function FilterSearch({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  autoComplete = "off",
  "aria-label": ariaLabel,
}: FilterSearchProps) {
  return (
    <div className={cn("sk-filter-search", className)}>
      <Search className="sk-filter-search__icon" strokeWidth={2} aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={ariaLabel ?? placeholder}
        className={cn("sk-filter-search__input sk-plain-field", inputClassName)}
      />
    </div>
  );
}
