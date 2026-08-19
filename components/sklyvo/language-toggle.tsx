"use client";

import { useOptionalSklyvoLanguage } from "@/components/sklyvo/language-provider";
import {
  displayCodeForLanguage,
  languageFromToggleCode,
  useOptionalAppLanguage,
} from "@/context/LanguageContext";
import { isLanguage } from "@/lib/sklyvo/i18n";
import type { ToggleSlot } from "@/lib/sklyvo/locale";

function useLanguageToggleState(): {
  displayLanguage: string;
  toggleSlots: ToggleSlot[];
  pickLanguage: (code: string) => void;
} {
  const sklyvo = useOptionalSklyvoLanguage();
  const app = useOptionalAppLanguage();

  if (sklyvo) {
    return {
      displayLanguage: sklyvo.language,
      toggleSlots: sklyvo.toggleSlots,
      pickLanguage: (code) => {
        if (!isLanguage(code)) return;
        sklyvo.setLanguage(code);
      },
    };
  }

  if (app) {
    const displayLanguage = displayCodeForLanguage(app.language);
    return {
      displayLanguage,
      toggleSlots: app.toggleSlots,
      pickLanguage: (code) => {
        const next = languageFromToggleCode(code);
        if (!next) return;
        app.setLanguage(next);
      },
    };
  }

  throw new Error("LanguageToggle must be used inside a LanguageProvider");
}

export function LanguageToggle() {
  const { displayLanguage, toggleSlots, pickLanguage } =
    useLanguageToggleState();
  const index = Math.max(
    0,
    toggleSlots.findIndex(
      (slot) => slot.code === displayLanguage && slot.enabled,
    ),
  );
  const single = toggleSlots.length < 2;

  return (
    <div
      className="sklyvo-lang"
      data-single={single ? "true" : undefined}
      style={
        single
          ? undefined
          : ({
              ["--sk-lang-count" as string]: toggleSlots.length,
            } as React.CSSProperties)
      }
    >
      <span
        className="sklyvo-lang__thumb"
        style={{ transform: `translateX(${index * 42}px)` }}
      />
      {toggleSlots.map((slot) => {
        const pressed = slot.enabled && slot.code === displayLanguage;
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
              if (!slot.enabled) return;
              pickLanguage(slot.code);
            }}
          >
            {slot.code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
