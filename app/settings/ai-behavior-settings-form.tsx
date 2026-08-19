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
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export { DEFAULT_SNIPER_SYSTEM_PROMPT };

type AiBehaviorSettingsFormProps = {
  initialEmailSignature: string;
  senderFullName?: string;
  senderEmail?: string;
  initialSystemPrompt: string;
  initialForbiddenWords: string;
  compact?: boolean;
};

type SettingsSaveRegistry = {
  registerSaveHandler: (
    key: string,
    handler: () => Promise<boolean>,
  ) => () => void;
  handlersRef: Map<string, () => Promise<boolean>>;
};

type AiBehaviorContextValue = {
  emailSignature: string;
  setEmailSignature: (value: string) => void;
  forbiddenWords: string;
  setForbiddenWords: (value: string) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  signaturePlaceholder: string;
};

const SettingsSaveContext = createContext<SettingsSaveRegistry | null>(null);
const AiBehaviorContext = createContext<AiBehaviorContextValue | null>(null);

export function SettingsSaveProvider({ children }: { children: ReactNode }) {
  const handlersRef = useMemo(
    () => new Map<string, () => Promise<boolean>>(),
    [],
  );

  const registerSaveHandler = useCallback(
    (key: string, handler: () => Promise<boolean>) => {
      handlersRef.set(key, handler);
      return () => {
        handlersRef.delete(key);
      };
    },
    [handlersRef],
  );

  const value = useMemo(
    () => ({ registerSaveHandler, handlersRef }),
    [registerSaveHandler, handlersRef],
  );

  return (
    <SettingsSaveContext.Provider value={value}>
      {children}
    </SettingsSaveContext.Provider>
  );
}

export function useSettingsSaveRegistry() {
  return useContext(SettingsSaveContext);
}

function useAiBehavior() {
  const ctx = useContext(AiBehaviorContext);
  if (!ctx) {
    throw new Error("AI behavior components must be used within AiBehaviorSettingsProvider");
  }
  return ctx;
}

type AiBehaviorSettingsProviderProps = {
  initialEmailSignature: string;
  senderFullName?: string;
  senderEmail?: string;
  initialSystemPrompt: string;
  initialForbiddenWords: string;
  children: ReactNode;
};

export function AiBehaviorSettingsProvider({
  initialEmailSignature,
  senderFullName,
  senderEmail = "you@example.com",
  initialSystemPrompt,
  initialForbiddenWords,
  children,
}: AiBehaviorSettingsProviderProps) {
  const { t } = useLanguage();
  const resolvedName = senderFullName?.trim() || t("settings.aiSenderFallback");
  const router = useRouter();
  const registry = useSettingsSaveRegistry();
  const [emailSignature, setEmailSignature] = useState(initialEmailSignature);
  const [systemPrompt, setSystemPrompt] = useState(
    initialSystemPrompt || DEFAULT_SNIPER_SYSTEM_PROMPT,
  );
  const [forbiddenWords, setForbiddenWords] = useState(initialForbiddenWords);
  const signaturePlaceholder = `Best regards,\n\n${resolvedName}\n\nvenegard.com\n+420 605 875 808\n${senderEmail}`;

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

  const value = useMemo(
    () => ({
      emailSignature,
      setEmailSignature,
      forbiddenWords,
      setForbiddenWords,
      systemPrompt,
      setSystemPrompt,
      signaturePlaceholder,
    }),
    [
      emailSignature,
      forbiddenWords,
      signaturePlaceholder,
      systemPrompt,
    ],
  );

  return (
    <AiBehaviorContext.Provider value={value}>
      {children}
    </AiBehaviorContext.Provider>
  );
}

export function EmailSignatureField({ matej = false }: { matej?: boolean }) {
  const { t } = useLanguage();
  const { emailSignature, setEmailSignature, signaturePlaceholder } = useAiBehavior();

  return (
    <div className={cn("sk-outreach-field-wrap", matej && "sk-outreach-field-wrap--signature")}>
      <Label htmlFor="email-signature" className="sk-outreach-field-label">
        {t("settings.emailIntegration.signatureLabel")}
      </Label>
      <Textarea
        id="email-signature"
        value={emailSignature}
        onChange={(e) => setEmailSignature(e.target.value)}
        placeholder={signaturePlaceholder}
        aria-label={t("settings.emailIntegration.signatureLabel")}
        className={cn(
          "sk-outreach-field resize-none",
          matej ? "sk-outreach-field--signature" : "min-h-[4.5rem]",
        )}
      />
      {!matej ? (
        <p className="sk-outreach-field-hint">{t("settings.aiSignatureHint")}</p>
      ) : null}
    </div>
  );
}

export function AiBehaviorMatejPanel() {
  return <AiBehaviorSettingsFormBody matej />;
}

export function AiBehaviorSettingsForm({
  initialEmailSignature,
  senderFullName,
  senderEmail,
  initialSystemPrompt,
  initialForbiddenWords,
  compact = false,
}: AiBehaviorSettingsFormProps) {
  return (
    <AiBehaviorSettingsProvider
      initialEmailSignature={initialEmailSignature}
      senderFullName={senderFullName}
      senderEmail={senderEmail}
      initialSystemPrompt={initialSystemPrompt}
      initialForbiddenWords={initialForbiddenWords}
    >
      <AiBehaviorSettingsFormBody compact={compact} />
    </AiBehaviorSettingsProvider>
  );
}

function AiBehaviorSettingsFormBody({
  compact = false,
  matej = false,
}: {
  compact?: boolean;
  matej?: boolean;
}) {
  const { t } = useLanguage();
  const {
    forbiddenWords,
    setForbiddenWords,
    systemPrompt,
    setSystemPrompt,
  } = useAiBehavior();

  if (matej) {
    return (
      <div className="sk-outreach-ai">
        <div className="sk-outreach-field-wrap">
          <Label htmlFor="forbidden-words" className="sk-outreach-field-label">
            {t("settings.aiForbidden")}
          </Label>
          <Textarea
            id="forbidden-words"
            value={forbiddenWords}
            onChange={(e) => setForbiddenWords(e.target.value)}
            placeholder={t("settings.aiForbiddenPlaceholder")}
            className="sk-outreach-field sk-outreach-field--input resize-none"
          />
        </div>
        <div className="sk-outreach-field-wrap sk-outreach-field-wrap--grow">
          <Label htmlFor="system-prompt" className="sk-outreach-field-label">
            {t("settings.aiSystemPrompt")}
          </Label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="sk-outreach-field sk-outreach-field--grow resize-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        compact
          ? "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5"
          : "space-y-5",
      )}
    >
      <div className="grid shrink-0 grid-cols-2 items-stretch gap-2.5">
        <EmailSignatureField />
        <div className="flex min-h-0 flex-col gap-1">
          <Label
            htmlFor="forbidden-words"
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {t("settings.aiForbidden")}
          </Label>
          <Textarea
            id="forbidden-words"
            rows={3}
            value={forbiddenWords}
            onChange={(e) => setForbiddenWords(e.target.value)}
            placeholder={t("settings.aiForbiddenPlaceholder")}
            className="sk-settings-field min-h-[4.5rem] flex-1 resize-none text-sm"
          />
          {!compact ? (
            <p className="mt-1 text-[10px] text-gray-500 ">
              {t("settings.aiForbiddenHint")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-col space-y-1">
        <Label
          htmlFor="system-prompt"
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          {t("settings.aiSystemPrompt")}
        </Label>
        <Textarea
          id="system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className={cn(
            "sk-settings-field w-full resize-none text-sm",
            compact ? "min-h-0 flex-1" : "min-h-[150px] resize-y",
          )}
        />
        {!compact ? (
          <p className="text-[10px] text-muted-foreground">
            {t("settings.aiSystemPromptHint")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
