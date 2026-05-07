"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PREDEFINED_SERVICES } from "@/lib/constants";
import { updateOfferedServices } from "@/app/actions/workspace";
import { cn } from "@/lib/utils";

const PREDEFINED_SET = new Set<string>([...PREDEFINED_SERVICES]);

function isPredefinedService(name: string) {
  return PREDEFINED_SET.has(name);
}

export function OfferedServicesManager({ initialServices }: { initialServices: string[] }) {
  const [services, setServices] = useState<string[]>(initialServices);
  const [newService, setNewService] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const persist = async (nextServices: string[]) => {
    setIsSaving(true);
    const result = await updateOfferedServices(nextServices);
    setIsSaving(false);
    if ("error" in result && result.error) return false;
    setServices(nextServices);
    return true;
  };

  const handleTogglePredefined = async (service: (typeof PREDEFINED_SERVICES)[number]) => {
    if (isSaving) return;
    const exists = services.includes(service);
    const nextServices = exists
      ? services.filter((item) => item !== service)
      : [...services, service];
    await persist(nextServices);
  };

  const handleAddCustom = async () => {
    const name = newService.trim();
    if (!name || isSaving) return;
    if (services.includes(name)) {
      setNewService("");
      return;
    }

    const ok = await persist([...services, name]);
    if (ok) setNewService("");
  };

  const handleRemove = async (serviceName: string) => {
    if (isSaving) return;
    await persist(services.filter((item) => item !== serviceName));
  };

  const customServices = services.filter((s) => !isPredefinedService(s));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Předdefinované služby
        </p>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_SERVICES.map((service) => {
            const selected = services.includes(service);
            return (
              <button
                key={service}
                type="button"
                disabled={isSaving}
                onClick={() => void handleTogglePredefined(service)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60",
                  selected
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-border/60 bg-background text-muted-foreground hover:border-blue-200 hover:text-foreground",
                )}
              >
                {service}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Vlastní služby
        </p>
        {customServices.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customServices.map((service) => (
              <span
                key={service}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {service}
                <button
                  type="button"
                  disabled={isSaving}
                  className="rounded-full p-0.5 hover:bg-blue-100 disabled:opacity-50 dark:hover:bg-blue-800/70"
                  onClick={() => void handleRemove(service)}
                  aria-label={`Smazat službu ${service}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Žádné vlastní služby. Přidejte je níže.</p>
        )}

        <div className="flex gap-2 pt-1">
          <Input
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAddCustom();
              }
            }}
            placeholder="Např. Branding, E-mail marketing..."
            className="h-11 rounded-xl"
            disabled={isSaving}
          />
          <Button
            type="button"
            onClick={() => void handleAddCustom()}
            disabled={isSaving || !newService.trim()}
            className="h-11 shrink-0 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700"
          >
            {isSaving ? "Ukládám..." : "Přidat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
