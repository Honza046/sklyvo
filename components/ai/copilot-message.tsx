"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CopilotGuideResponse } from "@/lib/copilot/setup-knowledge";
import type { CopilotAction } from "@/lib/copilot/action-links";
import { normalizeCopilotActionPath } from "@/lib/copilot/action-links";
import { Button } from "@/components/ui/button";
import { DATE_LOCALE, type Language } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const ACTION_SLOT = /__ACTION_(\d+)__/g;

/** Inline markdown → React (bold / italic / code). */
function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[2] != null) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`} className="font-semibold">
          {match[2]}
        </strong>,
      );
    } else if (match[3] != null) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i++}`} className="italic">
          {match[3]}
        </em>,
      );
    } else if (match[4] != null) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i++}`}
          className="rounded bg-muted/80 px-1 py-0.5 font-mono text-[10px]"
        >
          {match[4]}
        </code>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function formatMessageTime(createdAt: number, language: Language) {
  return new Intl.DateTimeFormat(DATE_LOCALE[language], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

type CopilotMessageProps = {
  content: string;
  createdAt: number;
  locale: Language;
  actions?: CopilotAction[];
  guide?: CopilotGuideResponse;
  isUser?: boolean;
  onNavigate?: () => void;
  openEmailSettingsLabel: string;
};

export function CopilotMessage({
  content,
  createdAt,
  locale,
  actions = [],
  guide,
  isUser,
  onNavigate,
  openEmailSettingsLabel,
}: CopilotMessageProps) {
  const router = useRouter();
  const timeLabel = formatMessageTime(createdAt, locale);

  const handleAction = (path: string) => {
    const target = normalizeCopilotActionPath(path);
    if (!target) return;
    const hash = target.includes("#") ? target.split("#")[1] : null;
    onNavigate?.();
    router.push(target);
    if (hash) {
      window.setTimeout(() => {
        document.getElementById(`${hash}-trigger`)?.click();
      }, 150);
    }
  };

  const renderTextChunk = (text: string, key: string) => {
    if (!text) return null;
    if (isUser) {
      return (
        <span key={key} className="whitespace-pre-wrap break-words">
          {text}
        </span>
      );
    }
    return (
      <span key={key} className="whitespace-pre-wrap break-words">
        {renderInlineMarkdown(text, key)}
      </span>
    );
  };

  const renderContent = () => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    ACTION_SLOT.lastIndex = 0;
    while ((match = ACTION_SLOT.exec(content)) !== null) {
      const before = content.slice(lastIndex, match.index);
      const chunk = renderTextChunk(before, `t-${lastIndex}`);
      if (chunk) parts.push(chunk);

      const actionIndex = Number(match[1]);
      const action = actions[actionIndex];
      if (action) {
        parts.push(
          <Button
            key={`a-${actionIndex}`}
            type="button"
            size="sm"
            onClick={() => handleAction(action.path)}
            className="mt-2 h-8 w-full justify-center rounded-lg bg-[color:var(--sk-brand,#02a7ff)] px-3 text-xs font-semibold text-white hover:brightness-105"
          >
            {action.label}
          </Button>,
        );
      }
      lastIndex = match.index + match[0].length;
    }

    const tailChunk = renderTextChunk(content.slice(lastIndex), "t-tail");
    if (tailChunk) parts.push(tailChunk);

    if (parts.length === 0) {
      return (
        <p className="m-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {isUser ? content : renderInlineMarkdown(content, "all")}
        </p>
      );
    }
    return <div className="space-y-1">{parts}</div>;
  };

  return (
    <div
      className={cn(
        "group flex w-fit max-w-[85%] flex-col gap-1",
        isUser ? "ml-auto items-end" : "mr-auto items-start",
      )}
    >
      <div
        className={cn(
          "w-fit max-w-full rounded-2xl px-3 py-2 text-xs leading-relaxed",
          isUser
            ? "bg-[color:var(--sk-brand,#02a7ff)] text-white shadow-[0_8px_18px_-10px_rgba(2,167,255,0.55)]"
            : "sk-copilot-bubble",
        )}
      >
        {renderContent()}
        {!isUser && guide && (
          <div className="mt-3 w-full min-w-[12rem] space-y-2 border-t border-border/50 pt-3">
            {guide.steps.map((step) => (
              <div key={step.title}>
                <p className="text-xs font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.body}</p>
              </div>
            ))}
            <div className="pt-0.5">
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                {guide.footer}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => handleAction(guide.settingsPath)}
                className="h-7 w-full rounded-lg bg-[color:var(--sk-brand,#02a7ff)] px-2.5 text-xs text-white hover:brightness-105"
              >
                {openEmailSettingsLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
      <time
        dateTime={new Date(createdAt).toISOString()}
        className={cn(
          "px-1 text-[10px] tabular-nums text-muted-foreground/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
          isUser ? "self-end text-right" : "self-start text-left",
        )}
      >
        {timeLabel}
      </time>
    </div>
  );
}
