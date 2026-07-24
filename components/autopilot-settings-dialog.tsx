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
    description: "Kdy se maily odesílají a kolik najednou. Generování běží hned — odeslání podle těchto pravidel.",
    icon: Rocket,
    iconClass: "text-blue-600",
  },
  "full-auto": {
    title: "Nastavení Full Auto",
    description: "Jak často spustit celou smyčku: Radar najde firmy → Sniper je osloví.",
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
          "flex w-full flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl",
          section === "radar"
            ? "max-h-[min(92vh,640px)] max-w-4xl"
            : section === "sniper"
              ? "max-h-[min(92vh,560px)] max-w-3xl"
              : "max-h-[min(92vh,480px)] max-w-xl",
        )}
      >
        <div
          className={cn(
            "min-h-0 flex-1 space-y-3 px-6 pb-3 pt-9",
            "overflow-hidden",
          )}
        >
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 pr-10 text-base">
              <SectionIcon className={cn("h-5 w-5 shrink-0", meta.iconClass)} />
              {meta.title}
            </DialogTitle>
            <DialogDescription className="text-xs">{meta.description}</DialogDescription>
          </DialogHeader>

        {section === "radar" && (
          <div className="grid gap-3 md:grid-cols-2">
            <section className="flex flex-col rounded-xl border border-border/60 bg-muted/15">
              <div className="border-b border-border/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  1 · Kdy hledat
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm">Dny</Label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => patch({ radarDays: [...WEEKDAY_VALUES] })}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50",
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
                          "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50",
                          isAllWeek
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                      >
                        Celý týden
                      </button>
                    </div>
                  </div>
                  <div className="flex rounded-lg bg-muted/60 p-0.5">
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
                            "h-8 flex-1 rounded-md text-xs font-semibold transition-all disabled:opacity-50",
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="radar-run-time" className="text-sm">
                      Čas
                    </Label>
                    <Input
                      id="radar-run-time"
                      type="time"
                      value={settings.radarRunTime}
                      onChange={(e) => patch({ radarRunTime: e.target.value })}
                      disabled={disabled}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
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
                      className="h-9"
                    />
                  </div>
                </div>

                {settings.radarDays.length > 0 ? (
                  <p className="mt-auto rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-snug text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {radarDayLabels} · na Vercelu kolem 03:00 · až {settings.maxCompaniesPerRun}{" "}
                    firem / den
                  </p>
                ) : (
                  <p className="mt-auto rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    Vyber alespoň jeden den, jinak se sběr nespustí.
                  </p>
                )}
              </div>
            </section>

            <div className="flex flex-col gap-3">
              <section className="flex flex-1 flex-col rounded-xl border border-border/60 bg-muted/15">
                <div className="border-b border-border/50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    2 · Koho hledat
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 p-3">
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="radar-industries" className="text-sm">
                        Obory
                      </Label>
                      <span className="text-[10px] text-muted-foreground">odděl čárkou</span>
                    </div>
                    <Textarea
                      id="radar-industries"
                      rows={2}
                      placeholder="marketingová agentura, webové studio…"
                      value={settings.targetIndustries}
                      onChange={(e) => patch({ targetIndustries: e.target.value })}
                      disabled={disabled}
                      className="min-h-[52px] resize-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="radar-locations" className="text-sm">
                        Města / regiony
                      </Label>
                      <span className="text-[10px] text-muted-foreground">odděl čárkou</span>
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

              <section className="rounded-xl border border-border/60 bg-muted/15">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <Label htmlFor="auto-start-outreach" className="text-sm text-foreground">
                      3 · Rovnou odesílat
                    </Label>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      Vypnuto = jen uloží do CRM. Zapni, až budeš chtít rovnou generovat a posílat.
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
          </div>
        )}

        {section === "sniper" && (
          <div className="space-y-3">
            <section className="overflow-hidden rounded-xl border border-border/60 bg-muted/15">
              <div className="border-b border-border/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  1 · Jak odesílat
                </p>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {(
                  [
                    {
                      id: "batch" as const,
                      title: "V časových oknech",
                      hint: "Odesílá jen v nastavených hodinách — bezpečnější tempo.",
                    },
                    {
                      id: "immediate" as const,
                      title: "Hned po vygenerování",
                      hint: "Zařadí do fronty ihned, bez čekání na okna.",
                    },
                  ] satisfies { id: SendingStrategy; title: string; hint: string }[]
                ).map((option) => {
                  const active = settings.sendingStrategy === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => patch({ sendingStrategy: option.id })}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-all disabled:opacity-50",
                        active
                          ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-600 dark:bg-blue-950/40"
                          : "border-border/60 bg-background hover:bg-muted/40",
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          active ? "text-blue-700 dark:text-blue-300" : "text-foreground",
                        )}
                      >
                        {option.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {option.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {settings.sendingStrategy === "batch" ? (
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <section className="rounded-xl border border-border/60 bg-muted/15">
                  <div className="border-b border-border/50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      2 · Časová okna
                    </p>
                  </div>
                  <div className="grid gap-2 p-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/40 bg-background/80 p-2.5">
                      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                        Ráno / dopoledne
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="modal-window1-start" className="text-xs">
                            Od
                          </Label>
                          <Input
                            id="modal-window1-start"
                            type="time"
                            value={settings.window1Start}
                            onChange={(e) => patch({ window1Start: e.target.value })}
                            disabled={disabled}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="modal-window1-end" className="text-xs">
                            Do
                          </Label>
                          <Input
                            id="modal-window1-end"
                            type="time"
                            value={settings.window1End}
                            onChange={(e) => patch({ window1End: e.target.value })}
                            disabled={disabled}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/80 p-2.5">
                      <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                        Odpoledne (volitelné)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="modal-window2-start" className="text-xs">
                            Od
                          </Label>
                          <Input
                            id="modal-window2-start"
                            type="time"
                            value={settings.window2Start}
                            onChange={(e) => patch({ window2Start: e.target.value })}
                            disabled={disabled}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="modal-window2-end" className="text-xs">
                            Do
                          </Label>
                          <Input
                            id="modal-window2-end"
                            type="time"
                            value={settings.window2End}
                            onChange={(e) => patch({ window2End: e.target.value })}
                            disabled={disabled}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="flex min-w-[180px] flex-col rounded-xl border border-border/60 bg-muted/15">
                  <div className="border-b border-border/50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      3 · Tempo
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="space-y-1">
                      <Label htmlFor="modal-max-batch" className="text-sm">
                        Max. na dávku
                      </Label>
                      <Input
                        id="modal-max-batch"
                        type="number"
                        min={1}
                        max={500}
                        value={settings.maxEmailsPerBatch}
                        onChange={(e) =>
                          patch({
                            maxEmailsPerBatch: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        disabled={disabled}
                        className="h-9"
                      />
                    </div>
                    <p className="mt-auto rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] leading-snug text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                      {settings.window1Start}–{settings.window1End}
                      {settings.window2Start && settings.window2End
                        ? ` · ${settings.window2Start}–${settings.window2End}`
                        : ""}{" "}
                      · až {settings.maxEmailsPerBatch} e-mailů
                    </p>
                  </div>
                </section>
              </div>
            ) : (
              <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                E-maily se odešlou hned po vygenerování. Časová okna a limity dávky se teď
                nepoužívají.
              </p>
            )}
          </div>
        )}

        {section === "full-auto" && (
          <div className="space-y-3">
            <section className="rounded-xl border border-border/60 bg-muted/15">
              <div className="border-b border-border/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  1 · Jak často
                </p>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-3">
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
                  ] satisfies { id: FullAutoFrequency; title: string; hint: string }[]
                ).map((option) => {
                  const active = settings.fullAutoFrequency === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => patch({ fullAutoFrequency: option.id })}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-all disabled:opacity-50",
                        active
                          ? "border-violet-500 bg-violet-50 shadow-sm dark:border-violet-600 dark:bg-violet-950/40"
                          : "border-border/60 bg-background hover:bg-muted/40",
                      )}
                    >
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          active ? "text-violet-700 dark:text-violet-300" : "text-foreground",
                        )}
                      >
                        {option.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{option.hint}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-border/60 bg-muted/15">
              <div className="border-b border-border/50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  2 · V kolik hodin
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3 p-3">
                <div className="w-36 space-y-1">
                  <Label htmlFor="full-auto-run-time" className="text-sm">
                    Čas spuštění
                  </Label>
                  <Input
                    id="full-auto-run-time"
                    type="time"
                    value={settings.fullAutoRunTime}
                    onChange={(e) => patch({ fullAutoRunTime: e.target.value })}
                    disabled={disabled}
                    className="h-9"
                  />
                </div>
                <p className="min-w-0 flex-1 rounded-lg bg-violet-50 px-3 py-2 text-xs leading-snug text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                  Full Auto na Vercelu kolem 08:00 Praha ({FULL_AUTO_FREQUENCY_LABELS[settings.fullAutoFrequency].toLowerCase()})
                  — nejdřív Radar, pak odeslání.
                </p>
              </div>
            </section>
          </div>
        )}
        </div>

        <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-border/60 bg-background px-6 py-3 sm:flex-row sm:space-x-0">
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
