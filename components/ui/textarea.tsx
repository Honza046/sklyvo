import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-[12px] border border-white/90 bg-[image:var(--sk-sunken)] px-3.5 py-2.5 text-sm text-[color:var(--sk-ink)] shadow-[var(--sk-sunken-shadow)] outline-none ring-0 placeholder:text-[color:var(--sk-muted)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
