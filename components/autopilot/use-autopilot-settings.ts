"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AutopilotSettingsSection } from "@/components/autopilot-settings-dialog";
import {
  DEFAULT_AUTOPILOT_SETTINGS,
  type AutopilotAutomationSettings,
} from "@/lib/autopilot-settings";
import {
  getRadarSettings,
  saveRadarSettings,
  getFullAutoSettings,
  saveFullAutoSettings,
  getAutopilotPowerFlags,
  setRadarCronEnabled,
  setEmailSendCronEnabled,
  setFullAutoEnabled,
} from "@/app/actions/radar-settings";
import {
  FULL_AUTO_SETTINGS_STORAGE_KEY,
  SNIPER_SETTINGS_STORAGE_KEY,
} from "@/components/autopilot/shared";

export function useAutopilotSettings(section: AutopilotSettingsSection) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTogglingPower, setIsTogglingPower] = useState(false);
  const [radarCronEnabled, setRadarCronEnabledState] = useState(true);
  const [emailSendCronEnabled, setEmailSendCronEnabledState] = useState(false);
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
        onlyWithEmail:
          typeof sniperParsed.onlyWithEmail === "boolean"
            ? sniperParsed.onlyWithEmail
            : (prev.onlyWithEmail ?? DEFAULT_AUTOPILOT_SETTINGS.onlyWithEmail),
        sendDays: (() => {
          const raw =
            Array.isArray(sniperParsed.sendDays) && sniperParsed.sendDays.length > 0
              ? sniperParsed.sendDays
              : (prev.sendDays ?? DEFAULT_AUTOPILOT_SETTINGS.sendDays);
          const weekdays = raw.filter((d) => d >= 1 && d <= 5);
          return weekdays.length > 0 ? weekdays : DEFAULT_AUTOPILOT_SETTINGS.sendDays;
        })(),
      }));
    } catch {
      /* ignore corrupt local storage */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const flags = await getAutopilotPowerFlags();
      if (cancelled || !("flags" in flags)) return;
      setRadarCronEnabledState(flags.flags.radarCronEnabled);
      setEmailSendCronEnabledState(flags.flags.emailSendCronEnabled);
      setFullAutoEnabledState(flags.flags.fullAutoEnabled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;

    let cancelled = false;
    void (async () => {
      setSettingsLoading(true);
      if (section === "radar") {
        const result = await getRadarSettings();
        if (!cancelled && "settings" in result) {
          setAutomationSettings((prev) => ({
            ...prev,
            targetIndustries: result.settings.targetIndustries,
            locations: result.settings.locations,
            countryCode: result.settings.countryCode || "CZ",
            companySize: result.settings.companySize,
            autoStartOutreach: result.settings.autoStartOutreach,
            radarDays: result.settings.radarDays,
            radarRunTime: result.settings.radarRunTime,
            minCompaniesPerRun: result.settings.minCompaniesPerRun,
            maxCompaniesPerRun: result.settings.maxCompaniesPerRun,
          }));
        }
      } else if (section === "full-auto") {
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

  const featureEnabled =
    section === "radar"
      ? radarCronEnabled
      : section === "sniper"
        ? emailSendCronEnabled
        : fullAutoEnabled;

  const setFeatureEnabledLocal = (enabled: boolean) => {
    if (section === "radar") setRadarCronEnabledState(enabled);
    else if (section === "sniper") setEmailSendCronEnabledState(enabled);
    else setFullAutoEnabledState(enabled);
  };

  const toggleFeaturePower = async (next?: boolean) => {
    const enabled = next ?? !featureEnabled;
    setIsTogglingPower(true);
    try {
      const result =
        section === "radar"
          ? await setRadarCronEnabled(enabled)
          : section === "sniper"
            ? await setEmailSendCronEnabled(enabled)
            : await setFullAutoEnabled(enabled);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setFeatureEnabledLocal(result.enabled);
      toast.success(
        result.enabled
          ? section === "radar"
            ? "Automatický sběr Radaru zapnutý."
            : section === "sniper"
              ? "Automatické odesílání zapnuté."
              : "Full Auto zapnuté."
          : section === "radar"
            ? "Automatický sběr Radaru vypnutý."
            : section === "sniper"
              ? "Automatické odesílání vypnuté."
              : "Full Auto vypnuté.",
      );
    } finally {
      setIsTogglingPower(false);
    }
  };

  const handleSaveAutomationSettings = async () => {
    setIsSavingSettings(true);
    try {
      if (section === "radar") {
        const [settingsResult, powerResult] = await Promise.all([
          saveRadarSettings({
            targetIndustries: automationSettings.targetIndustries,
            locations: automationSettings.locations,
            countryCode: automationSettings.countryCode,
            companySize: automationSettings.companySize,
            autoStartOutreach: automationSettings.autoStartOutreach,
            radarDays: automationSettings.radarDays,
            radarRunTime: automationSettings.radarRunTime,
            minCompaniesPerRun: automationSettings.minCompaniesPerRun,
            maxCompaniesPerRun: automationSettings.maxCompaniesPerRun,
          }),
          setRadarCronEnabled(radarCronEnabled),
        ]);

        if ("error" in settingsResult) {
          toast.error(settingsResult.error);
          return;
        }
        if ("error" in powerResult) {
          toast.error(powerResult.error);
          return;
        }

        toast.success(
          radarCronEnabled
            ? "Nastavení Radaru uloženo — automatický sběr je zapnutý."
            : "Nastavení Radaru uloženo — automatický sběr je vypnutý.",
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
          sendDays: (automationSettings.sendDays ?? []).filter((d) => d >= 1 && d <= 5),
          onlyWithEmail: Boolean(automationSettings.onlyWithEmail),
        };
        window.localStorage.setItem(SNIPER_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
        const powerResult = await setEmailSendCronEnabled(emailSendCronEnabled);
        if ("error" in powerResult) {
          toast.error(powerResult.error);
          return;
        }
        toast.success(
          emailSendCronEnabled
            ? "Odesílání uloženo — automatický cron je zapnutý."
            : "Odesílání uloženo — automatický cron je vypnutý.",
        );
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
          ? "Full Auto uloženo a zapnuté."
          : "Full Auto uloženo — zůstává vypnuté.",
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
    isTogglingPower,
    automationSettings,
    setAutomationSettings,
    featureEnabled,
    setFeatureEnabledLocal,
    radarCronEnabled,
    emailSendCronEnabled,
    fullAutoEnabled,
    setFullAutoEnabledState,
    toggleFeaturePower,
    openSettings: () => setSettingsOpen(true),
    handleSaveAutomationSettings,
  };
}
