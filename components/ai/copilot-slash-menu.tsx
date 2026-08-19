"use client";

import { useEffect, useRef } from "react";
import type { SlashCommand } from "@/lib/copilot/copilot-engine";
import { cn } from "@/lib/utils";

type CopilotSlashMenuProps = {
  commands: SlashCommand[];
  query: string;
  activeIndex: number;
  onSelect: (command: SlashCommand) => void;
  onHover: (index: number) => void;
};

export function CopilotSlashMenu({
  commands,
  query,
  activeIndex,
  onSelect,
  onHover,
}: CopilotSlashMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter((command) =>
    command.label.toLowerCase().startsWith(query.toLowerCase()),
  );

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-slash-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      role="listbox"
      className="absolute bottom-full left-4 right-4 z-20 mb-2 max-h-36 overflow-y-auto rounded-xl border border-[color:var(--sk-border-soft)] bg-[image:var(--sk-glass)] p-1 text-[color:var(--sk-ink)] shadow-[var(--sk-popover-shadow)]"
    >
      {filtered.map((command, index) => (
        <button
          key={command.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          data-slash-index={index}
          onMouseEnter={() => onHover(index)}
          onClick={() => onSelect(command)}
          className={cn(
            "flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors",
            index === activeIndex
              ? "bg-[color-mix(in_oklab,var(--sk-brand)_14%,var(--n-field))] text-foreground "
              : "hover:bg-muted/60",
          )}
        >
          <span className="text-xs font-semibold text-[color:var(--sk-brand)] ">
            {command.label}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {command.description}
          </span>
        </button>
      ))}
    </div>
  );
}

export function filterSlashCommands(
  commands: SlashCommand[],
  query: string,
): SlashCommand[] {
  return commands.filter((command) =>
    command.label.toLowerCase().startsWith(query.toLowerCase()),
  );
}
