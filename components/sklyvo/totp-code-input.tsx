"use client";

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

type TotpCodeInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Called when all 6 digits are filled (e.g. auto-submit). */
  onComplete?: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
};

function digitsOnly(raw: string) {
  return raw.replace(/\D/g, "").slice(0, LENGTH);
}

export function TotpCodeInput({
  id,
  value,
  onChange,
  disabled = false,
  onComplete,
  className,
  autoFocus = true,
}: TotpCodeInputProps) {
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const completedRef = useRef("");

  useEffect(() => {
    if (!autoFocus || disabled) return;
    refs.current[0]?.focus();
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (disabled) return;
    if (value.length === 0) {
      refs.current[0]?.focus();
    }
  }, [value, disabled]);

  useEffect(() => {
    if (value.length === LENGTH && value !== completedRef.current) {
      completedRef.current = value;
      onComplete?.(value);
    }
    if (value.length < LENGTH) {
      completedRef.current = "";
    }
  }, [value, onComplete]);

  function setAt(index: number, nextDigit: string) {
    const next = digits.map((d, i) => (i === index ? nextDigit : d));
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    return joined;
  }

  function focusIndex(index: number) {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, index))];
    el?.focus();
    el?.select();
  }

  function handleChange(index: number, raw: string) {
    const cleaned = digitsOnly(raw);
    if (!cleaned) {
      setAt(index, "");
      return;
    }

    // Paste / autofill into one cell can bring multiple digits
    if (cleaned.length > 1) {
      const merged = digitsOnly(
        value.slice(0, index) + cleaned + value.slice(index + 1),
      );
      onChange(merged);
      focusIndex(Math.min(LENGTH - 1, index + cleaned.length));
      return;
    }

    setAt(index, cleaned);
    if (index < LENGTH - 1) focusIndex(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        setAt(index, "");
        return;
      }
      if (index > 0) {
        setAt(index - 1, "");
        focusIndex(index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
    }
    if (event.key === "ArrowRight" && index < LENGTH - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = digitsOnly(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focusIndex(Math.min(LENGTH - 1, pasted.length));
  }

  return (
    <div
      className={cn("sklyvo-otp", className)}
      role="group"
      aria-label="Ověřovací kód"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={index === 0 ? id : undefined}
          className="sklyvo-otp__cell"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          name={index === 0 ? "otp" : undefined}
          pattern="[0-9]*"
          maxLength={index === 0 ? LENGTH : 1}
          placeholder="0"
          value={digit}
          disabled={disabled}
          aria-label={`Číslice ${index + 1} z ${LENGTH}`}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
        />
      ))}
    </div>
  );
}
