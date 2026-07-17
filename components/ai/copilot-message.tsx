"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CopilotGuideResponse } from "@/lib/copilot/setup-knowledge";
import type { CopilotAction } from "@/lib/copilot/action-links";
import { normalizeCopilotActionPath } from "@/lib/copilot/action-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTION_SLOT = /__ACTION_(\d+)__/g;

type CopilotMessageProps = {
  content: string;
  actions?: CopilotAction[];
  guide?: CopilotGuideResponse;
  isUser?: boolean;
  onNavigate?: () => void;
  openEmailSettingsLabel: string;
};

export function CopilotMessage({
  content,
  actions = [],
  guide,
  isUser,
  onNavigate,
  openEmailSettingsLabel,
}: CopilotMessageProps) {
  const router = useRouter();

  const handleAction = (path: string) => {
    const target = normalizeCopilotActionPath(path);
    const hash = target.includes("#") ? target.split("#")[1] : null;
    onNavigate?.();
    router.push(target);
    if (hash) {
      window.setTimeout(() => {
        document.getElementById(`${hash}-trigger`)?.click();
      }, 150);
    }
  };

  const renderContent = () => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    ACTION_SLOT.lastIndex = 0;
    while ((match = ACTION_SLOT.exec(content)) !== null) {
      const before = content.slice(lastIndex, match.index);
      if (before) parts.push(<span key={`t-${lastIndex}`}>{before}</span>);

      const actionIndex = Number(match[1]);
      const action = actions[actionIndex];
      if (action) {
        parts.push(
          <Button
            key={`a-${actionIndex}`}
            type="button"
            size="sm"
            onClick={() => handleAction(action.path)}
            className="mt-2 h-8 w-full justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
          >
            {action.label}
          </Button>,
        );
      }
      lastIndex = match.index + match[0].length;
    }

    const tail = content.slice(lastIndex);
    if (tail) parts.push(<span key={`t-tail`}>{tail}</span>);

    if (parts.length === 0) return <p>{content}</p>;
    return <div className="space-y-1 whitespace-pre-wrap">{parts}</div>;
  };

  return (
    <div
      className={cn(
        "max-w-[94%] rounded-xl px-3 py-2 text-xs leading-relaxed",
        isUser
          ? "ml-auto bg-blue-600 text-white"
          : "mr-auto border border-border/60 bg-background text-foreground",
      )}
    >
      {renderContent()}
      {!isUser && guide && (
        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
          {guide.steps.map((step) => (
            <div key={step.title}>
              <p className="text-xs font-semibold text-foreground">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.body}</p>
            </div>
          ))}
          <div className="pt-0.5">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{guide.footer}</p>
            <Button
              type="button"
              size="sm"
              onClick={() => handleAction(guide.settingsPath)}
              className="h-7 w-full rounded-lg bg-blue-600 px-2.5 text-xs text-white hover:bg-blue-700"
            >
              {openEmailSettingsLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
