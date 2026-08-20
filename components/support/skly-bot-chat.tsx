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
import { ArrowLeft, ArrowRight, ArrowUp, Search, Trash2 } from "lucide-react";
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
import { getWorkspaceAccessState } from "@/app/actions/auth";
import {
  getContextualPrompts,
  getHelpBotPrompts,
  getSlashCommands,
  resolveCopilotResponse,
  type SlashCommand,
} from "@/lib/copilot/copilot-engine";
import type { CopilotGuideResponse } from "@/lib/copilot/setup-knowledge";
import type { CopilotAction } from "@/lib/copilot/action-links";
import { toCzechVocative } from "@/lib/sklyvo/czech-vocative";
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function useIntroTypewriter(texts: string[] | null) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [currentPartial, setCurrentPartial] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const lines = texts ?? [];
    if (!lines.length) return;

    let cancelled = false;
    const CHAR_MS = 16;
    const PAUSE_BETWEEN = 480;

    async function run() {
      setDisplayed([]);
      setCurrentPartial("");
      setComplete(false);

      for (let index = 0; index < lines.length; index += 1) {
        if (index > 0) {
          await sleep(PAUSE_BETWEEN);
          if (cancelled) return;
        }

        const text = lines[index] ?? "";

        for (let charIndex = 0; charIndex <= text.length; charIndex += 1) {
          if (cancelled) return;
          setCurrentPartial(text.slice(0, charIndex));
          if (charIndex < text.length) {
            await sleep(CHAR_MS);
          }
        }

        setDisplayed((prev) => [...prev, text]);
        setCurrentPartial("");
      }

      setComplete(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [texts?.join("\u0000") ?? ""]);

  return { displayed, currentPartial, complete };
}

export type SklyBotChatHandle = {
  focusInput: () => void;
  ask: (question: string) => void;
};

export type SklyBotChatVariant = "teaser" | "fullscreen" | "panel";

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
    const [introTexts, setIntroTexts] = useState<string[] | null>(null);
    const [clientReady, setClientReady] = useState(false);
    const [slashActiveIndex, setSlashActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const onExpandRef = useRef(onExpand);
    onExpandRef.current = onExpand;

    const isTeaser = variant === "teaser";
    const isPanel = variant === "panel";
    const quickPrompts = useMemo(
      () => (isPanel ? getHelpBotPrompts(t) : getContextualPrompts("/help", t)),
      [isPanel, t],
    );
    const slashCommands = useMemo(() => getSlashCommands(t), [t]);
    const slashQuery = input.startsWith("/") ? input : "";
    const filteredSlashCommands = useMemo(
      () => filterSlashCommands(slashCommands, slashQuery),
      [slashCommands, slashQuery],
    );
    const slashMenuOpen =
      slashQuery.length > 0 && filteredSlashCommands.length > 0;

    useEffect(() => {
      setClientReady(true);
    }, []);

    useEffect(() => {
      if (!clientReady) return;
      void getWorkspaceAccessState().then((session) => {
        const first =
          session.user?.firstName?.trim() ||
          session.user?.name?.trim().split(/\s+/)[0] ||
          "";
        const raw = first.trim();
        const name =
          !raw
            ? language === "cz"
              ? "Uživateli"
              : "there"
            : language === "cz"
              ? toCzechVocative(raw)
              : raw;
        setIntroTexts([t("help.botHello", { name }), t("help.botHello2")]);
      });
    }, [clientReady, language, t]);

    const introTypewriter = useIntroTypewriter(
      clientReady && isPanel ? introTexts : null,
    );

    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    const respondToUser = useCallback(
      async (question: string) => {
        const trimmed = question.trim();
        if (!trimmed) return;

        if (!isPanel) {
          onExpandRef.current?.();
        }

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
      [isPanel, language, pathname, t],
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
    }, [
      messages,
      isThinking,
      isTeaser,
      introTypewriter.displayed,
      introTypewriter.currentPartial,
    ]);

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

    const slashMenu = slashMenuOpen ? (
      <div className="absolute inset-x-3 bottom-full z-10 mb-2">
        <CopilotSlashMenu
          commands={filteredSlashCommands}
          query={slashQuery}
          activeIndex={slashActiveIndex}
          onSelect={handleSlashSelect}
          onHover={setSlashActiveIndex}
        />
      </div>
    ) : null;

    if (isPanel) {
      return (
        <section className={cn("sk-help-chat flex min-h-0 flex-col", className)}>
          <header className="sk-help-chat__head">
            <SklyvoMark size={30} tone="grey" interactive={false} />
            <div className="min-w-0">
              <div className="sk-help-chat__name">{t("copilot.title")}</div>
              <div className="sk-help-chat__status">
                <span className="sk-help-chat__dot sk-live-dot" aria-hidden />
                {t("copilot.online")}
              </div>
            </div>
          </header>

          <div ref={scrollRef} className="sk-help-chat__body">
            {clientReady ? (
              <>
                {introTypewriter.displayed.map((text, index) => (
                  <div
                    key={`intro-${index}`}
                    className="sk-help-bubble sk-help-bubble--bot"
                  >
                    {text}
                  </div>
                ))}

                {introTypewriter.currentPartial ? (
                  <div className="sk-help-bubble sk-help-bubble--bot">
                    {introTypewriter.currentPartial}
                    <span className="sk-typewriter-cursor" aria-hidden>
                      |
                    </span>
                  </div>
                ) : null}

                {introTypewriter.complete &&
                messages.length === 0 &&
                !isThinking ? (
                  <div className="flex flex-col gap-2 pt-1.5">
                    <span className="sk-help-prompts-label">
                      {t("help.browseTools")}
                    </span>
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="sk-help-prompt"
                        onClick={() => void respondToUser(prompt)}
                      >
                        <span>{prompt}</span>
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                ) : null}

              </>
            ) : null}

            {messages.map((message) =>
              message.role === "user" ? (
                <div
                  key={message.id}
                  className="sk-help-bubble sk-help-bubble--me"
                >
                  {message.content}
                </div>
              ) : (
                <div
                  key={message.id}
                  className="sk-help-bubble sk-help-bubble--bot"
                >
                  {message.content}
                </div>
              ),
            )}

            {isThinking ? (
              <div
                className="sk-help-typing"
                aria-label={t("copilot.analyzing")}
                role="status"
              >
                <span className="sk-typing-dot" />
                <span className="sk-typing-dot" />
                <span className="sk-typing-dot" />
              </div>
            ) : null}
          </div>

          <form
            className="sk-help-chat__form relative"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {slashMenu}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={t("help.chatPlaceholder")}
              aria-label={t("help.chatPlaceholder")}
              disabled={isThinking}
              className="sk-plain-field"
            />
            <button
              type="submit"
              className="sk-help-chat__send"
              aria-label={t("copilot.send")}
              disabled={isThinking || (!input.trim() && !slashMenuOpen)}
            >
              <ArrowUp className="h-[15px] w-[15px]" strokeWidth={2.4} />
            </button>
          </form>
        </section>
      );
    }

    const composer = (
      <div className="sk-support-chat__composer relative">
        {slashMenu}
        <div
          className={cn(
            "sk-support-chat__input-row",
            isTeaser && "sk-support-ask",
          )}
        >
          {isTeaser ? (
            <Search
              className="sk-support-chat__search-icon"
              aria-hidden
              strokeWidth={2}
            />
          ) : null}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={
              isTeaser ? t("help.chatPlaceholder") : t("copilot.placeholder")
            }
            className="sk-plain-field h-11 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={isThinking}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isThinking || (!input.trim() && !slashMenuOpen)}
            className="sk-support-chat__send"
            aria-label={t("copilot.send")}
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
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
                onClick={onCollapse}
                className="h-9 w-9 shrink-0 rounded-xl p-0 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-ink)]"
                aria-label={t("help.chatClose")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="sk-support-chat__avatar" aria-hidden>
              <SklyvoMark size={28} interactive={false} />
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
