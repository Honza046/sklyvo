"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateAiBehaviorSettings } from "@/app/actions/workspace";
import { DEFAULT_SNIPER_SYSTEM_PROMPT } from "@/lib/ai-behavior-settings";

export { DEFAULT_SNIPER_SYSTEM_PROMPT };

type AiBehaviorSettingsFormProps = {
  initialEmailSignature: string;
  initialSystemPrompt: string;
  initialForbiddenWords: string;
};

type SettingsSaveRegistry = {
  registerSaveHandler: (key: string, handler: () => Promise<boolean>) => () => void;
  handlersRef: Map<string, () => Promise<boolean>>;
};

const SettingsSaveContext = createContext<SettingsSaveRegistry | null>(null);

export function SettingsSaveProvider({ children }: { children: ReactNode }) {
  const handlersRef = useMemo(() => new Map<string, () => Promise<boolean>>(), []);

  const registerSaveHandler = useCallback(
    (key: string, handler: () => Promise<boolean>) => {
      handlersRef.set(key, handler);
      return () => {
        handlersRef.delete(key);
      };
    },
    [handlersRef],
  );

  const value = useMemo(() => ({ registerSaveHandler, handlersRef }), [registerSaveHandler, handlersRef]);

  return <SettingsSaveContext.Provider value={value}>{children}</SettingsSaveContext.Provider>;
}

export function useSettingsSaveRegistry() {
  return useContext(SettingsSaveContext);
}

export function AiBehaviorSettingsForm({
  initialEmailSignature,
  initialSystemPrompt,
  initialForbiddenWords,
}: AiBehaviorSettingsFormProps) {
  const router = useRouter();
  const registry = useSettingsSaveRegistry();
  const [emailSignature, setEmailSignature] = useState(initialEmailSignature);
  const [systemPrompt, setSystemPrompt] = useState(
    initialSystemPrompt || DEFAULT_SNIPER_SYSTEM_PROMPT,
  );
  const [forbiddenWords, setForbiddenWords] = useState(initialForbiddenWords);

  const saveSettings = useCallback(async () => {
    const result = await updateAiBehaviorSettings({
      emailSignature,
      systemPrompt,
      forbiddenWords,
    });

    if ("error" in result && result.error) {
      toast.error(result.error);
      return false;
    }

    router.refresh();
    return true;
  }, [emailSignature, forbiddenWords, router, systemPrompt]);

  useEffect(() => {
    if (!registry) return;
    return registry.registerSaveHandler("ai-behavior", saveSettings);
  }, [registry, saveSettings]);

  useEffect(() => {
    setEmailSignature(initialEmailSignature);
    setSystemPrompt(initialSystemPrompt || DEFAULT_SNIPER_SYSTEM_PROMPT);
    setForbiddenWords(initialForbiddenWords);
  }, [initialEmailSignature, initialForbiddenWords, initialSystemPrompt]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="email-signature"
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          Podpis na konci zprávy (Sniper)
        </Label>
        <Textarea
          id="email-signature"
          value={emailSignature}
          onChange={(e) => setEmailSignature(e.target.value)}
          placeholder={"S úctou,\nJan Novák\nVenegard s.r.o."}
          className="min-h-[100px] resize-none rounded-lg border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 dark:border-border/60 dark:bg-background dark:text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="forbidden-words"
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          Zakázaná slova a fráze (blacklist)
        </Label>
        <Textarea
          id="forbidden-words"
          rows={2}
          value={forbiddenWords}
          onChange={(e) => setForbiddenWords(e.target.value)}
          placeholder="např. synergie, namontujeme, -"
          className="w-full resize-y rounded-lg border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 dark:border-border/60 dark:bg-background dark:text-foreground"
        />
        <p className="mt-1 text-[10px] text-gray-500 dark:text-muted-foreground">
          Tato slova AI nikdy nepoužije. Oddělujte čárkou (např. synergie, inovativní, zaručeně).
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="system-prompt"
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          Základní instrukce (System Prompt)
        </Label>
        <Textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="min-h-[150px] w-full resize-y rounded-lg border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 dark:border-border/60 dark:bg-background dark:text-foreground"
        />
        <p className="text-[10px] text-muted-foreground">
          Tato instrukce ovlivňuje, jakým stylem Sniper generuje e-maily.
        </p>
      </div>
    </div>
  );
}
