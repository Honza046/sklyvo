"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettingsSaveRegistry } from "@/app/settings/ai-behavior-settings-form";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function SettingsSaveButton({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const registry = useSettingsSaveRegistry();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (registry && registry.handlersRef.size > 0) {
        const results = await Promise.all(
          Array.from(registry.handlersRef.values()).map((handler) => handler()),
        );
        if (results.every(Boolean)) {
          toast.success(t("settings.saveSuccess"));
        }
      } else {
        toast.error(t("settings.saveError"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSaving}
      onClick={() => void handleSave()}
      className={cn(
        "rounded-xl border-0 bg-blue-600 font-bold text-white shadow-md transition-all duration-200 hover:bg-blue-700 disabled:opacity-100",
        compact
          ? "h-9 px-4 text-xs"
          : "h-12 px-8",
      )}
    >
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
          {t("settings.saving")}
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          {t("settings.saveProject")}
        </>
      )}
    </Button>
  );
}
