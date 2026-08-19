"use client";

import { cn } from "@/lib/utils";

export function ToolToggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn("sk-tool-toggle", className)}
      onClick={() => onChange(!checked)}
    >
      <span className="sk-tool-toggle__track" data-on={checked || undefined}>
        <span className="sk-tool-toggle__thumb" aria-hidden />
      </span>
      <span className="sk-tool-toggle__label" data-on={checked || undefined}>
        {label}
      </span>
    </button>
  );
}
