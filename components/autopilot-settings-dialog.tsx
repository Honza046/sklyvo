"use client";

import { Check, Repeat2, Rocket, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  RADAR_WEEKDAYS,
  SCHEDULE_TIME_OPTIONS,
  SEND_WEEKDAYS,
  ensureScheduleTimeOption,
  getActiveScheduleWindows,
  type AutopilotAutomationSettings,
  type FullAutoFrequency,
  type RadarCompanySize,
  type SendingStrategy,
} from "@/lib/autopilot-settings";
import { RADAR_COMPANY_SIZE_OPTIONS } from "@/lib/radar-settings-meta";
import {
  RADAR_COUNTRY_NONE,
  RADAR_COUNTRY_OPTIONS,
  localizedCountryLabel,
} from "@/lib/country-language";
import { useLanguage } from "@/context/LanguageContext";
import { DATE_LOCALE } from "@/lib/i18n/types";

export type AutopilotSettingsSection = "radar" | "sniper" | "full-auto";

const SECTION_ICONS: Record<
  AutopilotSettingsSection,
  typeof SlidersHorizontal
> = {
  radar: SlidersHorizontal,
  sniper: Rocket,
  "full-auto": Repeat2,
};

const WEEKDAY_I18N: Record<number, string> = {
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
  0: "sun",
};

type AutopilotSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: AutopilotSettingsSection;
  settings: AutopilotAutomationSettings;
  onChange: (next: AutopilotAutomationSettings) => void;
  onSave?: () => void | Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  /** Zapnutí/vypnutí cronu pro danou funkci. */
  featureEnabled?: boolean | null;
  onFeatureEnabledChange?: (enabled: boolean) => void;
};

export function AutopilotSettingsDialog({
  open,
  onOpenChange,
  section,
  settings,
  onChange,
  onSave,
  isLoading = false,
  isSaving = false,
  featureEnabled,
  onFeatureEnabledChange,
}: AutopilotSettingsDialogProps) {
  const { t, language } = useLanguage();
  const SectionIcon = SECTION_ICONS[section];
  const meta = {
    title:
      section === "radar"
        ? t("autopilot.settings.radarTitle")
        : section === "sniper"
          ? t("autopilot.settings.sniperTitle")
          : t("autopilot.settings.fullAutoTitle"),
    description:
      section === "radar"
        ? t("autopilot.settings.radarDescription")
        : section === "sniper"
          ? t("autopilot.settings.sniperDescription")
          : t("autopilot.settings.fullAutoDescription"),
  };
  const weekdayLabel = (value: number) =>
    t(`autopilot.settings.weekday.${WEEKDAY_I18N[value]}`);

  const patch = (partial: Partial<AutopilotAutomationSettings>) => {
    onChange({ ...settings, ...partial });
  };

  const sortRadarDays = (days: number[]) =>
    [...days].sort((a, b) => {
      const order = [1, 2, 3, 4, 5, 6, 0];
      return order.indexOf(a) - order.indexOf(b);
    });

  const toggleRadarDay = (day: number) => {
    const next = settings.radarDays.includes(day)
      ? settings.radarDays.filter((value) => value !== day)
      : sortRadarDays([...settings.radarDays, day]);
    patch({ radarDays: next });
  };

  const toggleSendDay = (day: number) => {
    if (day < 1 || day > 5) return;
    const current = (settings.sendDays ?? []).filter((d) => d >= 1 && d <= 5);
    const next = current.includes(day)
      ? current.filter((value) => value !== day)
      : sortRadarDays([...current, day]);
    patch({ sendDays: next });
  };

  const WEEKDAY_VALUES = [1, 2, 3, 4, 5];
  const ALL_DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];
  const isWeekdaysOnly =
    settings.radarDays.length === 5 &&
    WEEKDAY_VALUES.every((day) => settings.radarDays.includes(day));
  const isAllWeek =
    settings.radarDays.length === 7 &&
    ALL_DAY_VALUES.every((day) => settings.radarDays.includes(day));
  const sendDays = (settings.sendDays ?? []).filter((d) => d >= 1 && d <= 5);
  const isSendWeekdaysOnly =
    sendDays.length === 5 &&
    WEEKDAY_VALUES.every((day) => sendDays.includes(day));

  const sendDayLabels = SEND_WEEKDAYS.filter((day) =>
    sendDays.includes(day.value),
  )
    .map((day) => weekdayLabel(day.value))
    .join(", ");

  const radarDayLabels = RADAR_WEEKDAYS.filter((day) =>
    settings.radarDays.includes(day.value),
  )
    .map((day) => day.label)
    .join(", ");

  const disabled = isLoading || isSaving;

  // Mount dialog body only when open — avoids evaluating section UI (and possible
  // crashes) on every parent render, and keeps heavy portals off the Full Auto page.
  if (!open) {
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-theme="dark"
        className={cn(
          "sklyvo-app sk-dialog-flat sk-settings-dialog flex w-full flex-col gap-0 overflow-hidden p-0",
          "left-[50%] top-[50%] h-auto w-full translate-x-[-50%] translate-y-[-50%] rounded-[18px]",
            section === "radar"
            ? "max-h-[min(94vh,760px)] max-w-[52rem]"
            : section === "sniper"
              ? "max-h-none max-w-2xl"
              : "max-h-none max-w-lg",
        )}
      >
        <div
          className={cn(
            /* Extra bottom pad so raised panel shadows aren't clipped by overflow */
            "sk-settings-scroll min-h-0 flex-1 space-y-2.5 px-4 pb-7 pt-8 sm:px-6 sm:pb-8 sm:pt-9",
            section === "sniper"
              ? "scrollbar-hide space-y-1.5 overflow-y-auto overscroll-contain sm:space-y-1.5 sm:overflow-visible sm:pt-7 sm:pb-6"
              : section === "full-auto"
                ? "scrollbar-hide space-y-2 overflow-visible pt-6 pb-4 sm:px-5 sm:pt-7 sm:pb-5"
                : "sk-settings-scroll--radar scrollbar-hide space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7",
          )}
        >
          <DialogHeader
            className={cn(
              "space-y-1 text-left",
              (section === "sniper" ||
                section === "full-auto" ||
                section === "radar") &&
                "space-y-0.5",
            )}
          >
            <DialogTitle className="flex items-center gap-3 pr-10 text-base">
              <span className="sk-settings-icon">
                <SectionIcon
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={2.25}
                />
              </span>
              {meta.title}
            </DialogTitle>
            {section === "sniper" ||
            section === "full-auto" ||
            section === "radar" ? null : (
              <DialogDescription className="text-xs">
                {meta.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {featureEnabled != null && onFeatureEnabledChange ? (
            <div
              className={cn(
                "sk-settings-row flex items-center justify-between gap-3 px-3",
                section === "sniper" ||
                  section === "full-auto" ||
                  section === "radar"
                  ? "py-1.5"
                  : "py-2.5",
                featureEnabled && "sk-settings-row--on",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {featureEnabled ? t("autopilot.settings.automationOn") : t("autopilot.settings.automationOff")}
                </p>
                {section === "sniper" ||
                section === "full-auto" ||
                section === "radar" ? null : (
                  <p className="text-[11px] text-muted-foreground">
                    {section === "radar"
                      ? t("autopilot.settings.radarAutomationHint")
                      : t("autopilot.settings.fullAutoAutomationHint")}
                  </p>
                )}
              </div>
              <Switch
                checked={featureEnabled}
                onCheckedChange={onFeatureEnabledChange}
                disabled={disabled}
                className="sk-switch--sm shrink-0"
              />
            </div>
          ) : null}

          {section === "radar" && (
            <div className="grid items-stretch gap-3 md:grid-cols-2">
              <section className="sk-settings-panel flex h-full flex-col overflow-hidden">
                <div className="sk-settings-panel__head">
                  <p>{t("autopilot.settings.whenToSearch")}</p>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm">{t("autopilot.settings.days")}</Label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            patch({ radarDays: [...WEEKDAY_VALUES] })
                          }
                          className={cn(
                            "sk-mini-chip px-2 py-0.5 text-[11px] disabled:opacity-50",
                            isWeekdaysOnly && "sk-mini-chip--active",
                          )}
                        >
                          {t("autopilot.settings.weekdaysMonFri")}
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            patch({ radarDays: [...ALL_DAY_VALUES] })
                          }
                          className={cn(
                            "sk-mini-chip px-2 py-0.5 text-[11px] disabled:opacity-50",
                            isAllWeek && "sk-mini-chip--active",
                          )}
                        >
                          {t("autopilot.settings.allWeek")}
                        </button>
                      </div>
                    </div>
                    <div className="sk-day-track">
                      {RADAR_WEEKDAYS.map(({ value, label }) => {
                        const active = settings.radarDays.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleRadarDay(value)}
                            disabled={disabled}
                            aria-pressed={active}
                            className={cn(
                              "sk-day-track__item disabled:opacity-50",
                              active && "sk-day-track__item--active",
                            )}
                          >
                            {weekdayLabel(value)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="radar-run-time" className="text-sm">
                        {t("autopilot.settings.time")}
                      </Label>
                      <Input
                        id="radar-run-time"
                        type="time"
                        value={settings.radarRunTime}
                        onChange={(e) =>
                          patch({ radarRunTime: e.target.value })
                        }
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="radar-min-companies" className="text-sm">
                        {t("autopilot.settings.minCompanies")}
                      </Label>
                      <Input
                        id="radar-min-companies"
                        type="number"
                        min={1}
                        max={200}
                        value={settings.minCompaniesPerRun}
                        onChange={(e) => {
                          const min = Math.max(1, Number(e.target.value) || 1);
                          patch({
                            minCompaniesPerRun: min,
                            maxCompaniesPerRun: Math.max(
                              min,
                              settings.maxCompaniesPerRun,
                            ),
                          });
                        }}
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="radar-max-companies" className="text-sm">
                        {t("autopilot.settings.maxCompanies")}
                      </Label>
                      <Input
                        id="radar-max-companies"
                        type="number"
                        min={1}
                        max={200}
                        value={settings.maxCompaniesPerRun}
                        onChange={(e) => {
                          const max = Math.max(1, Number(e.target.value) || 1);
                          patch({
                            maxCompaniesPerRun: max,
                            minCompaniesPerRun: Math.min(
                              settings.minCompaniesPerRun,
                              max,
                            ),
                          });
                        }}
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {settings.radarDays.length > 0 ? (
                    <p className="sk-settings-note sk-settings-note--info px-3 py-2 text-xs leading-snug">
                      {radarDayLabels} · kolem{" "}
                      {settings.radarRunTime || "03:00"} · cíl{" "}
                      {settings.minCompaniesPerRun}–
                      {settings.maxCompaniesPerRun} firem / den
                    </p>
                  ) : (
                    <p className="sk-settings-note sk-settings-note--warn px-3 py-2 text-xs">
                      {t("autopilot.settings.radarPickDay")}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[color:var(--sk-panel-edge)] pt-3">
                    <div className="min-w-0">
                      <Label
                        htmlFor="auto-start-outreach"
                        className="text-sm text-foreground"
                      >
                        {t("autopilot.settings.autoOutreach")}
                      </Label>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {t("autopilot.settings.autoOutreachHint")}
                      </p>
                    </div>
                    <Switch
                      id="auto-start-outreach"
                      checked={settings.autoStartOutreach}
                      onCheckedChange={(checked) =>
                        patch({ autoStartOutreach: checked })
                      }
                      disabled={disabled}
                      className="shrink-0"
                    />
                  </div>
                </div>
              </section>

              <section className="sk-settings-panel flex h-full flex-col overflow-hidden">
                <div className="sk-settings-panel__head">
                  <p>{t("autopilot.settings.whoToSearch")}</p>
                </div>
                <div className="flex flex-1 flex-col gap-3.5 p-3.5">
                  <div className="sk-settings-keywords space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="radar-industries" className="text-sm">
                        {t("autopilot.settings.industries")}
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        {t("autopilot.settings.commaSeparated")}
                      </span>
                    </div>
                    <Textarea
                      id="radar-industries"
                      rows={4}
                      placeholder={t("autopilot.settings.industriesPlaceholder")}
                      value={settings.targetIndustries}
                      onChange={(e) =>
                        patch({ targetIndustries: e.target.value })
                      }
                      disabled={disabled}
                      className="sk-settings-keywords__field sk-settings-keywords__field--industries"
                    />
                  </div>

                  <div className="sk-settings-keywords space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="radar-locations" className="text-sm">
                        {t("autopilot.settings.locations")}
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        {t("autopilot.settings.commaSeparated")}
                      </span>
                    </div>
                    <Textarea
                      id="radar-locations"
                      rows={2}
                      placeholder={t("autopilot.settings.locationsPlaceholder")}
                      value={settings.locations}
                      onChange={(e) => patch({ locations: e.target.value })}
                      disabled={disabled}
                      className="sk-settings-keywords__field sk-settings-keywords__field--locations"
                    />
                  </div>

                  <div className="mt-auto grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("radar.country")}</Label>
                      <Select
                        value={settings.countryCode || "CZ"}
                        onValueChange={(value) => patch({ countryCode: value })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={t("radar.country")} />
                        </SelectTrigger>
                        <SelectContent className="bg-card ">
                          <SelectItem value={RADAR_COUNTRY_NONE}>
                            {t("radar.countryAny")}
                          </SelectItem>
                          {RADAR_COUNTRY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.code} value={opt.code}>
                              {localizedCountryLabel(
                                opt.code,
                                DATE_LOCALE[language],
                              ) ?? opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">
                        {t("autopilot.settings.companySize")}
                      </Label>
                      <Select
                        value={settings.companySize}
                        onValueChange={(value) =>
                          patch({ companySize: value as RadarCompanySize })
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue
                            placeholder={t(
                              "autopilot.settings.companySizePlaceholder",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-card ">
                          {RADAR_COMPANY_SIZE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(
                                option.value === "any"
                                  ? "autopilot.settings.companySizeAny"
                                  : option.value === "micro"
                                    ? "autopilot.settings.companySizeMicro"
                                    : option.value === "small"
                                      ? "autopilot.settings.companySizeSmall"
                                      : option.value === "medium"
                                        ? "autopilot.settings.companySizeMedium"
                                        : "autopilot.settings.companySizeLarge",
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {section === "sniper" && (
            <div className="space-y-1.5">
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    {
                      id: "queue" as const,
                      title: t("autopilot.settings.strategyQueue"),
                      hint: t("autopilot.settings.strategyQueueHint"),
                    },
                    {
                      id: "batch" as const,
                      title: t("autopilot.settings.strategyWindows"),
                      hint: t("autopilot.settings.strategyWindowsHint"),
                    },
                    {
                      id: "immediate" as const,
                      title: t("autopilot.settings.strategyImmediate"),
                      hint: t("autopilot.settings.strategyImmediateHint"),
                    },
                  ] satisfies {
                    id: SendingStrategy;
                    title: string;
                    hint: string;
                  }[]
                ).map((option) => {
                  const active = settings.sendingStrategy === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => patch({ sendingStrategy: option.id })}
                      className={cn(
                        "sk-choice px-2.5 py-1.5 text-left disabled:opacity-50",
                        active && "sk-choice--active",
                      )}
                    >
                      <p className="sk-choice__title text-[13px] font-semibold">
                        {option.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>

              <label
                htmlFor="settings-sniper-only-email"
                className="sk-settings-row flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5"
              >
                <p className="text-[13px] font-semibold text-foreground">
                  {t("autopilot.settings.onlyWithEmail")}
                </p>
                <Switch
                  id="settings-sniper-only-email"
                  checked={Boolean(settings.onlyWithEmail)}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    patch({ onlyWithEmail: checked })
                  }
                  className="shrink-0"
                />
              </label>

              {settings.sendingStrategy === "batch" ? (
                <div className="space-y-2.5">
                  <section className="sk-settings-panel p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("autopilot.settings.daysTempo")}
                      </p>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => patch({ sendDays: [...WEEKDAY_VALUES] })}
                        className={cn(
                          "sk-mini-chip px-1.5 py-0.5 text-[10px] disabled:opacity-50",
                          isSendWeekdaysOnly && "sk-mini-chip--active",
                        )}
                      >
                        Po–Pá
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="sk-day-track min-w-0 flex-1">
                        {SEND_WEEKDAYS.map(({ value, label }) => {
                          const active = sendDays.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleSendDay(value)}
                              disabled={disabled}
                              aria-pressed={active}
                              className={cn(
                                "sk-day-track__item !h-7 disabled:opacity-50",
                                active && "sk-day-track__item--active",
                              )}
                            >
                              {weekdayLabel(value)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="modal-max-batch"
                          className="whitespace-nowrap text-[10px]"
                        >
                          {t("autopilot.settings.maxPerBatch")}
                        </Label>
                        <Input
                          id="modal-max-batch"
                          type="number"
                          min={1}
                          max={500}
                          value={settings.maxEmailsPerBatch}
                          onChange={(e) =>
                            patch({
                              maxEmailsPerBatch: Math.max(
                                1,
                                Number(e.target.value) || 1,
                              ),
                            })
                          }
                          disabled={disabled}
                          className="h-7 w-16 text-sm"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="sk-settings-panel p-3">
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("autopilot.settings.timeWindows")}
                    </p>
                    <div className="space-y-2.5">
                      <TimeWindowRow
                        label={t("autopilot.settings.windowPrimary")}
                        start={settings.window1Start}
                        end={settings.window1End}
                        disabled={disabled}
                        compact
                        onStartChange={(value) =>
                          patch({ window1Start: value })
                        }
                        onEndChange={(value) => patch({ window1End: value })}
                      
                        removeLabel={t("autopilot.settings.remove")}
                        fromLabel={t("autopilot.settings.from")}
                        toLabel={t("autopilot.settings.to")}
                      />

                      {settings.window2Enabled ? (
                        <TimeWindowRow
                          label={t("autopilot.settings.window2")}
                          start={settings.window2Start}
                          end={settings.window2End}
                          disabled={disabled}
                          compact
                          onRemove={() => patch({ window2Enabled: false })}
                          onStartChange={(value) =>
                            patch({ window2Start: value })
                          }
                          onEndChange={(value) => patch({ window2End: value })}
                        
                        removeLabel={t("autopilot.settings.remove")}
                        fromLabel={t("autopilot.settings.from")}
                        toLabel={t("autopilot.settings.to")}
                      />
                      ) : (
                        <OptionalWindowToggle
                          label={t("autopilot.settings.window2")}
                          enabled={false}
                          disabled={disabled}
                          onEnabledChange={(enabled) =>
                            patch({ window2Enabled: enabled })
                          }
                        />
                      )}

                      {settings.window3Enabled ? (
                        <TimeWindowRow
                          label={t("autopilot.settings.window3")}
                          start={settings.window3Start}
                          end={settings.window3End}
                          disabled={disabled}
                          compact
                          onRemove={() => patch({ window3Enabled: false })}
                          onStartChange={(value) =>
                            patch({ window3Start: value })
                          }
                          onEndChange={(value) => patch({ window3End: value })}
                        
                        removeLabel={t("autopilot.settings.remove")}
                        fromLabel={t("autopilot.settings.from")}
                        toLabel={t("autopilot.settings.to")}
                      />
                      ) : (
                        <OptionalWindowToggle
                          label={t("autopilot.settings.window3")}
                          enabled={false}
                          disabled={disabled}
                          onEnabledChange={(enabled) =>
                            patch({ window3Enabled: enabled })
                          }
                        />
                      )}
                    </div>
                    <p className="sk-settings-note sk-settings-note--info mt-2.5 px-2.5 py-1.5 text-[10px] leading-snug">
                      {sendDayLabels || t("autopilot.settings.noDay")} ·{" "}
                      {getActiveScheduleWindows(settings)
                        .map((w) => `${w.start}–${w.end}`)
                        .join(", ")}{" "}
                      · ≤{settings.maxEmailsPerBatch}
                    </p>
                  </section>
                </div>
              ) : settings.sendingStrategy === "queue" ? (
                <p className="sk-settings-note sk-settings-note--warn px-3 py-2 text-[11px] leading-relaxed">
                  E-maily se jen vygenerují do fronty. Neodešlou se, dokud
                  nezapneš automatiku nebo je nepošleš ručně z fronty.
                </p>
              ) : (
                <p className="sk-settings-note sk-settings-note--info px-3 py-2 text-[11px] leading-relaxed">
                  Po vygenerování se e-maily ihned odešlou, ale jen když je Zapnout
                  aktivní. Při vypnuté automatice zůstanou ve frontě.
                </p>
              )}
            </div>
          )}

          {section === "full-auto" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="sk-type-label">{t("autopilot.settings.howOften")}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        id: "once_weekly" as const,
                        title: t("autopilot.settings.freqOnceWeekly"),
                        hint: t("autopilot.settings.freqOnceWeeklyHint"),
                      },
                      {
                        id: "twice_weekly" as const,
                        title: t("autopilot.settings.freqTwiceWeekly"),
                        hint: t("autopilot.settings.freqTwiceWeeklyHint"),
                      },
                      {
                        id: "daily" as const,
                        title: t("autopilot.settings.freqDaily"),
                        hint: t("autopilot.settings.freqDailyHint"),
                      },
                    ] satisfies {
                      id: FullAutoFrequency;
                      title: string;
                      hint: string;
                    }[]
                  ).map((option) => {
                    const active = settings.fullAutoFrequency === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => patch({ fullAutoFrequency: option.id })}
                        className={cn(
                          "sk-choice px-2.5 py-2 text-left disabled:opacity-50",
                          active && "sk-choice--active",
                        )}
                      >
                        <p className="sk-choice__title text-[13px] font-semibold leading-tight">
                          {option.title}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                          {option.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="w-36 space-y-1">
                  <Label htmlFor="full-auto-run-time" className="sk-type-label">
                    {t("autopilot.settings.runTime")}
                  </Label>
                  <Input
                    id="full-auto-run-time"
                    type="time"
                    value={settings.fullAutoRunTime}
                    onChange={(e) =>
                      patch({ fullAutoRunTime: e.target.value })
                    }
                    disabled={disabled}
                    className="h-9"
                  />
                </div>
                <p className="pb-1.5 text-[11px] text-muted-foreground">
                  {t("autopilot.settings.workdaysLocal")}
                </p>
              </div>

              <p className="sk-settings-note sk-settings-note--info px-2.5 py-1.5 text-[10px] leading-snug">
                {t("autopilot.settings.fullAutoNote")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sk-settings-footer sk-dialog-actions relative z-10 flex shrink-0 flex-row justify-end gap-3 border-t border-[rgba(255,255,255,0.09)] bg-transparent px-6 py-3 sm:flex-row sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="sk-dialog-actions__cancel"
          >
            {t("autopilot.settings.close")}
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={disabled}
            className="sk-dialog-actions__save relative z-10 shrink-0"
            onClick={() => {
              void (async () => {
                await onSave?.();
              })();
            }}
          >
            {isSaving ? t("autopilot.powerSaving") : t("autopilot.settings.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionalWindowToggle({
  label,
  enabled,
  disabled,
  onEnabledChange,
}: {
  label: string;
  enabled: boolean;
  disabled?: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={enabled}
      onClick={() => onEnabledChange(!enabled)}
      className={cn(
        "sk-ap-window-toggle flex w-full items-center gap-2.5 px-2.5 py-2 text-left disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border",
          enabled
            ? "border-[rgba(255,255,255,0.35)] bg-[#131417] text-[#fafafb]"
            : "border-[rgba(255,255,255,0.13)] bg-transparent text-transparent",
        )}
      >
        {enabled ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className="text-[12px] font-medium text-foreground">
        Přidat {label.toLowerCase()}
      </span>
    </button>
  );
}

function TimeSelect({
  value,
  disabled,
  onChange,
  id,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  id?: string;
}) {
  const safeValue = ensureScheduleTimeOption(value);
  return (
    <Select value={safeValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className="h-8 w-[5.75rem] px-2 text-sm tabular-nums"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-56 bg-card ">
        {SCHEDULE_TIME_OPTIONS.map((option) => (
          <SelectItem key={option} value={option} className="tabular-nums">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TimeWindowRow({
  label,
  start,
  end,
  disabled,
  compact,
  onRemove,
  onStartChange,
  onEndChange,
  removeLabel,
  fromLabel,
  toLabel,
}: {
  label: string;
  start: string;
  end: string;
  disabled?: boolean;
  compact?: boolean;
  onRemove?: () => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  removeLabel: string;
  fromLabel: string;
  toLabel: string;
}) {
  if (compact) {
    return (
      <div className="sk-ap-time-window flex flex-wrap items-center gap-2 px-2.5 py-2">
        <span className="w-16 shrink-0 text-[10px] font-semibold text-muted-foreground">
          {label}
        </span>
        <TimeSelect
          value={start}
          disabled={disabled}
          onChange={onStartChange}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <TimeSelect value={end} disabled={disabled} onChange={onEndChange} />
        {onRemove ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="ml-auto text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
          >
            {removeLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sk-ap-time-window px-2.5 py-2">
      <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px]">{fromLabel}</Label>
          <TimeSelect
            value={start}
            disabled={disabled}
            onChange={onStartChange}
          />
        </div>
        <span className="mb-1.5 text-xs text-muted-foreground">–</span>
        <div className="space-y-0.5">
          <Label className="text-[10px]">{toLabel}</Label>
          <TimeSelect value={end} disabled={disabled} onChange={onEndChange} />
        </div>
      </div>
    </div>
  );
}
