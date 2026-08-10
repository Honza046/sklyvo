"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ArrowUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopilotMessage } from "@/components/ai/copilot-message";
import {
  CopilotSlashMenu,
  filterSlashCommands,
} from "@/components/ai/copilot-slash-menu";
import { AiMaskIcon } from "@/components/brand-marks";
import { useCopilot } from "@/context/CopilotContext";
import { useLanguage } from "@/context/LanguageContext";
import { askCopilot } from "@/app/actions/copilot";
import {
  getContextualPrompts,
  getSlashCommands,
  resolveCopilotResponse,
  type SlashCommand,
} from "@/lib/copilot/copilot-engine";
import type { CopilotGuideResponse } from "@/lib/copilot/setup-knowledge";
import type { CopilotAction } from "@/lib/copilot/action-links";
import { cn } from "@/lib/utils";

type ChatMessage =
  | { id: string; role: "user"; content: string; createdAt: number }
  | {
      id: string;
      role: "assistant";
      content: string;
      createdAt: number;
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

  const quickPrompts = useMemo(
    () => getContextualPrompts(pathname, t),
    [pathname, t],
  );
  const slashCommands = useMemo(() => getSlashCommands(t), [t]);
  const slashQuery = input.startsWith("/") ? input : "";
  const filteredSlashCommands = useMemo(
    () => filterSlashCommands(slashCommands, slashQuery),
    [slashCommands, slashQuery],
  );
  const slashMenuOpen =
    open && slashQuery.length > 0 && filteredSlashCommands.length > 0;

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const respondToUser = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      const history = messagesRef.current
        .filter((m) => m.content.trim().length > 0)
        .slice(-10)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        },
      ]);
      setInput("");
      setSlashActiveIndex(0);
      setIsThinking(true);

      try {
        const reply = await askCopilot({
          question: trimmed,
          pathname,
          language,
          history,
        });

        if (reply.content.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: reply.content,
              createdAt: Date.now(),
              guide: reply.guide,
              actions: reply.actions,
            },
          ]);
        } else {
          const fallback = resolveCopilotResponse(
            trimmed,
            pathname,
            language,
            t,
          );
          setMessages((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: fallback.content,
              createdAt: Date.now(),
              guide: fallback.guide,
              actions: fallback.actions,
            },
          ]);
        }
      } catch {
        const fallback = resolveCopilotResponse(trimmed, pathname, language, t);
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: fallback.content,
            createdAt: Date.now(),
            guide: fallback.guide,
            actions: fallback.actions,
          },
        ]);
      } finally {
        setIsThinking(false);
      }
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
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isThinking, open]);

  useEffect(() => {
    setSlashActiveIndex(0);
  }, [slashQuery]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Zamknout scroll stránky pod otevřeným chatem (viewport overlay, ne konec dokumentu)
  useEffect(() => {
    if (!open) return;

    const scrollRoots = [
      document.body,
      document.documentElement,
      ...Array.from(
        document.querySelectorAll<HTMLElement>("[data-dashboard-scroll]"),
      ),
    ];
    const previous = scrollRoots.map((el) => ({
      el,
      overflow: el.style.overflow,
      overscroll: el.style.overscrollBehavior,
    }));

    for (const el of scrollRoots) {
      el.style.overflow = "hidden";
      el.style.overscrollBehavior = "none";
    }

    return () => {
      for (const item of previous) {
        item.el.style.overflow = item.overflow;
        item.el.style.overscrollBehavior = item.overscroll;
      }
    };
  }, [open]);

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

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setIsThinking(false);
    setInput("");
    setSlashActiveIndex(0);
  }, []);

  const handleSendClick = () => {
    handleSubmit();
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

  const renderPanelBody = () => (
    <>
      <div className="sk-copilot-head flex shrink-0 items-center justify-between px-3 py-2.5 text-white md:py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <AiMaskIcon size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {t("copilot.title")}
            </p>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {t("copilot.online")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={messages.length === 0 && !isThinking && !input.trim()}
            className="h-7 w-7 rounded-md p-0 text-white hover:bg-white/15 hover:text-white disabled:opacity-40"
            aria-label={t("copilot.clearChat")}
            title={t("copilot.clearChat")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-7 w-7 rounded-md p-0 text-white hover:bg-white/15 hover:text-white"
            aria-label={t("copilot.close")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="sk-copilot-panel__body min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col gap-3">
            <p className="px-1 text-xs leading-relaxed text-[color:var(--sk-muted)]">
              {t("copilot.welcome")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={`quick-prompt-${index}`}
                  type="button"
                  onClick={() => void respondToUser(prompt)}
                  className="sk-copilot-chip cursor-pointer p-2.5 text-left text-xs font-normal"
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
            createdAt={message.createdAt}
            locale={language}
            actions={message.role === "assistant" ? message.actions : undefined}
            guide={message.role === "assistant" ? message.guide : undefined}
            isUser={message.role === "user"}
            onNavigate={handleClose}
            openEmailSettingsLabel={t("copilot.openEmailSettings")}
          />
        ))}

        {isThinking && (
          <div
            className="sk-copilot-bubble mr-auto flex w-fit items-center gap-1.5 self-start px-3 py-2.5"
            aria-label={t("copilot.analyzing")}
            role="status"
          >
            <span className="sk-typing-dot" />
            <span className="sk-typing-dot" />
            <span className="sk-typing-dot" />
          </div>
        )}
      </div>

      <div className="sk-copilot-panel__foot relative z-10 shrink-0 px-3 pb-3 pt-2.5">
        {slashMenuOpen && (
          <CopilotSlashMenu
            commands={filteredSlashCommands}
            query={slashQuery}
            activeIndex={slashActiveIndex}
            onSelect={handleSlashSelect}
            onHover={setSlashActiveIndex}
          />
        )}
        <div className="sk-copilot-panel__input">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("copilot.placeholder")}
            className="h-8 min-h-8 flex-1 border-0 bg-transparent px-0 py-0 text-xs leading-none shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={handleInputKeyDown}
          />
          <Button
            type="button"
            onClick={handleSendClick}
            disabled={(!input.trim() && !slashMenuOpen) || isThinking}
            aria-label={t("copilot.send")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 text-white shadow-[var(--sk-brand-shadow,0_8px_16px_-6px_rgba(2,167,255,0.55))] transition-all duration-200 hover:brightness-105 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(165deg, #5ecfff 0%, #02a7ff 42%, #0177c2 100%)",
            }}
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[100] transition-opacity duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          open
            ? "pointer-events-auto opacity-100 bg-black/20"
            : "pointer-events-none opacity-0",
        )}
        onClick={handleClose}
        onWheel={(event) => event.preventDefault()}
        onTouchMove={(event) => event.preventDefault()}
        aria-hidden={!open}
      />

      <div
        role="dialog"
        aria-modal={open}
        aria-label={t("copilot.title")}
        aria-hidden={!open}
        className={cn(
          "fixed bottom-6 right-6 z-[101] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl sk-copilot-panel transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          "h-[min(560px,calc(100dvh-3rem))] max-h-[calc(100dvh-3rem)] origin-bottom-right",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        {renderPanelBody()}
      </div>

      <Button
        type="button"
        variant="ghost"
        className={cn(
          "sk-fab fixed bottom-6 right-6 z-[99] flex",
          "hover:bg-transparent hover:text-white",
          open && "pointer-events-none opacity-0",
        )}
        aria-label={t("copilot.open")}
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        data-tour="onboarding-copilot"
        onClick={() => setOpen(true)}
      >
        <AiMaskIcon size={28} className="text-white drop-shadow-sm" />
      </Button>
    </>,
    document.body,
  );
}
