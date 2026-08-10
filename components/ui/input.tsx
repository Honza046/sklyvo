import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[12px] border border-white/90 bg-[image:var(--sk-sunken)] px-3.5 py-2 text-sm text-[color:var(--sk-ink)] shadow-[var(--sk-sunken-shadow)] outline-none ring-0 ring-offset-0 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[color:var(--sk-muted)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
