"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ExpandOverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

/**
 * Expanded table popup — sits in the main content column (sidebar stays clear),
 * sized like the compact table area: under Autopilot chrome, full remaining height.
 */
export function ExpandOverlay({
  open,
  onClose,
  title,
  description,
  children,
}: ExpandOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex">
      {/* Matches dashboard sidebar width — stays clear, no dim */}
      <div className="hidden w-64 shrink-0 md:block" aria-hidden="true" />

      {/* Dimmed content column + popup aligned to table footprint */}
      <div className="relative min-h-0 min-w-0 flex-1">
        <button
          type="button"
          aria-label="Zavřít"
          className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
          onClick={onClose}
        />

        {/*
          Wide popup in the content column (sidebar stays clear).
          Sized to fit queue columns without horizontal scroll and show more rows.
        */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 flex items-center justify-center px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="expand-overlay-title"
            className={cn(
              "pointer-events-auto flex w-full max-w-7xl flex-col overflow-hidden",
              "h-[min(92vh,980px)] max-h-[calc(100%-1.5rem)] sm:max-h-[calc(100%-2rem)]",
              "rounded-2xl border border-border/60 bg-background shadow-2xl",
            )}
          >
            <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4 pr-12 sm:px-6 sm:py-5">
              <div className="min-w-0 space-y-1 text-left">
                <h2
                  id="expand-overlay-title"
                  className="text-base font-semibold text-foreground sm:text-lg"
                >
                  {title}
                </h2>
                {description ? (
                  <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-sm p-1.5 opacity-70 transition-opacity hover:opacity-100 sm:right-5 sm:top-5"
                aria-label="Zavřít"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
