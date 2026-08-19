"use client";

import { Check, Radio, Rocket, Sparkles } from "lucide-react";
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
} from "@/lib/country-language";

export type AutopilotSettingsSection = "radar" | "sniper" | "full-auto";

const SECTION_META: Record<
  AutopilotSettingsSection,
  {
    title: string;
    description: string;
    icon: typeof Radio;
  }
> = {
  radar: {
    title: "Nastavení Radaru",
    description:
      "Kdy a koho má Radar hledat. Změny platí od příštího automatického běhu.",
    icon: Radio,
  },
  sniper: {
    title: "Nastavení odesílání",
    description: "Generování hned · odeslání podle dnů, oken a limitu dávky.",
    icon: Rocket,
  },
  "full-auto": {
    title: "Nastavení Full Auto",
    description:
      "Jak často spustit celou smyčku: Radar najde firmy → Sniper je osloví.",
    icon: Sparkles,
  },
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
  const meta = SECTION_META[section];
  const SectionIcon = meta.icon;

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
    .map((day) => day.label)
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
          "left-[50%] top-[50%] h-auto max-h-[min(90vh,720px)] w-full translate-x-[-50%] translate-y-[-50%] rounded-[18px]",
          section === "radar"
            ? "max-w-3xl"
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
                : "scrollbar-hide overflow-y-auto overscroll-contain",
          )}
        >
          <DialogHeader
            className={cn(
              "space-y-1 text-left",
              (section === "sniper" || section === "full-auto") && "space-y-0.5",
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
            {section === "sniper" || section === "full-auto" ? null : (
              <DialogDescription className="text-xs">
                {meta.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {featureEnabled != null && onFeatureEnabledChange ? (
            <div
              className={cn(
                "sk-settings-row flex items-center justify-between gap-3 px-3",
                section === "sniper" || section === "full-auto"
                  ? "py-1.5"
                  : "py-2.5",
                featureEnabled && "sk-settings-row--on",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {featureEnabled ? "Automatika zapnutá" : "Automatika vypnutá"}
                </p>
                {section === "sniper" || section === "full-auto" ? null : (
                  <p className="text-[11px] text-muted-foreground">
                    {section === "radar"
                      ? "Vypnuto = noční cron firmy nehledá (ruční sběr funguje dál)."
                      : "Vypnuto = Full Auto cron neběží."}
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
              <section className="sk-settings-panel flex h-full min-h-0 flex-col overflow-hidden">
                <div className="sk-settings-panel__head">
                  <p>1 · Kdy hledat</p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm">Dny</Label>
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
                          Po–Pá
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
                          Celý týden
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
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="radar-run-time" className="text-sm">
                        Čas
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
                    <div className="space-y-1">
                      <Label htmlFor="radar-min-companies" className="text-sm">
                        Od firem
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
                    <div className="space-y-1">
                      <Label htmlFor="radar-max-companies" className="text-sm">
                        Do firem
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
                      Vyber alespoň jeden den, jinak se sběr nespustí.
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-[color:var(--sk-panel-edge)] pt-3">
                    <div className="min-w-0">
                      <Label
                        htmlFor="auto-start-outreach"
                        className="text-sm text-foreground"
                      >
                        3 · Rovnou odesílat
                      </Label>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        Vypnuto = jen uloží do CRM. Zapni, až budeš chtít rovnou
                        generovat a posílat.
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
                  <p>2 · Koho hledat</p>
                </div>
                <div className="flex flex-col gap-2.5 p-3">
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="radar-industries" className="text-sm">
                        Obory
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        odděl čárkou
                      </span>
                    </div>
                    <Textarea
                      id="radar-industries"
                      rows={2}
                      placeholder="marketingová agentura, webové studio…"
                      value={settings.targetIndustries}
                      onChange={(e) =>
                        patch({ targetIndustries: e.target.value })
                      }
                      disabled={disabled}
                      className="min-h-[52px] resize-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="radar-locations" className="text-sm">
                        Města / regiony
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        odděl čárkou
                      </span>
                    </div>
                    <Textarea
                      id="radar-locations"
                      rows={2}
                      placeholder="Praha, Brno, Ostrava…"
                      value={settings.locations}
                      onChange={(e) => patch({ locations: e.target.value })}
                      disabled={disabled}
                      className="min-h-[52px] resize-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Země hledání</Label>
                    <Select
                      value={settings.countryCode || "CZ"}
                      onValueChange={(value) => patch({ countryCode: value })}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Vyberte zemi" />
                      </SelectTrigger>
                      <SelectContent className="bg-card ">
                        <SelectItem value={RADAR_COUNTRY_NONE}>
                          Bez omezení
                        </SelectItem>
                        {RADAR_COUNTRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Velikost firmy</Label>
                    <Select
                      value={settings.companySize}
                      onValueChange={(value) =>
                        patch({ companySize: value as RadarCompanySize })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Vyberte velikost" />
                      </SelectTrigger>
                      <SelectContent className="bg-card ">
                        {RADAR_COMPANY_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      title: "Jen do fronty",
                      hint: "Jen napíše e-maily. Neodešle, dokud nezapneš odesílání nebo nepošleš ručně.",
                    },
                    {
                      id: "batch" as const,
                      title: "V časových oknech",
                      hint: "Do fronty podle dnů a hodin (odesílá cron, když je zapnutý).",
                    },
                    {
                      id: "immediate" as const,
                      title: "Hned po vygenerování",
                      hint: "Vygeneruje a ihned odešle (jen když je Zapnout aktivní).",
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
                  Pouze firmy s e-mailem
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
                        Dny · Tempo
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
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="modal-max-batch"
                          className="whitespace-nowrap text-[10px]"
                        >
                          Max / dávka
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
                      Časová okna
                    </p>
                    <div className="space-y-2.5">
                      <TimeWindowRow
                        label="Základní"
                        start={settings.window1Start}
                        end={settings.window1End}
                        disabled={disabled}
                        compact
                        onStartChange={(value) =>
                          patch({ window1Start: value })
                        }
                        onEndChange={(value) => patch({ window1End: value })}
                      />

                      {settings.window2Enabled ? (
                        <TimeWindowRow
                          label="2. okno"
                          start={settings.window2Start}
                          end={settings.window2End}
                          disabled={disabled}
                          compact
                          onRemove={() => patch({ window2Enabled: false })}
                          onStartChange={(value) =>
                            patch({ window2Start: value })
                          }
                          onEndChange={(value) => patch({ window2End: value })}
                        />
                      ) : (
                        <OptionalWindowToggle
                          label="2. okno"
                          enabled={false}
                          disabled={disabled}
                          onEnabledChange={(enabled) =>
                            patch({ window2Enabled: enabled })
                          }
                        />
                      )}

                      {settings.window3Enabled ? (
                        <TimeWindowRow
                          label="3. okno"
                          start={settings.window3Start}
                          end={settings.window3End}
                          disabled={disabled}
                          compact
                          onRemove={() => patch({ window3Enabled: false })}
                          onStartChange={(value) =>
                            patch({ window3Start: value })
                          }
                          onEndChange={(value) => patch({ window3End: value })}
                        />
                      ) : (
                        <OptionalWindowToggle
                          label="3. okno"
                          enabled={false}
                          disabled={disabled}
                          onEnabledChange={(enabled) =>
                            patch({ window3Enabled: enabled })
                          }
                        />
                      )}
                    </div>
                    <p className="sk-settings-note sk-settings-note--info mt-2.5 px-2.5 py-1.5 text-[10px] leading-snug">
                      {sendDayLabels || "žádný den"} ·{" "}
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
                <p className="sk-type-label">1 · Jak často</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        id: "once_weekly" as const,
                        title: "1× týdně",
                        hint: "Klidnější tempo",
                      },
                      {
                        id: "twice_weekly" as const,
                        title: "2× týdně",
                        hint: "Doporučeno",
                      },
                      {
                        id: "daily" as const,
                        title: "Každý pracovní den",
                        hint: "Nejvíce leadů",
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
                    2 · Čas spuštění
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
                  Pracovní dny · místní čas
                </p>
              </div>

              <p className="sk-settings-note sk-settings-note--info px-2.5 py-1.5 text-[10px] leading-snug">
                Běží jen při zapnuté automatice. Frekvence a čas určí rytmus
                smyčky Radar → Sniper.
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
            Zavřít
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
            {isSaving ? "Ukládám…" : "Uložit nastavení"}
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
}: {
  label: string;
  start: string;
  end: string;
  disabled?: boolean;
  compact?: boolean;
  onRemove?: () => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
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
            Odebrat
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
          <Label className="text-[10px]">Od</Label>
          <TimeSelect
            value={start}
            disabled={disabled}
            onChange={onStartChange}
          />
        </div>
        <span className="mb-1.5 text-xs text-muted-foreground">–</span>
        <div className="space-y-0.5">
          <Label className="text-[10px]">Do</Label>
          <TimeSelect value={end} disabled={disabled} onChange={onEndChange} />
        </div>
      </div>
    </div>
  );
}
