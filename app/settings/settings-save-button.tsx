"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SettingsSaveButton() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Nastavení bylo úspěšně uloženo.");
    }, 1000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSaving}
      onClick={handleSave}
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
