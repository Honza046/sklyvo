"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveOnboardingData } from "@/app/actions/workspace";
import {
  PREDEFINED_AUDIENCES,
  PREDEFINED_INDUSTRIES,
  PREDEFINED_SERVICES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Target,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VenegardWordmark } from "@/components/brand-marks";

const TONES = [
  { id: "friendly", label: "Přátelský a uvolněný", desc: "Působí lidsky, tyká nebo slušně vyká." },
  { id: "professional", label: "Formální a profi", desc: "Striktně byznysový, budí maximální respekt." },
  { id: "punchy", label: "Úderný a sebevědomý", desc: "Jde rovnou k věci, žádná zbytečná omáčka." },
];

export type OnboardingFormProps = {
  /** Používá se v modálním overlay na dashboardu (bez celostránkového pozadí). */
  embedded?: boolean;
  /** Po úspěšném uložení např. `router.refresh()` místo navigace na `/`. */
  onCompleted?: () => void | Promise<void>;
};

export function OnboardingForm({ embedded = false, onCompleted }: OnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    customIndustry: "",
    targetAudience: "",
    customTarget: "",
    tone: "professional",
    offeredServices: [] as string[],
    customService: "",
  });

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    const industry =
      formData.industry === "Jiné" ? formData.customIndustry.trim() : formData.industry;
    const targetAudience =
      formData.targetAudience === "Jiné"
        ? formData.customTarget.trim()
        : formData.targetAudience;

    setIsLoading(true);
    try {
      const result = await saveOnboardingData({
        companyName: formData.companyName.trim(),
        industry,
        targetAudience,
        defaultTone: formData.tone,
        offeredServices: formData.offeredServices,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Nastavení bylo uloženo. Vítejte v aplikaci.");
      if (onCompleted) {
        await onCompleted();
        return;
      }
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <>
      <div className="flex items-center justify-between px-2">
        <VenegardWordmark markSize={24} />
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step >= i ? "w-6 bg-blue-600" : "w-2 bg-border",
              )}
            />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-8 md:p-10 shadow-2xl flex flex-col min-h-[400px]">
        {step === 1 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl mb-2">
                Jak se jmenuje vaše firma?
              </h1>
              <p className="text-sm text-muted-foreground">
                Tento název bude umělá inteligence používat, když se bude představovat klientům.
              </p>
            </div>

            <div className="space-y-4 flex-1">
              <Input
                type="text"
                placeholder="např. Venegard s.r.o."
                className="h-14 rounded-xl bg-background border-border/50 text-lg px-5 focus-visible:ring-blue-600"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                autoFocus
              />
            </div>

            <div className="flex justify-end pt-6 mt-auto">
              <Button
                onClick={nextStep}
                disabled={!formData.companyName}
                className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold group"
              >
                Pokračovat{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4">
                <Briefcase className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl mb-2">
                V čem přesně podnikáte?
              </h1>
              <p className="text-sm text-muted-foreground">
                Vyberte, co nejlépe vystihuje váš obor, nebo napište vlastní.
              </p>
            </div>

            <div className="flex-1 space-y-6">
              <div className="flex flex-wrap gap-2.5">
                {PREDEFINED_INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setFormData({ ...formData, industry: ind, customIndustry: "" })}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                      formData.industry === ind
                        ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                        : "bg-background border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {ind}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, industry: "Jiné" })}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                    formData.industry === "Jiné"
                      ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                      : "bg-background border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  Něco jiného...
                </button>
              </div>

              {formData.industry === "Jiné" && (
                <Input
                  type="text"
                  placeholder="Napište svůj obor..."
                  className="h-12 rounded-xl bg-background border-border/50 focus-visible:ring-blue-600 animate-in fade-in"
                  value={formData.customIndustry}
                  onChange={(e) => setFormData({ ...formData, customIndustry: e.target.value })}
                  autoFocus
                />
              )}

              <div className="pt-2 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Jaké služby nabízíte?
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {PREDEFINED_SERVICES.map((service) => {
                    const selected = formData.offeredServices.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            offeredServices: selected
                              ? prev.offeredServices.filter((item) => item !== service)
                              : [...prev.offeredServices, service],
                          }))
                        }
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                          selected
                            ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                            : "bg-background border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Přidat vlastní službu..."
                    className="h-11 rounded-xl bg-background border-border/50"
                    value={formData.customService}
                    onChange={(e) => setFormData({ ...formData, customService: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const custom = formData.customService.trim();
                      if (!custom) return;
                      if (formData.offeredServices.includes(custom)) {
                        setFormData({ ...formData, customService: "" });
                        return;
                      }
                      setFormData((prev) => ({
                        ...prev,
                        offeredServices: [...prev.offeredServices, custom],
                        customService: "",
                      }));
                    }}
                    className="h-11 rounded-xl"
                  >
                    Přidat
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 mt-auto">
              <Button
                variant="ghost"
                type="button"
                onClick={prevStep}
                className="h-12 px-4 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
              </Button>
              <Button
                type="button"
                onClick={nextStep}
                disabled={
                  !formData.industry ||
                  (formData.industry === "Jiné" && !formData.customIndustry) ||
                  formData.offeredServices.length === 0
                }
                className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold group"
              >
                Pokračovat{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl mb-4">
                <Target className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl mb-2">
                Kdo je váš ideální klient?
              </h1>
              <p className="text-sm text-muted-foreground">
                Komu nejčastěji prodáváte? Komu mají být e-maily adresovány?
              </p>
            </div>

            <div className="flex-1 space-y-6">
              <div className="flex flex-wrap gap-2.5">
                {PREDEFINED_AUDIENCES.map((tgt) => (
                  <button
                    key={tgt}
                    type="button"
                    onClick={() => setFormData({ ...formData, targetAudience: tgt, customTarget: "" })}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                      formData.targetAudience === tgt
                        ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                        : "bg-background border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {tgt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, targetAudience: "Jiné" })}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                    formData.targetAudience === "Jiné"
                      ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                      : "bg-background border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  Někdo jiný...
                </button>
              </div>

              {formData.targetAudience === "Jiné" && (
                <Input
                  type="text"
                  placeholder="Např. Majitelé malých eshopů s obratem do 5M..."
                  className="h-12 rounded-xl bg-background border-border/50 focus-visible:ring-blue-600 animate-in fade-in"
                  value={formData.customTarget}
                  onChange={(e) => setFormData({ ...formData, customTarget: e.target.value })}
                  autoFocus
                />
              )}
            </div>

            <div className="flex justify-between pt-6 mt-auto">
              <Button
                variant="ghost"
                type="button"
                onClick={prevStep}
                className="h-12 px-4 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
              </Button>
              <Button
                type="button"
                onClick={nextStep}
                disabled={
                  !formData.targetAudience ||
                  (formData.targetAudience === "Jiné" && !formData.customTarget)
                }
                className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold group"
              >
                Poslední krok{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl mb-2">
                Jaký je váš tón komunikace?
              </h1>
              <p className="text-sm text-muted-foreground">
                Vyberte výchozí styl, kterým bude AI psát vaše zprávy (vždy to pak jde změnit).
              </p>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-3">
              {TONES.map((toneOption) => (
                <button
                  key={toneOption.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, tone: toneOption.id })}
                  className={cn(
                    "flex items-start text-left gap-4 p-4 rounded-2xl border transition-all",
                    formData.tone === toneOption.id
                      ? "bg-blue-50 border-blue-600 dark:bg-blue-900/20 shadow-sm"
                      : "bg-background border-border/60 hover:border-blue-300 dark:hover:border-blue-800",
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors",
                      formData.tone === toneOption.id ? "border-blue-600 bg-blue-600" : "border-muted-foreground/30",
                    )}
                  >
                    {formData.tone === toneOption.id && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <h3
                      className={cn(
                        "font-bold text-sm",
                        formData.tone === toneOption.id ? "text-blue-700 dark:text-blue-400" : "text-foreground",
                      )}
                    >
                      {toneOption.label}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{toneOption.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-6 mt-auto">
              <Button
                variant="ghost"
                type="button"
                onClick={prevStep}
                disabled={isLoading}
                className="h-12 px-4 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isLoading}
                className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold group shadow-md"
              >
                {isLoading ? "Ukládám..." : "Dokončit a spustit"}
                {!isLoading && <Sparkles className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="relative z-10 w-full max-w-[600px] flex flex-col gap-6">{content}</div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-muted/20 dark:bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-[600px] flex flex-col gap-6 relative z-10 py-10">
        {content}
      </div>
    </div>
  );
}
