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
    description:
      "Plánovač a pravidla pro automatické vyhledávání firem. Projeví se při příštím běhu Radaru.",
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

  const toggleRadarDay = (day: number) => {
    const next = settings.radarDays.includes(day)
      ? settings.radarDays.filter((value) => value !== day)
      : [...settings.radarDays, day].sort((a, b) => {
          const order = [1, 2, 3, 4, 5, 6, 0];
          return order.indexOf(a) - order.indexOf(b);
        });
    patch({ radarDays: next });
  };

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
          section === "radar" ? "max-w-3xl" : "max-w-xl",
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Dny v týdnu</Label>
                <div className="flex flex-wrap gap-1.5">
                  {RADAR_WEEKDAYS.map(({ value, label }) => {
                    const active = settings.radarDays.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleRadarDay(value)}
                        disabled={disabled}
                        className={cn(
                          "h-8 min-w-8 rounded-md border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50",
                          active
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="radar-run-time" className="text-xs">
                  Preferovaný čas spuštění
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

              <div className="space-y-1.5">
                <Label htmlFor="radar-max-companies" className="text-xs">
                  Maximální počet firem na jeden běh
                </Label>
                <Input
                  id="radar-max-companies"
                  type="number"
                  min={1}
                  value={settings.maxCompaniesPerRun}
                  onChange={(e) =>
                    patch({ maxCompaniesPerRun: Math.max(1, Number(e.target.value) || 1) })
                  }
                  disabled={disabled}
                  className="h-9"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-start-outreach" className="text-sm text-foreground">
                    Automaticky zahájit oslovení
                  </Label>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Po nalezení nových firem je rovnou zařadí do fronty Sniperu.
                  </p>
                </div>
                <Switch
                  id="auto-start-outreach"
                  checked={settings.autoStartOutreach}
                  onCheckedChange={(checked) => patch({ autoStartOutreach: checked })}
                  disabled={disabled}
                  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-input"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="radar-industries" className="text-xs">
                  Cílové obory
                </Label>
                <Textarea
                  id="radar-industries"
                  rows={3}
                  placeholder="např. marketingová agentura, webové studio, účetní firma"
                  value={settings.targetIndustries}
                  onChange={(e) => patch({ targetIndustries: e.target.value })}
                  disabled={disabled}
                  className="min-h-[72px] resize-none text-sm"
                />
                <p className="text-[11px] text-muted-foreground">Odděluje se čárkou.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="radar-locations" className="text-xs">
                  Lokality
                </Label>
                <Textarea
                  id="radar-locations"
                  rows={3}
                  placeholder="např. Praha, Brno, Ostrava"
                  value={settings.locations}
                  onChange={(e) => patch({ locations: e.target.value })}
                  disabled={disabled}
                  className="min-h-[72px] resize-none text-sm"
                />
                <p className="text-[11px] text-muted-foreground">Odděluje se čárkou.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Velikost firmy</Label>
                <Select
                  value={settings.companySize}
                  onValueChange={(value) => patch({ companySize: value as RadarCompanySize })}
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
