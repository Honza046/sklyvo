"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PREDEFINED_SERVICE_GROUPS } from "@/lib/constants";
import { tService, tServiceGroup } from "@/lib/i18n/service-catalog";
import { updateWorkspaceServicesSettings } from "@/app/actions/workspace";
import { useSettingsSaveRegistry } from "@/app/settings/ai-behavior-settings-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

type OfferedServicesManagerProps = {
  initialServices: string[];
  initialCompanyServices: string;
};

export function OfferedServicesManager({
  initialServices,
  initialCompanyServices,
}: OfferedServicesManagerProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const registry = useSettingsSaveRegistry();
  const [services, setServices] = useState<string[]>(initialServices);
  const [companyServices, setCompanyServices] = useState(
    initialCompanyServices,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleService = (service: string) => {
    if (isSaving) return;
    setServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service],
    );
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const result = await updateWorkspaceServicesSettings({
      offeredServices: services,
      companyServices,
    });
    setIsSaving(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return false;
    }

    router.refresh();
    return true;
  }, [companyServices, router, services]);

  useEffect(() => {
    if (!registry) return;
    return registry.registerSaveHandler("offered-services", handleSave);
  }, [registry, handleSave]);

  useEffect(() => {
    setServices(initialServices);
    setCompanyServices(initialCompanyServices);
  }, [initialCompanyServices, initialServices]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("settings.servicesBasic")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("settings.servicesBasicHint")}
          </p>
        </div>

        <div className="space-y-5">
          {PREDEFINED_SERVICE_GROUPS.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-[11px] font-semibold text-foreground/80">
                {tServiceGroup(t, group.id)}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.services.map((service) => {
                  const selected = services.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleToggleService(service)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold leading-snug transition-all disabled:opacity-60",
                        selected
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-border/60 bg-background text-muted-foreground hover:border-blue-200 hover:text-foreground",
                      )}
                    >
                      {tService(t, service)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {services.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {t(
              services.length === 1
                ? "settings.servicesSelectedOne"
                : services.length >= 2 && services.length <= 4
                  ? "settings.servicesSelectedFew"
                  : "settings.servicesSelectedMany",
              { count: services.length },
            )}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="company-services"
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          {t("settings.servicesDetail")}
        </Label>
        <Textarea
          id="company-services"
          value={companyServices}
          onChange={(e) => setCompanyServices(e.target.value)}
          disabled={isSaving}
          placeholder={t("settings.servicesDetailPlaceholder")}
          className="min-h-[220px] resize-y rounded-xl border-border/60 bg-background text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {t("settings.servicesDetailHint")}
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
            t("settings.saveServices")
          )}
        </Button>
      </div>
    </div>
  );
}
