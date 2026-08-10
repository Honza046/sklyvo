"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveOnboardingData } from "@/app/actions/workspace";
import {
  ONBOARDING_SERVICES,
  PREDEFINED_AUDIENCES,
  PREDEFINED_INDUSTRIES,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Target,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Check,
  Globe2,
  PenLine,
  FileSignature,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SklyvoWordmark } from "@/components/brand-marks";

const TONES = [
  {
    id: "friendly",
    label: "Přátelský a uvolněný",
    desc: "Působí lidsky, tyká nebo slušně vyká.",
  },
  {
    id: "professional",
    label: "Formální a profi",
    desc: "Striktně byznysový, budí maximální respekt.",
  },
  {
    id: "punchy",
    label: "Úderný a sebevědomý",
    desc: "Jde rovnou k věci, žádná zbytečná omáčka.",
  },
];

const TOTAL_STEPS = 7;

export type OnboardingFormProps = {
  /** Používá se v modálním overlay na dashboardu (bez celostránkového pozadí). */
  embedded?: boolean;
  /** Po úspěšném uložení např. `router.refresh()` místo navigace na `/`. */
  onCompleted?: () => void | Promise<void>;
  /** Simulace: neukládá do DB, jen projde kroky. */
  preview?: boolean;
};

export function OnboardingForm({
  embedded = false,
  onCompleted,
  preview = false,
}: OnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    companyWebsite: "",
    industry: "",
    customIndustry: "",
    targetAudience: "",
    customTarget: "",
    tone: "professional",
    offeredServices: [] as string[],
    customService: "",
    showCustomService: false,
    companyContext: "",
    emailSignature: "",
  });

  const nextStep = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    const industry =
      formData.industry === "Jiné"
        ? formData.customIndustry.trim()
        : formData.industry;
    const targetAudience =
      formData.targetAudience === "Jiné"
        ? formData.customTarget.trim()
        : formData.targetAudience;

    if (preview) {
      toast.success(
        "Náhled hotov. Data se neuložila. Až bude flow OK, vypneme preview.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await saveOnboardingData({
        companyName: formData.companyName.trim(),
        companyWebsite: formData.companyWebsite.trim(),
        industry,
        targetAudience,
        defaultTone: formData.tone,
        offeredServices: formData.offeredServices,
        companyContext: formData.companyContext.trim(),
        emailSignature: formData.emailSignature.trim(),
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Nastavení bylo uloženo. Vítejte v aplikaci.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sklyvo-company-onboarding-done"));
      }
      if (onCompleted) {
        await onCompleted();
        return;
      }
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const stepDots = (
    <div className="flex gap-1.5">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            step >= i
              ? "w-5 sk-onboarding__dot-active"
              : "w-2 sk-onboarding__dot-idle",
          )}
        />
      ))}
    </div>
  );

  const content = (
    <>
      <div className="flex items-center justify-between px-2">
        <SklyvoWordmark markSize={24} />
        {stepDots}
      </div>

      <div className="sk-onboarding__card">
        {step === 1 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="sk-onboarding__icon">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Jak se jmenuje vaše firma?</h1>
              <p className="text-sm text-muted-foreground">
                Název uvidíte v aplikaci. V e-mailech se spíš představujete jako
                člověk. Firma patří hlavně do podpisu.
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <Input
                type="text"
                placeholder="např. Sklyvo s.r.o."
                className="h-14 px-5 text-lg"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!formData.companyName.trim()) {
                      toast.error("Nejdřív vyplňte název firmy.");
                      return;
                    }
                    nextStep();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="mt-auto flex justify-end pt-6">
              <Button
                type="button"
                onClick={() => {
                  if (!formData.companyName.trim()) {
                    toast.error("Nejdřív vyplňte název firmy.");
                    return;
                  }
                  nextStep();
                }}
                className="sk-onboarding__cta group"
              >
                Pokračovat{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="sk-onboarding__icon">
                <Globe2 className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Máte web?</h1>
              <p className="text-sm text-muted-foreground">
                Volitelné. Pomůže lépe pochopit, co nabízíte, a může se použít i
                v podpisu.
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <Input
                type="url"
                placeholder="https://vasefirma.cz"
                className="h-14 px-5 text-lg"
                value={formData.companyWebsite}
                onChange={(e) =>
                  setFormData({ ...formData, companyWebsite: e.target.value })
                }
                autoFocus
              />
            </div>

            <div className="mt-auto flex justify-between pt-6">
              <Button
                variant="ghost"
                type="button"
                onClick={prevStep}
                className="h-12 px-4 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={nextStep}
                  className="h-12 rounded-xl px-5"
                >
                  Přeskočit
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="sk-onboarding__cta group"
                >
                  Pokračovat{" "}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="sk-onboarding__icon">
                <Briefcase className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">V čem podnikáte?</h1>
              <p className="text-sm text-muted-foreground">
                Vyberte obor, nebo napište vlastní.
              </p>
            </div>

            <div className="flex-1 space-y-6">
              <div className="flex flex-wrap gap-2.5">
                {PREDEFINED_INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        industry: ind,
                        customIndustry: "",
                      })
                    }
                    className={cn(
                      "sk-onboarding__chip px-4 py-2.5 text-sm",
                      formData.industry === ind && "is-active",
                    )}
                  >
                    {ind}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, industry: "Jiné" })}
                  className={cn(
                    "sk-onboarding__chip px-4 py-2.5 text-sm",
                    formData.industry === "Jiné" && "is-active",
                  )}
                >
                  Něco jiného...
                </button>
              </div>

              {formData.industry === "Jiné" && (
                <Input
                  type="text"
                  placeholder="Napište svůj obor..."
                  className="h-12 animate-in rounded-xl fade-in"
                  value={formData.customIndustry}
                  onChange={(e) =>
                    setFormData({ ...formData, customIndustry: e.target.value })
                  }
                  autoFocus
                />
              )}
            </div>

            <div className="mt-auto flex justify-between pt-6">
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
                  (formData.industry === "Jiné" &&
                    !formData.customIndustry.trim())
                }
                className="sk-onboarding__cta group"
              >
                Pokračovat{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <div className="sk-onboarding__icon">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Co nabízíte klientům?</h1>
              <p className="text-sm text-muted-foreground">
                Vyberte jednu nebo více možností. Podle toho se v e-mailech
                nabídne to správné.
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_SERVICES.map((service) => {
                  const selected = formData.offeredServices.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          offeredServices: selected
                            ? prev.offeredServices.filter(
                                (item) => item !== service,
                              )
                            : [...prev.offeredServices, service],
                        }))
                      }
                      className={cn(
                        "sk-onboarding__chip px-3.5 py-2 text-sm",
                        selected && "is-active",
                      )}
                    >
                      {service}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      showCustomService: !prev.showCustomService,
                      customService: prev.showCustomService
                        ? ""
                        : prev.customService,
                    }))
                  }
                  className={cn(
                    "sk-onboarding__chip px-3.5 py-2 text-sm",
                    formData.showCustomService && "is-active",
                  )}
                >
                  Něco jiného...
                </button>
              </div>

              {formData.showCustomService && (
                <div className="flex gap-2 animate-in fade-in">
                  <Input
                    type="text"
                    placeholder="Napište vlastní službu a potvrďte Přidat..."
                    className="h-11 px-4"
                    value={formData.customService}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customService: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const custom = formData.customService.trim();
                      if (!custom) return;
                      setFormData((prev) => ({
                        ...prev,
                        offeredServices: prev.offeredServices.includes(custom)
                          ? prev.offeredServices
                          : [...prev.offeredServices, custom],
                        customService: "",
                      }));
                    }}
                    autoFocus
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
              )}

              {formData.offeredServices.some(
                (s) => !(ONBOARDING_SERVICES as readonly string[]).includes(s),
              ) && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.offeredServices
                    .filter(
                      (s) =>
                        !(ONBOARDING_SERVICES as readonly string[]).includes(s),
                    )
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            offeredServices: prev.offeredServices.filter(
                              (item) => item !== s,
                            ),
                          }))
                        }
                        className="sk-onboarding__chip is-active rounded-lg px-2.5 py-1 text-xs"
                        title="Kliknutím odeberete"
                      >
                        {s} ×
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-auto flex justify-between pt-6">
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
                disabled={formData.offeredServices.length === 0}
                className="sk-onboarding__cta group"
              >
                Pokračovat{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <div className="sk-onboarding__icon">
                <Target className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Kdo je váš ideální klient?</h1>
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
                    onClick={() =>
                      setFormData({
                        ...formData,
                        targetAudience: tgt,
                        customTarget: "",
                      })
                    }
                    className={cn(
                      "sk-onboarding__chip px-4 py-2.5 text-sm",
                      formData.targetAudience === tgt && "is-active",
                    )}
                  >
                    {tgt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, targetAudience: "Jiné" })
                  }
                  className={cn(
                    "sk-onboarding__chip px-4 py-2.5 text-sm",
                    formData.targetAudience === "Jiné" && "is-active",
                  )}
                >
                  Někdo jiný...
                </button>
              </div>

              {formData.targetAudience === "Jiné" && (
                <Input
                  type="text"
                  placeholder="Např. Majitelé malých eshopů s obratem do 5M..."
                  className="h-12 animate-in rounded-xl fade-in"
                  value={formData.customTarget}
                  onChange={(e) =>
                    setFormData({ ...formData, customTarget: e.target.value })
                  }
                  autoFocus
                />
              )}
            </div>

            <div className="mt-auto flex justify-between pt-6">
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
                  (formData.targetAudience === "Jiné" &&
                    !formData.customTarget.trim())
                }
                className="sk-onboarding__cta group"
              >
                Pokračovat{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <div className="sk-onboarding__icon">
                <PenLine className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Jak o sobě mluvíte?</h1>
              <p className="text-sm text-muted-foreground">
                Krátce napište, jak o sobě mluvíte, v 1. osobě, bez „My ve
                firmě…“. Tohle nejvíc ovlivní, jak budou znít vaše e-maily.
              </p>
            </div>

            <div className="flex-1 space-y-3">
              <Textarea
                value={formData.companyContext}
                onChange={(e) =>
                  setFormData({ ...formData, companyContext: e.target.value })
                }
                placeholder="Např. Pomáhám firmám s redesignem a tvorbou webů na míru. Při zájmu i automatizace. Fixní nabídka, projekty bez šablon."
                className="min-h-[160px] resize-y text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Tip: napište co děláte, pro koho, a čím jste jiní. Sklyvo /
                název firmy nechte do podpisu.
              </p>
            </div>

            <div className="mt-auto flex justify-between pt-6">
              <Button
                variant="ghost"
                type="button"
                onClick={prevStep}
                className="h-12 px-4 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Zpět
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={nextStep}
                  className="h-12 rounded-xl px-5"
                >
                  Přeskočit
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="sk-onboarding__cta group"
                >
                  Pokračovat{" "}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <div className="sk-onboarding__icon">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Tón a podpis</h1>
              <p className="text-sm text-muted-foreground">
                Výchozí styl e-mailů + jak se podepisujete. Obé jde později
                změnit v nastavení.
              </p>
            </div>

            <div className="flex-1 space-y-5">
              <div className="grid grid-cols-1 gap-2.5">
                {TONES.map((toneOption) => (
                  <button
                    key={toneOption.id}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, tone: toneOption.id })
                    }
                    className={cn(
                      "sk-onboarding__chip flex items-start gap-4 p-3.5 text-left",
                      formData.tone === toneOption.id && "is-active",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        formData.tone === toneOption.id
                          ? "border-transparent bg-white/25"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {formData.tone === toneOption.id && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-sm font-bold",
                          formData.tone === toneOption.id
                            ? "text-white"
                            : "text-foreground",
                        )}
                      >
                        {toneOption.label}
                      </h3>
                      <p
                        className={cn(
                          "mt-0.5 text-xs",
                          formData.tone === toneOption.id
                            ? "text-white/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {toneOption.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <FileSignature className="h-3.5 w-3.5" />
                  Podpis e-mailu (volitelné)
                </div>
                <Textarea
                  value={formData.emailSignature}
                  onChange={(e) =>
                    setFormData({ ...formData, emailSignature: e.target.value })
                  }
                  placeholder={"S pozdravem,\n\nJan Novák\n\nwww.vasefirma.cz"}
                  className="min-h-[110px] resize-y font-mono text-sm"
                />
              </div>
            </div>

            <div className="mt-auto flex justify-between pt-6">
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
                className="sk-onboarding__cta group"
              >
                {isLoading
                  ? "Ukládám..."
                  : preview
                    ? "Dokončit náhled"
                    : "Dokončit a spustit"}
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
      <div className="sk-onboarding relative z-10 flex w-full max-w-[600px] flex-col gap-6">
        {content}
      </div>
    );
  }

  return (
    <div className="sk-onboarding relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden p-4">
      <div className="sk-onboarding__gate absolute inset-0" />
      <div className="relative z-10 flex w-full max-w-[600px] flex-col gap-6 py-10">
        {content}
      </div>
    </div>
  );
}
