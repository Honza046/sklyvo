"use client";

import { LayoutGrid, List } from "lucide-react";
import { useSlidingThumb } from "@/components/sklyvo/use-sliding-thumb";
import { cn } from "@/lib/utils";

export function SlidingViewToggle({
  view,
  onChange,
}: {
  view: "list" | "board";
  onChange: (view: "list" | "board") => void;
}) {
  const activeIndex = view === "list" ? 0 : 1;
  const { trackRef, thumbStyle } = useSlidingThumb(activeIndex, [view]);

  return (
    <div
      ref={trackRef as React.RefObject<HTMLDivElement>}
      className="sk-view-toggle"
    >
      <span className="sk-view-toggle__thumb" style={thumbStyle} aria-hidden />
      <button
        type="button"
        title="Seznam firem"
        data-slide-item
        onClick={() => onChange("list")}
        className={cn(
          "sk-view-toggle__item",
          view === "list" && "sk-view-toggle__item--active",
        )}
      >
        <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </button>
      <button
        type="button"
        title="Kanban board"
        data-slide-item
        onClick={() => onChange("board")}
        className={cn(
          "sk-view-toggle__item",
          view === "board" && "sk-view-toggle__item--active",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </button>
    </div>
  );
}
