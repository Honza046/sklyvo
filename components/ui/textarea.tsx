import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-[10px] border border-[color:var(--n-edge,rgba(255,255,255,0.1))] bg-[color:var(--n-field,#15161a)] px-3.5 py-2.5 text-sm text-[color:var(--sk-ink-soft,#f2f3f5)] shadow-none outline-none ring-0 placeholder:text-[color:var(--n-dim,#6b7078)] focus:border-[color:var(--n-edge-hover,rgba(255,255,255,0.22))] focus:bg-[color:var(--n-field-focus,#1d1f24)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
