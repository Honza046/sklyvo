"use client";

import { Radio, Rocket, Sparkles } from "lucide-react";
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
  FULL_AUTO_FREQUENCY_LABELS,
  RADAR_WEEKDAYS,
  type AutopilotAutomationSettings,
  type FullAutoFrequency,
  type RadarCompanySize,
  type SendingStrategy,
} from "@/lib/autopilot-settings";
import { RADAR_COMPANY_SIZE_OPTIONS } from "@/lib/radar-settings-meta";

export type AutopilotSettingsSection = "radar" | "sniper" | "full-auto";

const SECTION_META: Record<
  AutopilotSettingsSection,
  { title: string; description: string; icon: typeof Radio; iconClass: string }
> = {
  radar: {
    title: "Nastavení Radaru",
    description: "Kdy a koho má Radar hledat. Změny platí od příštího automatického běhu.",
    icon: Radio,
    iconClass: "text-emerald-600",
  },
  sniper: {
    title: "Nastavení odesílání",
    description:
      "Časová okna a limity fronty e-mailů. E-maily se generují hned, odesílají se postupně podle těchto pravidel.",
    icon: Rocket,
    iconClass: "text-blue-600",
  },
  "full-auto": {
    title: "Nastavení Full Auto",
    description:
      "Plán kompletní smyčky Radar → Sniper. Uložené hodnoty se použijí, až bude režim dostupný.",
    icon: Sparkles,
    iconClass: "text-violet-600",
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

  const WEEKDAY_VALUES = [1, 2, 3, 4, 5];
  const ALL_DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];
  const isWeekdaysOnly =
    settings.radarDays.length === 5 &&
    WEEKDAY_VALUES.every((day) => settings.radarDays.includes(day));
  const isAllWeek =
    settings.radarDays.length === 7 &&
    ALL_DAY_VALUES.every((day) => settings.radarDays.includes(day));

  const radarDayLabels = RADAR_WEEKDAYS.filter((day) =>
    settings.radarDays.includes(day.value),
  )
    .map((day) => day.label)
    .join(", ");

  const disabled = isLoading || isSaving;
  const saveButtonClass = {
    radar: "bg-emerald-600 font-semibold text-white hover:bg-emerald-700",
    sniper: "bg-blue-600 font-semibold text-white hover:bg-blue-700",
    "full-auto": "bg-violet-600 font-semibold text-white hover:bg-violet-700",
  }[section];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl",
          section === "radar" ? "max-w-lg" : "max-w-xl",
        )}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-10">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2 pr-10 text-base">
              <SectionIcon className={cn("h-5 w-5 shrink-0", meta.iconClass)} />
              {meta.title}
            </DialogTitle>
            <DialogDescription className="text-xs">{meta.description}</DialogDescription>
          </DialogHeader>

        {section === "radar" && (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-border/60 bg-muted/15">
              <div className="border-b border-border/50 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  1 · Kdy hledat
                </p>
              </div>
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">Dny</Label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => patch({ radarDays: [...WEEKDAY_VALUES] })}
                        className={cn(
                          "rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                          isWeekdaysOnly
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                      >
                        Po–Pá
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => patch({ radarDays: [...ALL_DAY_VALUES] })}
                        className={cn(
                          "rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                          isAllWeek
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                      >
                        Celý týden
                      </button>
                    </div>
                  </div>
                  <div className="flex rounded-lg bg-muted/60 p-1">
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
                            "h-9 flex-1 rounded-md text-xs font-semibold transition-all disabled:opacity-50",
                            active
                              ? "bg-background text-emerald-700 shadow-sm dark:text-emerald-300"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="radar-run-time" className="text-sm">
                      Čas
                    </Label>
                    <Input
                      id="radar-run-time"
                      type="time"
                      value={settings.radarRunTime}
                      onChange={(e) => patch({ radarRunTime: e.target.value })}
                      disabled={disabled}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="radar-max-companies" className="text-sm">
                      Max. firem / běh
                    </Label>
                    <Input
                      id="radar-max-companies"
                      type="number"
                      min={1}
                      max={200}
                      value={settings.maxCompaniesPerRun}
                      onChange={(e) =>
                        patch({
                          maxCompaniesPerRun: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      disabled={disabled}
                      className="h-10"
                    />
                  </div>
                </div>

                {settings.radarDays.length > 0 ? (
                  <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    Radar poběží v {radarDayLabels} kolem {settings.radarRunTime} — až{" "}
                    {settings.maxCompaniesPerRun} firem.
                  </p>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    Vyber alespoň jeden den, jinak se automatický sběr nespustí.
                  </p>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border/60 bg-muted/15">
              <div className="border-b border-border/50 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  2 · Koho hledat
                </p>
              </div>
              <div className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="radar-industries" className="text-sm">
                    Obory
                  </Label>
                  <Textarea
                    id="radar-industries"
                    rows={2}
                    placeholder="marketingová agentura, webové studio…"
                    value={settings.targetIndustries}
                    onChange={(e) => patch({ targetIndustries: e.target.value })}
                    disabled={disabled}
                    className="min-h-[64px] resize-none text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Více hodnot odděl čárkou.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="radar-locations" className="text-sm">
                    Města / regiony
                  </Label>
                  <Textarea
                    id="radar-locations"
                    rows={2}
                    placeholder="Praha, Brno, Ostrava…"
                    value={settings.locations}
                    onChange={(e) => patch({ locations: e.target.value })}
                    disabled={disabled}
                    className="min-h-[64px] resize-none text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Více hodnot odděl čárkou.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Velikost firmy</Label>
                  <Select
                    value={settings.companySize}
                    onValueChange={(value) => patch({ companySize: value as RadarCompanySize })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Vyberte velikost" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-950">
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

            <section className="overflow-hidden rounded-xl border border-border/60 bg-muted/15">
              <div className="border-b border-border/50 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  3 · Po nalezení
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor="auto-start-outreach" className="text-sm text-foreground">
                    Rovnou do Sniperu
                  </Label>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Nové firmy se hned zařadí do fronty na oslovení. Jinak zůstanou jen v CRM.
                  </p>
                </div>
                <Switch
                  id="auto-start-outreach"
                  checked={settings.autoStartOutreach}
                  onCheckedChange={(checked) => patch({ autoStartOutreach: checked })}
                  disabled={disabled}
                  className="shrink-0 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
                />
              </div>
            </section>
          </div>
        )}

        {section === "sniper" && (
          <div className="space-y-4">
            <div className="flex w-full rounded-lg bg-gray-100 p-1 dark:bg-zinc-800">
              {(
                [
                  { id: "batch" as const, label: "Plánovaná časová okna" },
                  { id: "immediate" as const, label: "Odesílat ihned po vygenerování" },
                ] satisfies { id: SendingStrategy; label: string }[]
              ).map((option) => {
                const active = settings.sendingStrategy === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ sendingStrategy: option.id })}
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-center text-xs font-medium transition-all duration-200 disabled:opacity-50",
                      active
                        ? "bg-white text-blue-600 shadow-sm dark:bg-zinc-900 dark:text-blue-400"
                        : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "space-y-4 transition-opacity duration-200",
                settings.sendingStrategy === "immediate" && "pointer-events-none opacity-40",
              )}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Okno 1
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-window1-start">Od</Label>
                      <Input
                        id="modal-window1-start"
                        type="time"
                        value={settings.window1Start}
                        onChange={(e) => patch({ window1Start: e.target.value })}
                        disabled={disabled || settings.sendingStrategy === "immediate"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-window1-end">Do</Label>
                      <Input
                        id="modal-window1-end"
                        type="time"
                        value={settings.window1End}
                        onChange={(e) => patch({ window1End: e.target.value })}
                        disabled={disabled || settings.sendingStrategy === "immediate"}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Okno 2 (volitelné)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-window2-start">Od</Label>
                      <Input
                        id="modal-window2-start"
                        type="time"
                        value={settings.window2Start}
                        onChange={(e) => patch({ window2Start: e.target.value })}
                        disabled={disabled || settings.sendingStrategy === "immediate"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="modal-window2-end">Do</Label>
                      <Input
                        id="modal-window2-end"
                        type="time"
                        value={settings.window2End}
                        onChange={(e) => patch({ window2End: e.target.value })}
                        disabled={disabled || settings.sendingStrategy === "immediate"}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="modal-max-batch">Max. e-mailů na dávku</Label>
                <Input
                  id="modal-max-batch"
                  type="number"
                  min={1}
                  max={500}
                  value={settings.maxEmailsPerBatch}
                  onChange={(e) =>
                    patch({ maxEmailsPerBatch: Math.max(1, Number(e.target.value) || 1) })
                  }
                  disabled={disabled || settings.sendingStrategy === "immediate"}
                />
              </div>
            </div>

            {settings.sendingStrategy === "immediate" && (
              <p className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs leading-relaxed text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                E-maily se po vygenerování ihned zařadí do fronty a odešlou bez čekání na časová
                okna. Limity dávky se v tomto režimu nepoužívají.
              </p>
            )}
          </div>
        )}

        {section === "full-auto" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Frekvence</Label>
              <Select
                value={settings.fullAutoFrequency}
                onValueChange={(value) => patch({ fullAutoFrequency: value as FullAutoFrequency })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte frekvenci" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-950">
                  {(Object.keys(FULL_AUTO_FREQUENCY_LABELS) as FullAutoFrequency[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {FULL_AUTO_FREQUENCY_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full-auto-run-time">Čas spuštění</Label>
              <Input
                id="full-auto-run-time"
                type="time"
                value={settings.fullAutoRunTime}
                onChange={(e) => patch({ fullAutoRunTime: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
        )}
        </div>

        <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-border/60 bg-background px-6 py-4 sm:flex-row sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Zavřít
          </Button>
          <Button
            type="button"
            disabled={disabled}
            className={cn("shrink-0", saveButtonClass)}
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
