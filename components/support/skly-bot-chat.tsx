"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopilotMessage } from "@/components/ai/copilot-message";
import {
  CopilotSlashMenu,
  filterSlashCommands,
} from "@/components/ai/copilot-slash-menu";
import { SklyvoMark } from "@/components/sklyvo/sklyvo-mark";
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

export type SklyBotChatHandle = {
  focusInput: () => void;
  ask: (question: string) => void;
};

export type SklyBotChatVariant = "teaser" | "fullscreen";

type SklyBotChatProps = {
  className?: string;
  variant?: SklyBotChatVariant;
  onExpand?: () => void;
  onCollapse?: () => void;
};

export const SklyBotChat = forwardRef<SklyBotChatHandle, SklyBotChatProps>(
  function SklyBotChat(
    { className, variant = "fullscreen", onExpand, onCollapse },
    ref,
  ) {
    const pathname = usePathname();
    const { t, language } = useLanguage();
    const { pendingPrompt, consumePendingPrompt } = useCopilot();
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [slashActiveIndex, setSlashActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const onExpandRef = useRef(onExpand);
    onExpandRef.current = onExpand;

    const isTeaser = variant === "teaser";
    const quickPrompts = useMemo(() => getContextualPrompts("/help", t), [t]);
    const slashCommands = useMemo(() => getSlashCommands(t), [t]);
    const slashQuery = input.startsWith("/") ? input : "";
    const filteredSlashCommands = useMemo(
      () => filterSlashCommands(slashCommands, slashQuery),
      [slashCommands, slashQuery],
    );
    const slashMenuOpen =
      slashQuery.length > 0 && filteredSlashCommands.length > 0;

    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    const respondToUser = useCallback(
      async (question: string) => {
        const trimmed = question.trim();
        if (!trimmed) return;

        onExpandRef.current?.();

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
            pathname: pathname || "/help",
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
              pathname || "/help",
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
          const fallback = resolveCopilotResponse(
            trimmed,
            pathname || "/help",
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
        } finally {
          setIsThinking(false);
        }
      },
      [language, pathname, t],
    );

    useImperativeHandle(
      ref,
      () => ({
        focusInput: () => inputRef.current?.focus(),
        ask: (question: string) => {
          void respondToUser(question);
          inputRef.current?.focus();
        },
      }),
      [respondToUser],
    );

    useEffect(() => {
      if (!pendingPrompt) return;
      const pending = consumePendingPrompt();
      if (pending) void respondToUser(pending);
    }, [pendingPrompt, consumePendingPrompt, respondToUser]);

    useEffect(() => {
      if (!scrollRef.current || isTeaser) return;
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isThinking, isTeaser]);

    useEffect(() => {
      setSlashActiveIndex(0);
    }, [slashQuery]);

    useEffect(() => {
      if (!isTeaser) {
        inputRef.current?.focus();
      }
    }, [isTeaser]);

    const handleSubmit = () => {
      if (slashMenuOpen) {
        const command = filteredSlashCommands[slashActiveIndex];
        if (command) void respondToUser(command.message);
        return;
      }
      void respondToUser(input);
    };

    const handleSlashSelect = (command: SlashCommand) => {
      void respondToUser(command.message);
    };

    const handleClearChat = () => {
      setMessages([]);
      setIsThinking(false);
      setInput("");
      setSlashActiveIndex(0);
    };

    const handleCollapse = () => {
      onCollapse?.();
    };

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
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

    const composer = (
      <div className="sk-support-chat__composer relative">
        {slashMenuOpen ? (
          <div className="absolute inset-x-3 bottom-full z-10 mb-2">
            <CopilotSlashMenu
              commands={filteredSlashCommands}
              query={slashQuery}
              activeIndex={slashActiveIndex}
              onSelect={handleSlashSelect}
              onHover={setSlashActiveIndex}
            />
          </div>
        ) : null}
        <div className="sk-support-chat__input-row">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={
              isTeaser ? t("help.chatPlaceholder") : t("copilot.placeholder")
            }
            className="h-11 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={isThinking}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isThinking || (!input.trim() && !slashMenuOpen)}
            className="sk-btn sk-btn--primary sk-btn--icon h-9 w-9 shrink-0 rounded-[10px] p-0"
            aria-label={t("copilot.send")}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );

    if (isTeaser) {
      return (
        <section
          className={cn(
            "sk-support-chat sk-support-chat--teaser sk-support-chat--input-only",
            className,
          )}
        >
          {composer}
        </section>
      );
    }

    return (
      <section
        className={cn("sk-support-chat sk-support-chat--fullscreen", className)}
      >
        <header className="sk-support-chat__head">
          <div className="flex min-w-0 items-center gap-3">
            {onCollapse ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCollapse}
                className="h-9 shrink-0 gap-1.5 rounded-xl px-2.5 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-ink)]"
                aria-label={t("help.chatClose")}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden text-xs font-medium sm:inline">
                  {t("help.chatClose")}
                </span>
              </Button>
            ) : null}
            <div className="sk-support-chat__avatar" aria-hidden>
              <SklyvoMark size={28} />
            </div>
            <div className="min-w-0">
              <p className="sk-type-h3 truncate">{t("copilot.title")}</p>
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--sk-muted)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {t("copilot.online")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={messages.length === 0 && !isThinking && !input.trim()}
            className="h-8 w-8 rounded-xl p-0 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-ink)]"
            aria-label={t("copilot.clearChat")}
            title={t("copilot.clearChat")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </header>

        <div ref={scrollRef} className="sk-support-chat__body">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col gap-3">
              <p className="sk-type-body px-0.5">{t("copilot.welcome")}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              actions={
                message.role === "assistant" ? message.actions : undefined
              }
              guide={message.role === "assistant" ? message.guide : undefined}
              isUser={message.role === "user"}
              openEmailSettingsLabel={t("copilot.openEmailSettings")}
            />
          ))}

          {isThinking ? (
            <div
              className="sk-copilot-bubble mr-auto flex w-fit items-center gap-1.5 self-start px-3 py-2.5"
              aria-label={t("copilot.analyzing")}
              role="status"
            >
              <span className="sk-typing-dot" />
              <span className="sk-typing-dot" />
              <span className="sk-typing-dot" />
            </div>
          ) : null}
        </div>

        {composer}
      </section>
    );
  },
);
