"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CopilotContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openWithPrompt: (prompt: string) => void;
  pendingPrompt: string | null;
  consumePendingPrompt: () => string | null;
};

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const openWithPrompt = useCallback((prompt: string) => {
    setPendingPrompt(prompt.trim());
    setOpen(true);
  }, []);

  const consumePendingPrompt = useCallback(() => {
    const value = pendingPrompt;
    setPendingPrompt(null);
    return value;
  }, [pendingPrompt]);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      openWithPrompt,
      pendingPrompt,
      consumePendingPrompt,
    }),
    [open, openWithPrompt, pendingPrompt, consumePendingPrompt],
  );

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error("useCopilot must be used within CopilotProvider");
  }
  return context;
}
