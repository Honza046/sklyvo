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
    <div className={cn("sk-company-services", compact && "sk-company-services--compact")}>
      {!compact ? (
        <div className="sk-company-services__intro">
          <p className="sk-company-field-label">{t("settings.servicesBasic")}</p>
          <p className="sk-company-field-hint">{t("settings.servicesBasicHint")}</p>
        </div>
      ) : null}

      <div className="sk-company-service-groups">
        {PREDEFINED_SERVICE_GROUPS.map((group) => (
          <div key={group.id} className="sk-company-service-group">
            <p className="sk-company-group-label">{tServiceGroup(t, group.id)}</p>
            <div className="sk-company-chips">
              {group.services.map((service) => {
                const selected = services.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    aria-pressed={selected}
                    className={cn(
                      "sk-company-chip",
                      selected && "sk-company-chip--selected",
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

      {!compact && services.length > 0 ? (
        <p className="sk-company-field-hint sk-company-services__count">
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
    <div className="sk-company-field-wrap sk-company-field-wrap--detail">
      <Label htmlFor="company-services" className="sk-company-field-label">
        {t("settings.servicesDetail")}
      </Label>
      <Textarea
        id="company-services"
        value={companyServices}
        onChange={(e) => setCompanyServices(e.target.value)}
        placeholder={t("settings.servicesDetailPlaceholder")}
        className={cn(
          "sk-company-field resize-none",
          compact ? "sk-company-field--detail" : "min-h-[220px] resize-y",
        )}
      />
      {!compact ? (
        <p className="sk-company-field-hint">{t("settings.servicesDetailHint")}</p>
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
