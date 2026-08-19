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
    <div
      className={cn(
        "sk-company-field-wrap",
        compact && "sk-company-field-wrap--profile",
      )}
    >
      {!compact ? (
        <Label
          htmlFor="company-context"
          className="sk-company-field-label"
        >
          {t("settings.companyProfileLabel")}
        </Label>
      ) : null}
      <Textarea
        id="company-context"
        value={companyContext}
        onChange={(e) => setCompanyContext(e.target.value)}
        placeholder={t("settings.companyProfilePlaceholder")}
        aria-label={t("settings.companyProfile")}
        className={cn(
          "sk-company-field resize-none",
          compact ? "sk-company-field--grow" : "min-h-[180px] resize-y",
        )}
      />
      {!compact ? (
        <p className="sk-company-field-hint">
          {t("settings.companyProfileHint")}
        </p>
      ) : null}
    </div>
  );
}
