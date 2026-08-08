"use client";

import { useLanguage } from "@/components/sklyvo/language-provider";
import { isLanguage } from "@/lib/sklyvo/i18n";

export function LanguageToggle() {
  const { language, setLanguage, toggleSlots } = useLanguage();
  const index = Math.max(
    0,
    toggleSlots.findIndex((slot) => slot.code === language && slot.enabled),
  );
  const single = toggleSlots.length < 2;

  return (
    <div
      className="sklyvo-lang"
      data-single={single ? "true" : undefined}
      style={
        single
          ? undefined
          : ({ ["--sk-lang-count" as string]: toggleSlots.length } as React.CSSProperties)
      }
    >
      <span
        className="sklyvo-lang__thumb"
        style={{ transform: `translateX(${index * 42}px)` }}
      />
      {toggleSlots.map((slot) => {
        const pressed = slot.enabled && slot.code === language;
        return (
          <button
            key={slot.code}
            type="button"
            className="sklyvo-lang__btn"
            disabled={!slot.enabled}
            aria-disabled={!slot.enabled}
            aria-pressed={pressed}
            title={
              slot.enabled
                ? undefined
                : "Translation coming soon — using English"
            }
            onClick={() => {
              if (!slot.enabled || !isLanguage(slot.code)) return;
              setLanguage(slot.code);
            }}
          >
            {slot.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
