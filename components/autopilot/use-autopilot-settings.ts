"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AutopilotSettingsSection } from "@/components/autopilot-settings-dialog";
import {
  DEFAULT_AUTOPILOT_SETTINGS,
  type AutopilotAutomationSettings,
} from "@/lib/autopilot-settings";
import { getRadarSettings, saveRadarSettings, getFullAutoSettings, saveFullAutoSettings } from "@/app/actions/radar-settings";
import {
  FULL_AUTO_SETTINGS_STORAGE_KEY,
  SNIPER_SETTINGS_STORAGE_KEY,
} from "@/components/autopilot/shared";

export function useAutopilotSettings(section: AutopilotSettingsSection) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [fullAutoEnabled, setFullAutoEnabledState] = useState(false);
  const [automationSettings, setAutomationSettings] =
    useState<AutopilotAutomationSettings>(DEFAULT_AUTOPILOT_SETTINGS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sniperRaw = window.localStorage.getItem(SNIPER_SETTINGS_STORAGE_KEY);
      const sniperParsed = sniperRaw
        ? (JSON.parse(sniperRaw) as Partial<AutopilotAutomationSettings>)
        : {};

      setAutomationSettings((prev) => ({
        ...DEFAULT_AUTOPILOT_SETTINGS,
        ...prev,
        ...sniperParsed,
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
    if (section !== "radar" && section !== "full-auto") return;
    if (section === "radar" && !settingsOpen) return;

    let cancelled = false;
    void (async () => {
      if (settingsOpen || section === "full-auto") setSettingsLoading(true);
      if (section === "radar") {
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
      } else {
        const result = await getFullAutoSettings();
        if (!cancelled && "settings" in result) {
          setFullAutoEnabledState(result.settings.enabled);
          setAutomationSettings((prev) => ({
            ...prev,
            fullAutoFrequency: result.settings.fullAutoFrequency,
            fullAutoRunTime: result.settings.fullAutoRunTime,
          }));
        }
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

      const result = await saveFullAutoSettings({
        enabled: fullAutoEnabled,
        fullAutoFrequency: automationSettings.fullAutoFrequency,
        fullAutoRunTime: automationSettings.fullAutoRunTime,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      try {
        window.localStorage.setItem(
          FULL_AUTO_SETTINGS_STORAGE_KEY,
          JSON.stringify({
            fullAutoFrequency: automationSettings.fullAutoFrequency,
            fullAutoRunTime: automationSettings.fullAutoRunTime,
          }),
        );
      } catch {
        /* ignore */
      }
      toast.success(
        fullAutoEnabled
          ? "Full Auto je aktivní — cron najde firmy a odešle maily."
          : "Nastavení Full Auto je uloženo (zatím vypnuté).",
      );
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
    fullAutoEnabled,
    setFullAutoEnabledState,
    openSettings: () => setSettingsOpen(true),
    handleSaveAutomationSettings,
  };
}
