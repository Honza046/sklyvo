"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, Rocket, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { processSingleLead } from "@/app/actions/generate";

export type AutopilotLead = {
  id: string;
  company: string;
  email: string;
  url: string;
};

type LeadRunStatus = "pending" | "processing" | "sent" | "error";

type LeadRunState = {
  status: LeadRunStatus;
  message?: string;
};

type AutopilotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: AutopilotLead[];
  onFinished?: () => void;
};

const STATUS_META: Record<
  LeadRunStatus,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  pending: { icon: Clock, className: "text-muted-foreground", label: "Ve frontě" },
  processing: { icon: Loader2, className: "text-amber-500", label: "Zpracovávám" },
  sent: { icon: CheckCircle2, className: "text-emerald-500", label: "Odesláno" },
  error: { icon: XCircle, className: "text-rose-500", label: "Chyba" },
};

export function AutopilotDialog({ open, onOpenChange, leads, onFinished }: AutopilotDialogProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [states, setStates] = useState<Record<string, LeadRunState>>({});

  // Reset stavu při novém otevření dialogu.
  useEffect(() => {
    if (open) {
      setStates(
        Object.fromEntries(leads.map((lead) => [lead.id, { status: "pending" as LeadRunStatus }])),
      );
      setHasRun(false);
      setIsRunning(false);
    }
  }, [open, leads]);

  const total = leads.length;
  const { processedCount, sentCount, errorCount } = useMemo(() => {
    let processed = 0;
    let sent = 0;
    let error = 0;
    for (const lead of leads) {
      const s = states[lead.id]?.status;
      if (s === "sent" || s === "error") processed += 1;
      if (s === "sent") sent += 1;
      if (s === "error") error += 1;
    }
    return { processedCount: processed, sentCount: sent, errorCount: error };
  }, [leads, states]);

  const progressValue = total > 0 ? (processedCount / total) * 100 : 0;

  const updateLead = (id: string, next: LeadRunState) => {
    setStates((prev) => ({ ...prev, [id]: next }));
  };

  const handleRun = async () => {
    if (isRunning || total === 0) return;
    setIsRunning(true);
    setHasRun(true);

    for (const lead of leads) {
      updateLead(lead.id, { status: "processing" });
      try {
        const result = await processSingleLead(lead.id);
        if ("error" in result) {
          updateLead(lead.id, { status: "error", message: result.error });
        } else {
          updateLead(lead.id, { status: "sent", message: `Předmět: ${result.subject}` });
        }
      } catch (e) {
        // Smyčka se nesmí zastavit — chybu zachytíme a jdeme na další firmu.
        const message = e instanceof Error ? e.message : "Neočekávaná chyba.";
        updateLead(lead.id, { status: "error", message });
      }
    }

    setIsRunning(false);
    onFinished?.();
  };

  const handleClose = (nextOpen: boolean) => {
    if (isRunning) return; // během běhu nezavírat
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600" />
            Autopilot kampaň
          </DialogTitle>
          <DialogDescription>
            Systém projde {total} {total === 1 ? "vybranou firmu" : "vybraných firem"}, pro každou
            zanalyzuje web, vygeneruje e-mail na míru a odešle ho na kontaktní adresu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                Zpracováno {processedCount} / {total}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-emerald-600">✓ {sentCount}</span>
                <span className="text-rose-600">✕ {errorCount}</span>
              </span>
            </div>
            <Progress value={progressValue} className="h-2.5 rounded-full" />
          </div>

          <div className="max-h-[280px] space-y-1.5 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-2">
            {leads.map((lead) => {
              const state = states[lead.id] ?? { status: "pending" as LeadRunStatus };
              const meta = STATUS_META[state.status];
              const Icon = meta.icon;
              return (
                <div
                  key={lead.id}
                  className="flex items-start gap-2.5 rounded-lg bg-card px-3 py-2 shadow-sm"
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      meta.className,
                      state.status === "processing" && "animate-spin",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{lead.company}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {state.message ?? lead.email ?? meta.label}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-bold uppercase tracking-widest",
                      meta.className,
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
            {leads.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nejsou vybrané žádné firmy.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isRunning}>
            {hasRun && !isRunning ? "Zavřít" : "Zrušit"}
          </Button>
          <Button
            type="button"
            onClick={() => void handleRun()}
            disabled={isRunning || total === 0 || (hasRun && processedCount === total)}
            className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Probíhá automatizace…
              </>
            ) : hasRun ? (
              "Spustit znovu"
            ) : (
              "Spustit automatizaci"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
