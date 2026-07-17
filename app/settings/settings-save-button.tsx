"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSettingsSaveRegistry } from "@/app/settings/ai-behavior-settings-form";

export function SettingsSaveButton() {
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
          toast.success("Nastavení projektu bylo úspěšně uloženo.");
        }
      } else {
        toast.error("Nepodařilo se uložit nastavení. Zkuste obnovit stránku.");
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
      className="h-12 rounded-xl border-0 bg-blue-600 px-8 font-bold text-white shadow-md transition-all duration-200 hover:bg-blue-700 disabled:opacity-100"
    >
      {isSaving ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Ukládám...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4 shrink-0" aria-hidden />
          Uložit nastavení projektu
        </>
      )}
    </Button>
  );
}
