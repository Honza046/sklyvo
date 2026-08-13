"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanyContext } from "@/app/actions/workspace";
import { useSettingsSaveRegistry } from "@/app/settings/ai-behavior-settings-form";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CompanyProfileFormProps = {
  initialContext: string;
  compact?: boolean;
};

export function CompanyProfileForm({
  initialContext,
  compact = false,
}: CompanyProfileFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const registry = useSettingsSaveRegistry();
  const [companyContext, setCompanyContext] = useState(initialContext);

  const handleSave = useCallback(async () => {
    const result = await updateCompanyContext(companyContext);

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
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
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
          placeholder={t("settings.companyProfilePlaceholder")}
          className={cn(
            "sk-settings-field resize-none text-sm",
            compact ? "min-h-0 flex-1" : "min-h-[180px] resize-y",
          )}
        />
        {!compact ? (
          <p className="text-xs text-muted-foreground">
            {t("settings.companyProfileHint")}
          </p>
        ) : null}
    </div>
  );
}
