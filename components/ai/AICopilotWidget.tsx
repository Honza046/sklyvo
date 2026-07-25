"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopilotMessage } from "@/components/ai/copilot-message";
import { CopilotSlashMenu, filterSlashCommands } from "@/components/ai/copilot-slash-menu";
import { AiMaskIcon } from "@/components/brand-marks";
import { useCopilot } from "@/context/CopilotContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  buildSystemContextMessage,
  getContextualPrompts,
  getSlashCommands,
  resolveCopilotResponse,
  type SlashCommand,
} from "@/lib/copilot/copilot-engine";
import type { CopilotGuideResponse } from "@/lib/copilot/setup-knowledge";
import type { CopilotAction } from "@/lib/copilot/action-links";
import { cn } from "@/lib/utils";

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      guide?: CopilotGuideResponse;
      actions?: CopilotAction[];
    };

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AICopilotWidget() {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { open, setOpen, pendingPrompt, consumePendingPrompt } = useCopilot();
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const systemContextRef = useRef("");

  const quickPrompts = useMemo(() => getContextualPrompts(pathname, t), [pathname, t]);
  const slashCommands = useMemo(() => getSlashCommands(t), [t]);
  const slashQuery = input.startsWith("/") ? input : "";
  const filteredSlashCommands = useMemo(
    () => filterSlashCommands(slashCommands, slashQuery),
    [slashCommands, slashQuery],
  );
  const slashMenuOpen = open && slashQuery.length > 0 && filteredSlashCommands.length > 0;

  const respondToUser = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { id: createId(), role: "user", content: trimmed }]);
      setInput("");
      setSlashActiveIndex(0);
      setIsThinking(true);

      await new Promise((resolve) => setTimeout(resolve, 650));

      systemContextRef.current = buildSystemContextMessage(pathname, language);
      const reply = resolveCopilotResponse(trimmed, pathname, language, t);
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: reply.content,
          guide: reply.guide,
          actions: reply.actions,
        },
      ]);

      setIsThinking(false);
    },
    [language, pathname, t],
  );

  useEffect(() => {
    if (!open) return;
    const pending = consumePendingPrompt();
    if (pending) {
      void respondToUser(pending);
    }
  }, [open, consumePendingPrompt, respondToUser]);

  useEffect(() => {
    for (const ref of [scrollRef, desktopScrollRef]) {
      if (!ref.current) continue;
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages, isThinking, open]);

  useEffect(() => {
    setSlashActiveIndex(0);
  }, [slashQuery]);

  const handleSubmit = () => {
    if (slashMenuOpen) {
      const command = filteredSlashCommands[slashActiveIndex];
      if (command) {
        void respondToUser(command.message);
      }
      return;
    }
    void respondToUser(input);
  };

  const handleSlashSelect = (command: SlashCommand) => {
    void respondToUser(command.message);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleMorphButtonClick = () => {
    if (open) {
      handleSubmit();
      return;
    }
    setOpen(true);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (slashMenuOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashActiveIndex((prev) =>
          prev + 1 >= filteredSlashCommands.length ? 0 : prev + 1,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashActiveIndex((prev) =>
          prev - 1 < 0 ? filteredSlashCommands.length - 1 : prev - 1,
        );
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setInput("");
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  const renderPanelBody = (variant: "mobile" | "desktop") => (
    <>
      <div className="flex shrink-0 items-center justify-between bg-blue-600 px-3 py-2.5 text-white md:py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <AiMaskIcon size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{t("copilot.title")}</p>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-blue-100/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {t("copilot.online")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="h-7 w-7 rounded-md p-0 text-white hover:bg-white/15 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={variant === "mobile" ? scrollRef : desktopScrollRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto rounded-t-xl bg-card px-3 py-3 pb-16 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col gap-3">
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              {t("copilot.welcome")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={`quick-prompt-${index}`}
                  type="button"
                  onClick={() => void respondToUser(prompt)}
                  className="cursor-pointer rounded-xl border border-dashed border-gray-200/80 bg-gray-50/50 p-2.5 text-left text-xs font-normal text-gray-400 transition-colors hover:border-purple-300 hover:bg-gray-50 hover:text-purple-600 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-500 dark:hover:border-purple-500/60 dark:hover:bg-zinc-900 dark:hover:text-purple-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <CopilotMessage
            key={message.id}
            content={message.content}
            actions={message.role === "assistant" ? message.actions : undefined}
            guide={message.role === "assistant" ? message.guide : undefined}
            isUser={message.role === "user"}
            onNavigate={handleClose}
            openEmailSettingsLabel={t("copilot.openEmailSettings")}
          />
        ))}

        {isThinking && (
          <div className="mr-auto flex items-center gap-1.5 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            {t("copilot.analyzing")}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t-0 bg-transparent px-4 pb-4 pt-2">
        {slashMenuOpen && (
          <CopilotSlashMenu
            commands={filteredSlashCommands}
            query={slashQuery}
            activeIndex={slashActiveIndex}
            onSelect={handleSlashSelect}
            onHover={setSlashActiveIndex}
          />
        )}
        <div className="flex h-10 items-center gap-1 rounded-full border border-gray-200/80 bg-white py-1 pl-4 pr-1.5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("copilot.placeholder")}
            className="h-8 min-h-8 flex-1 border-0 bg-transparent px-0 py-0 text-xs leading-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={handleInputKeyDown}
          />
          <Button
            type="button"
            onClick={handleMorphButtonClick}
            disabled={(!input.trim() && !slashMenuOpen) || isThinking}
            aria-label={t("copilot.send")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 p-0 text-white shadow-sm transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          open ? "pointer-events-auto opacity-100 bg-black/40 md:bg-transparent" : "pointer-events-none opacity-0",
        )}
        onClick={handleClose}
        aria-hidden={!open}
      />

      {/* Mobile bottom sheet — otevření z headeru, ne floating FAB */}
      <div
        role="dialog"
        aria-modal={open}
        aria-label={t("copilot.title")}
        aria-hidden={!open}
        className={cn(
          "fixed inset-x-3 z-[51] mx-auto flex h-[min(78dvh,520px)] w-auto max-w-lg flex-col overflow-hidden rounded-2xl bg-blue-600 shadow-xl transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:hidden",
          "bottom-[calc(3.75rem+env(safe-area-inset-bottom))]",
          open ? "pointer-events-auto translate-y-0" : "pointer-events-none translate-y-[110%]",
        )}
      >
        {renderPanelBody("mobile")}
      </div>

      {/* Desktop FAB */}
      <div className="fixed bottom-6 right-6 z-[51] hidden md:block">
        <div
          role="dialog"
          aria-modal={open}
          aria-label={t("copilot.title")}
          aria-hidden={!open}
          className={cn(
            "absolute bottom-full right-0 mb-3 flex w-[360px] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-xl bg-blue-600 shadow-xl transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] will-change-transform",
            open
              ? "pointer-events-auto h-[452px] translate-y-0 opacity-100"
              : "pointer-events-none h-[452px] translate-y-16 opacity-0",
          )}
        >
          {renderPanelBody("desktop")}
        </div>

        {!open && (
          <Button
            type="button"
            onClick={handleMorphButtonClick}
            aria-label={t("copilot.open")}
            className="h-11 w-11 shrink-0 rounded-full bg-blue-600 p-0 text-white shadow-md shadow-blue-600/25 transition-all duration-200 hover:bg-blue-700"
          >
            <AiMaskIcon size={26} className="text-white" />
          </Button>
        )}
      </div>
    </>
  );
}
