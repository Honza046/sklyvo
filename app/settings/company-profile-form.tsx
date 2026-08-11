"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanyContext } from "@/app/actions/workspace";
import { useSettingsSaveRegistry } from "@/app/settings/ai-behavior-settings-form";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

type CompanyProfileFormProps = {
  initialContext: string;
};

export function CompanyProfileForm({
  initialContext,
}: CompanyProfileFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const registry = useSettingsSaveRegistry();
  const [companyContext, setCompanyContext] = useState(initialContext);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const result = await updateCompanyContext(companyContext);
    setIsSaving(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return false;
    }

    router.refresh();
    return true;
  }, [companyContext, router]);

  useEffect(() => {
    if (!registry) return;
    return registry.registerSaveHandler("company-profile", handleSave);
  }, [registry, handleSave]);

  useEffect(() => {
    setCompanyContext(initialContext);
  }, [initialContext]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="company-context"
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          {t("settings.companyProfileLabel")}
        </Label>
        <Textarea
          id="company-context"
          value={companyContext}
          onChange={(e) => setCompanyContext(e.target.value)}
          disabled={isSaving}
          placeholder={t("settings.companyProfilePlaceholder")}
          className="min-h-[180px] resize-y rounded-xl border-border/60 bg-background text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {t("settings.companyProfileHint")}
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="h-10 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("settings.saving")}
            </>
          ) : (
            t("settings.saveCompanyProfile")
          )}
        </Button>
      </div>
    </div>
  );
}
