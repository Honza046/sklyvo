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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PREDEFINED_SERVICE_GROUPS } from "@/lib/constants";
import { tService, tServiceGroup } from "@/lib/i18n/service-catalog";
import { updateWorkspaceServicesSettings } from "@/app/actions/workspace";
import { useSettingsSaveRegistry } from "@/app/settings/ai-behavior-settings-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

type CompanyServicesContextValue = {
  services: string[];
  toggleService: (service: string) => void;
  companyServices: string;
  setCompanyServices: (value: string) => void;
};

const CompanyServicesContext =
  createContext<CompanyServicesContextValue | null>(null);

function useCompanyServices() {
  const ctx = useContext(CompanyServicesContext);
  if (!ctx) {
    throw new Error("CompanyServices components must be used within provider");
  }
  return ctx;
}

type CompanyServicesProviderProps = {
  initialServices: string[];
  initialCompanyServices: string;
  children: ReactNode;
};

export function CompanyServicesProvider({
  initialServices,
  initialCompanyServices,
  children,
}: CompanyServicesProviderProps) {
  const router = useRouter();
  const registry = useSettingsSaveRegistry();
  const [services, setServices] = useState(initialServices);
  const [companyServices, setCompanyServices] = useState(
    initialCompanyServices,
  );

  const toggleService = useCallback((service: string) => {
    setServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service],
    );
  }, []);

  const handleSave = useCallback(async () => {
    const result = await updateWorkspaceServicesSettings({
      offeredServices: services,
      companyServices,
    });

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

  const value = useMemo(
    () => ({
      services,
      toggleService,
      companyServices,
      setCompanyServices,
    }),
    [companyServices, services, toggleService],
  );

  return (
    <CompanyServicesContext.Provider value={value}>
      {children}
    </CompanyServicesContext.Provider>
  );
}

export function OfferedServicesPicker({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  const { services, toggleService } = useCompanyServices();

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        compact ? "h-full" : "space-y-4",
      )}
    >
      <div className={cn(compact ? "min-h-0 flex-1 overflow-y-auto pr-1" : "")}>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("settings.servicesBasic")}
          </p>
          {!compact ? (
            <p className="text-xs text-muted-foreground">
              {t("settings.servicesBasicHint")}
            </p>
          ) : null}
        </div>

        <div className={cn(compact ? "space-y-3 pt-1" : "space-y-5")}>
          {PREDEFINED_SERVICE_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <p className="text-[10px] font-semibold text-foreground/80 sm:text-[11px]">
                {tServiceGroup(t, group.id)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.services.map((service) => {
                  const selected = services.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-snug transition-all sm:px-3 sm:py-1.5 sm:text-xs",
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
          <p className="pt-2 text-[10px] text-muted-foreground sm:text-xs">
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
    </div>
  );
}

export function CompanyServicesDetailForm({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const { companyServices, setCompanyServices } = useCompanyServices();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
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
        placeholder={t("settings.servicesDetailPlaceholder")}
        className={cn(
          "sk-settings-field resize-none text-sm",
          compact ? "min-h-0 flex-1" : "min-h-[220px] resize-y",
        )}
      />
      {!compact ? (
        <p className="text-xs text-muted-foreground">
          {t("settings.servicesDetailHint")}
        </p>
      ) : null}
    </div>
  );
}

/* Backward-compatible wrapper for pages that still need the combined form. */
export function OfferedServicesManager({
  initialServices,
  initialCompanyServices,
  compact = false,
}: {
  initialServices: string[];
  initialCompanyServices: string;
  compact?: boolean;
}) {
  return (
    <CompanyServicesProvider
      initialServices={initialServices}
      initialCompanyServices={initialCompanyServices}
    >
      <div
        className={cn(
          "flex min-h-0 flex-col",
          compact ? "h-full gap-3" : "space-y-6",
        )}
      >
        <OfferedServicesPicker compact={compact} />
        <CompanyServicesDetailForm compact={compact} />
      </div>
    </CompanyServicesProvider>
  );
}
