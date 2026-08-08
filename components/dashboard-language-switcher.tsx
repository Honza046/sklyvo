"use client";

import {
  displayCodeForLanguage,
  languageFromToggleCode,
  useLanguage,
} from "@/context/LanguageContext";
import { useSlidingThumb } from "@/components/sklyvo/use-sliding-thumb";

/**
 * Same segmented regional | EN switch as login — sliding thumb.
 */
export function DashboardLanguageSwitcher({
  variant = "expand",
}: {
  variant?: "expand" | "compact";
}) {
  const { language, setLanguage, toggleSlots } = useLanguage();
  const activeCode = displayCodeForLanguage(language);
  const index = Math.max(
    0,
    toggleSlots.findIndex((slot) => slot.code === activeCode && slot.enabled),
  );
  const single = toggleSlots.length < 2;
  const { trackRef, thumbStyle } = useSlidingThumb(index, [toggleSlots.length, variant]);

  return (
    <div
      ref={trackRef as React.RefObject<HTMLDivElement>}
      className="sk-lang shrink-0"
      data-variant={variant}
      data-single={single ? "true" : undefined}
      role="group"
      aria-label="Language"
    >
      <span className="sk-lang__thumb" style={thumbStyle} aria-hidden />
      {toggleSlots.map((slot) => {
        const pressed = slot.enabled && slot.code === activeCode;
        return (
          <button
            key={slot.code}
            type="button"
            data-slide-item
            className="sk-lang__btn"
            disabled={!slot.enabled}
            aria-disabled={!slot.enabled}
            aria-pressed={pressed}
            title={
              slot.enabled
                ? undefined
                : "Translation coming soon — using English"
            }
            onClick={() => {
              if (!slot.enabled) return;
              const next = languageFromToggleCode(slot.code);
              if (next) setLanguage(next);
            }}
          >
            {slot.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
