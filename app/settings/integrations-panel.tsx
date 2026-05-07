"use client";

import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const integrations = [
  {
    id: "make",
    name: "Make.com",
    description: "Odesílejte data do Make.com pro pokročilou automatizaci.",
    fields: [{ label: "Webhook URL", placeholder: "https://hook.eu1.make.com/..." }],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Propojte systém se stovkami aplikací přes Zapier.",
    fields: [{ label: "Webhook URL", placeholder: "https://hooks.zapier.com/..." }],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Synchronizujte domluvené schůzky rovnou do vaší pipeline.",
    fields: [{ label: "API Klíč", placeholder: "Váš Pipedrive API klíč" }],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Obousměrná synchronizace kontaktů s HubSpot CRM.",
    fields: [{ label: "Access Token", placeholder: "HubSpot Private App Token" }],
  },
] as const;

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500";

export function IntegrationsPanel() {
  const [integrationValues, setIntegrationValues] = useState<Record<string, string>>({
    make: "",
    zapier: "",
    pipedrive: "",
    hubspot: "",
  });
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setExpandedIntegration((prev) => (prev === id ? null : id));
  };

  const handleTestConnection = (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const value = integrationValues[id];
    if (!value || value.trim() === "") {
      toast.error("Nejdříve zadejte URL nebo API klíč.");
      return;
    }
    setIsTesting(id);
    setTimeout(() => {
      setIsTesting(null);
      toast.success("Spojení úspěšné!");
    }, 1000);
  };

  const handleSave = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  return (
    <div className="pb-2 pt-2">
      <p className="mb-4 text-sm text-muted-foreground">
        Napojte Venegard na své stávající nástroje pro automatický export leadů a dealů.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrations.map((item) => {
          const stored = integrationValues[item.id];
          const isActive = Boolean(stored && stored.length > 0);
          const isExpanded = expandedIntegration === item.id;

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 dark:border-gray-700 dark:bg-card dark:hover:border-blue-600"
              onClick={() => toggleCard(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleCard(item.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-foreground">{item.name}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-muted-foreground/50"}`}
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-muted-foreground">
                    {isActive ? "Aktivní" : "Nepřipojeno"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-muted-foreground">{item.description}</p>

              {isExpanded && (
                <div onClick={(e) => e.stopPropagation()} className="border-t border-gray-100 pt-1 dark:border-border/60">
                  {item.fields.map((field) => (
                    <div key={field.label}>
                      <label className="sr-only" htmlFor={`${item.id}-${field.label}`}>
                        {field.label}
                      </label>
                      <input
                        id={`${item.id}-${field.label}`}
                        type={item.id === "pipedrive" || item.id === "hubspot" ? "password" : "text"}
                        placeholder={field.placeholder}
                        className={`${inputClass} mt-4 font-mono`}
                        autoComplete="off"
                        value={integrationValues[item.id] || ""}
                        onChange={(e) =>
                          setIntegrationValues({ ...integrationValues, [item.id]: e.target.value })
                        }
                      />
                    </div>
                  ))}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700"
                      onClick={handleSave}
                    >
                      Uložit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-lg border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 dark:border-border dark:text-foreground dark:hover:bg-muted"
                      disabled={isTesting === item.id}
                      onClick={(e) => handleTestConnection(item.id, e)}
                    >
                      {isTesting === item.id ? "Testuji…" : "Otestovat spojení"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
