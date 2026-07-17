"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AutopilotSettingsSection } from "@/components/autopilot-settings-dialog";
import {
  DEFAULT_AUTOPILOT_SETTINGS,
  type AutopilotAutomationSettings,
} from "@/lib/autopilot-settings";
import { getRadarSettings, saveRadarSettings } from "@/app/actions/radar-settings";
import {
  FULL_AUTO_SETTINGS_STORAGE_KEY,
  SNIPER_SETTINGS_STORAGE_KEY,
} from "@/components/autopilot/shared";

export function useAutopilotSettings(section: AutopilotSettingsSection) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [automationSettings, setAutomationSettings] =
    useState<AutopilotAutomationSettings>(DEFAULT_AUTOPILOT_SETTINGS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sniperRaw = window.localStorage.getItem(SNIPER_SETTINGS_STORAGE_KEY);
      const fullAutoRaw = window.localStorage.getItem(FULL_AUTO_SETTINGS_STORAGE_KEY);
      const sniperParsed = sniperRaw
        ? (JSON.parse(sniperRaw) as Partial<AutopilotAutomationSettings>)
        : {};
      const fullAutoParsed = fullAutoRaw
        ? (JSON.parse(fullAutoRaw) as Partial<AutopilotAutomationSettings>)
        : {};

      setAutomationSettings((prev) => ({
        ...DEFAULT_AUTOPILOT_SETTINGS,
        ...prev,
        ...sniperParsed,
        ...fullAutoParsed,
        sendingStrategy:
          sniperParsed.sendingStrategy ??
          prev.sendingStrategy ??
          DEFAULT_AUTOPILOT_SETTINGS.sendingStrategy,
      }));
    } catch {
      /* ignore corrupt local storage */
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen || section !== "radar") return;

    let cancelled = false;
    void (async () => {
      setSettingsLoading(true);
      const result = await getRadarSettings();
      if (!cancelled && "settings" in result) {
        setAutomationSettings((prev) => ({
          ...prev,
          targetIndustries: result.settings.targetIndustries,
          locations: result.settings.locations,
          companySize: result.settings.companySize,
          autoStartOutreach: result.settings.autoStartOutreach,
          radarDays: result.settings.radarDays,
          radarRunTime: result.settings.radarRunTime,
          maxCompaniesPerRun: result.settings.maxCompaniesPerRun,
        }));
      }
      if (!cancelled) setSettingsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [settingsOpen, section]);

  const handleSaveAutomationSettings = async () => {
    setIsSavingSettings(true);
    try {
      if (section === "radar") {
        const result = await saveRadarSettings({
          targetIndustries: automationSettings.targetIndustries,
          locations: automationSettings.locations,
          companySize: automationSettings.companySize,
          autoStartOutreach: automationSettings.autoStartOutreach,
          radarDays: automationSettings.radarDays,
          radarRunTime: automationSettings.radarRunTime,
          maxCompaniesPerRun: automationSettings.maxCompaniesPerRun,
        });

        if ("error" in result) {
          toast.error(result.error);
          return;
        }

        toast.success(
          "Pravidla Radaru jsou aktivní. Projeví se při příštím automatickém sběru.",
        );
        setSettingsOpen(false);
        return;
      }

      if (section === "sniper") {
        const payload = {
          window1Start: automationSettings.window1Start,
          window1End: automationSettings.window1End,
          window2Start: automationSettings.window2Start,
          window2End: automationSettings.window2End,
          maxEmailsPerBatch: automationSettings.maxEmailsPerBatch,
          sendingStrategy: automationSettings.sendingStrategy,
        };
        window.localStorage.setItem(SNIPER_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
        toast.success("Nastavení odesílání je aktivní pro další kampaň.");
        setSettingsOpen(false);
        return;
      }

      const payload = {
        fullAutoFrequency: automationSettings.fullAutoFrequency,
        fullAutoRunTime: automationSettings.fullAutoRunTime,
      };
      window.localStorage.setItem(FULL_AUTO_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
      toast.success("Nastavení Full Auto je uloženo pro budoucí spuštění.");
      setSettingsOpen(false);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return {
    settingsOpen,
    setSettingsOpen,
    settingsLoading,
    isSavingSettings,
    automationSettings,
    setAutomationSettings,
    openSettings: () => setSettingsOpen(true),
    handleSaveAutomationSettings,
  };
}
