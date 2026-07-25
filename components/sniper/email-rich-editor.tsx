"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmailRichEditorProps = {
  /** Počáteční HTML; při změně `key` na rodiči se editor znovu namountuje. */
  value: string;
  onChange: (html: string) => void;
  className?: string;
};

function runCommand(command: string) {
  document.execCommand(command, false);
}

export function EmailRichEditor({ value, onChange, className }: EmailRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (el) el.innerHTML = value || "";
    // Jen při mountu (rodič mění key po vygenerování).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const applyFormat = (command: "bold" | "italic" | "underline") => {
    editorRef.current?.focus();
    runCommand(command);
    emitChange();
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/50 bg-background", className)}>
      <div className="flex items-center gap-0.5 border-b border-border/50 bg-muted/30 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Tučně"
          aria-label="Tučně"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("bold")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Kurzíva"
          aria-label="Kurzíva"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("italic")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Podtržení"
          aria-label="Podtržení"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("underline")}
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline
        aria-label="Text e-mailu"
        suppressContentEditableWarning
        className="min-h-[140px] max-h-[min(36dvh,240px)] overflow-y-auto px-3 py-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:min-h-[220px] sm:max-h-none sm:overflow-visible sm:px-4 sm:py-4 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline"
        onInput={emitChange}
        onBlur={emitChange}
      />
    </div>
  );
}
