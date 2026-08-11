"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveOnboardingData } from "@/app/actions/workspace";
import { analyzeCompanyWebsite } from "@/app/actions/onboarding-analyze";
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
  Loader2,
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

const TOTAL_STEPS = 4;

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fromWebsite, setFromWebsite] = useState(false);
  const [analysisSummary, setAnalysisSummary] = useState("");

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

  const resolvedIndustry =
    formData.industry === "Jiné"
      ? formData.customIndustry.trim()
      : formData.industry;
  const resolvedAudience =
    formData.targetAudience === "Jiné"
      ? formData.customTarget.trim()
      : formData.targetAudience;

  const continueFromIdentity = async () => {
    if (!formData.companyName.trim()) {
      toast.error("Nejdřív vyplňte název firmy.");
      return;
    }

    const website = formData.companyWebsite.trim();
    if (!website) {
      setFromWebsite(false);
      setAnalysisSummary("");
      nextStep();
      return;
    }

    if (preview) {
      setFromWebsite(true);
      setAnalysisSummary("Náhled: analýza webu by tady předvyplnila profil.");
      setFormData((prev) => ({
        ...prev,
        industry: prev.industry || "IT a vývoj",
        offeredServices:
          prev.offeredServices.length > 0
            ? prev.offeredServices
            : ["Redesign a tvorba webů", "Automatizace procesů"],
        targetAudience: prev.targetAudience || "Majitelé firem (CEO)",
        companyContext:
          prev.companyContext ||
          "Pomáháme firmám s digitálními projekty na míru. Zaměřujeme se na jasný výsledek bez zbytečné omáčky.",
      }));
      nextStep();
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeCompanyWebsite({
        website,
        companyName: formData.companyName.trim(),
      });

      if ("error" in result) {
        toast.error(result.error);
        setFromWebsite(false);
        nextStep();
        return;
      }

      const { analysis } = result;
      setFromWebsite(true);
      setAnalysisSummary(analysis.summary);
      setFormData((prev) => ({
        ...prev,
        companyName:
          prev.companyName.trim() ||
          analysis.companyNameHint ||
          prev.companyName,
        companyWebsite: analysis.normalizedWebsite || prev.companyWebsite,
        industry: analysis.industry,
        customIndustry: analysis.customIndustry,
        offeredServices: analysis.offeredServices,
        targetAudience: analysis.targetAudience,
        customTarget: analysis.customTarget,
        companyContext: analysis.companyContext,
      }));
      toast.success("Web jsme prošli a připravili osobní návrh.");
      nextStep();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!resolvedIndustry) {
      toast.error("Vyberte nebo doplňte obor.");
      setStep(2);
      return;
    }
    if (formData.offeredServices.length === 0) {
      toast.error("Vyberte aspoň jednu službu nebo tag.");
      setStep(2);
      return;
    }
    if (!resolvedAudience) {
      toast.error("Vyberte nebo doplňte ideálního klienta.");
      setStep(2);
      return;
    }

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
        industry: resolvedIndustry,
        targetAudience: resolvedAudience,
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
    <div className="flex gap-1.5" aria-hidden>
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
      <div className="sk-onboarding__brand">
        <SklyvoWordmark
          markSize={30}
          markClassName="text-[var(--sk-brand)]"
          textClassName="text-[15px] tracking-[0.22em] text-[color:var(--sk-ink)]"
        />
        {stepDots}
      </div>

      <div className="sk-onboarding__card relative">
        {isAnalyzing && (
          <div className="sk-onboarding__analyzing" role="status" aria-live="polite">
            <div className="sk-onboarding__analyzing-orb">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--sk-brand)]" />
            </div>
            <p className="sk-type-h3 mt-4">Procházíme váš web</p>
            <p className="mt-1.5 max-w-xs text-center text-sm text-muted-foreground">
              Z obsahu připravíme obor, tagy služeb a text o vás — všechno pak
              můžete upravit.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-7">
              <div className="sk-onboarding__icon">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Představte svou firmu</h1>
              <p className="text-sm text-muted-foreground">
                Název uvidíte v aplikaci. Web nám pomůže všechno personalizovat
                — obor, tagy i to, jak o sobě mluvíte.
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <label className="block space-y-2">
                <span className="sk-onboarding__field-label">Název firmy</span>
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
                      void continueFromIdentity();
                    }
                  }}
                  autoFocus
                  disabled={isAnalyzing}
                />
              </label>

              <label className="block space-y-2">
                <span className="sk-onboarding__field-label">
                  Web <span className="font-normal normal-case tracking-normal text-muted-foreground">(doporučeno)</span>
                </span>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="vasefirma.cz"
                    className="h-14 pl-11 pr-5 text-base"
                    value={formData.companyWebsite}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyWebsite: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void continueFromIdentity();
                      }
                    }}
                    disabled={isAnalyzing}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Když web zadáte, připravíme návrh na míru. Bez webu vyplníte
                  profil ručně.
                </p>
              </label>
            </div>

            <div className="mt-auto flex justify-end pt-6">
              <Button
                type="button"
                onClick={() => void continueFromIdentity()}
                disabled={isAnalyzing}
                className="sk-onboarding__cta group"
              >
                {formData.companyWebsite.trim()
                  ? "Analyzovat a pokračovat"
                  : "Pokračovat"}{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-5">
              <div className="sk-onboarding__icon">
                <Briefcase className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">
                {fromWebsite ? "Návrh podle webu" : "Váš profil"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {fromWebsite
                  ? "Upravte, co nesedí. Obor, služby a ideální klient ovlivní e-maily i Autopilot."
                  : "Vyberte obor, služby/tagy a ideálního klienta."}
              </p>
              {fromWebsite && analysisSummary ? (
                <div className="sk-onboarding__insight mt-4">
                  <Sparkles className="h-4 w-4 shrink-0 text-[var(--sk-brand)]" />
                  <p>{analysisSummary}</p>
                </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-1">
              <section className="space-y-2.5">
                <h2 className="sk-onboarding__field-label">Obor</h2>
                <div className="flex flex-wrap gap-2">
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
                        "sk-onboarding__chip px-3.5 py-2 text-sm",
                        formData.industry === ind && "is-active",
                      )}
                    >
                      {ind}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, industry: "Jiné" })
                    }
                    className={cn(
                      "sk-onboarding__chip px-3.5 py-2 text-sm",
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
                      setFormData({
                        ...formData,
                        customIndustry: e.target.value,
                      })
                    }
                    autoFocus
                  />
                )}
              </section>

              <section className="space-y-2.5">
                <h2 className="sk-onboarding__field-label">Služby a tagy</h2>
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Set([
                      ...ONBOARDING_SERVICES,
                      ...formData.offeredServices,
                    ]),
                  ).map((service) => {
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
                      }))
                    }
                    className={cn(
                      "sk-onboarding__chip px-3.5 py-2 text-sm",
                      formData.showCustomService && "is-active",
                    )}
                  >
                    + Vlastní
                  </button>
                </div>
                {formData.showCustomService && (
                  <div className="flex gap-2 animate-in fade-in">
                    <Input
                      type="text"
                      placeholder="Vlastní služba / tag…"
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
                        setFormData((prev) => ({
                          ...prev,
                          offeredServices: prev.offeredServices.includes(custom)
                            ? prev.offeredServices
                            : [...prev.offeredServices, custom],
                          customService: "",
                        }));
                      }}
                      className="h-11 rounded-xl"
                    >
                      Přidat
                    </Button>
                  </div>
                )}
              </section>

              <section className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <h2 className="sk-onboarding__field-label mb-0">
                    Ideální klient
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
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
                        "sk-onboarding__chip px-3.5 py-2 text-sm",
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
                      "sk-onboarding__chip px-3.5 py-2 text-sm",
                      formData.targetAudience === "Jiné" && "is-active",
                    )}
                  >
                    Někdo jiný...
                  </button>
                </div>
                {formData.targetAudience === "Jiné" && (
                  <Input
                    type="text"
                    placeholder="Např. Majitelé malých e-shopů…"
                    className="h-12 animate-in rounded-xl fade-in"
                    value={formData.customTarget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customTarget: e.target.value,
                      })
                    }
                  />
                )}
              </section>
            </div>

            <div className="mt-auto flex justify-between pt-5">
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
                  !resolvedIndustry ||
                  formData.offeredServices.length === 0 ||
                  !resolvedAudience
                }
                className="sk-onboarding__cta group"
              >
                Pokračovat{" "}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-1 animate-in flex-col fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <div className="sk-onboarding__icon">
                <PenLine className="h-6 w-6" />
              </div>
              <h1 className="sk-type-h1 mb-2">Jak o sobě mluvíte?</h1>
              <p className="text-sm text-muted-foreground">
                {fromWebsite
                  ? "Návrh z webu — doladěte tón v 1. osobě. Tohle nejvíc ovlivní e-maily."
                  : "Krátce v 1. osobě, bez „My ve firmě…“. Tohle nejvíc ovlivní e-maily."}
              </p>
            </div>

            <div className="flex-1 space-y-3">
              <Textarea
                value={formData.companyContext}
                onChange={(e) =>
                  setFormData({ ...formData, companyContext: e.target.value })
                }
                placeholder="Např. Pomáhám firmám s redesignem a tvorbou webů na míru. Při zájmu i automatizace. Fixní nabídka, projekty bez šablon."
                className="min-h-[180px] resize-y text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Tip: co děláte, pro koho, a čím jste jiní. Název firmy nechte do
                podpisu.
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

        {step === 4 && (
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
                  placeholder={
                    formData.companyWebsite.trim()
                      ? `S pozdravem,\n\nJan Novák\n\n${formData.companyWebsite.trim()}`
                      : "S pozdravem,\n\nJan Novák\n\nwww.vasefirma.cz"
                  }
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
