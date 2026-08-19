import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[42px] w-full rounded-[11px] border border-[color:var(--n-edge,rgba(255,255,255,0.13))] bg-[color:var(--n-field,#131417)] px-3.5 py-2 text-[13px] text-[color:var(--sk-ink-soft,#f2f3f5)] shadow-none outline-none ring-0 ring-offset-0 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[color:var(--n-dim,#6b7078)] focus:border-[rgba(255,255,255,0.24)] focus:bg-[color:var(--n-field-focus,#1d1f24)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
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
