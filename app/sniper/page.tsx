"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wand2, Loader2, Mail, Globe, FileText, Send, Copy, Settings2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { generateEmailContent, generateEmailSubjects } from "@/app/actions/generate";
import { getSessionUser, getWorkspaceAccessState } from "@/app/actions/auth";

// Pomocné mapování pro hezké zobrazení na štítcích
const toneMap: Record<string, string> = {
  friendly: "Přátelský",
  professional: "Profesionální",
  assertive: "Asertivní",
  punchy: "Stručný a úderný",
  educational: "Hodnotový",
  technical: "Technický",
};

const segmentMap: Record<string, string> = {
  b2b_saas: "B2B SaaS",
  ecommerce: "E-commerce",
  manufacturing: "Výroba / Průmysl",
  real_estate: "Reality a development",
  finance: "Finance / Účetnictví",
  healthcare: "Zdravotnictví / Kliniky",
  logistics: "Logistika a doprava",
  law_firm: "Advokacie / Právo",
  gastronomy: "Gastro / Restaurace",
};

const MOCK_SUBJECTS = [
  "Doporučení pro váš klientský portál",
  "Napadla mě jedna věc ohledně vašeho webu",
  "Rychlý dotaz k AI integraci"
];

const INITIAL_EMAIL_BODY = `Dobrý den,

díval jsem se na váš web a všiml jsem si, že máte skvěle rozjetý produkt, ale chybí vám moderní klientský portál, který by vám ušetřil desítky hodin měsíčně na supportu.

Ve Venegard se specializujeme přesně na tyto systémy. Dokážeme vám postavit platformu, kde si klienti vše vyřeší sami pomocí integrované AI.

Dávalo by vám smysl si k tomu na 15 minut zavolat tento čtvrtek?

S pozdravem,
Tým Venegard`;

export default function SniperPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [emailTarget, setEmailTarget] = useState("");

  const [language, setLanguage] = useState("cs");
  const [tone, setTone] = useState("friendly");
  const [segment, setSegment] = useState("b2b_saas");

  /** Nabízené služby z workspace (stejný zdroj jako onboarding / nastavení) */
  const [offeredServices, setOfferedServices] = useState<string[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<string>("");

  const [isRefreshingSubjects, setIsRefreshingSubjects] = useState(false);
  const [offeredServicesLoadError, setOfferedServicesLoadError] = useState<string | null>(null);
  const [isLoadingOfferedServices, setIsLoadingOfferedServices] = useState(true);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stavy pro interaktivní výstup
  const [subjects, setSubjects] = useState<string[]>(MOCK_SUBJECTS);
  const [selectedSubject, setSelectedSubject] = useState(MOCK_SUBJECTS[0]);
  const [editableBody, setEditableBody] = useState(INITIAL_EMAIL_BODY);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (isGenerated) {
      adjustTextareaHeight();
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [isGenerated, editableBody]);

  useEffect(() => {
    let cancelled = false;
    setOfferedServicesLoadError(null);
    setIsLoadingOfferedServices(true);

    void (async () => {
      try {
        const session = await getSessionUser();
        if (cancelled) return;
        if (!session.user) {
          setOfferedServices([]);
          setSelectedOffer("");
          setOfferedServicesLoadError("Nejste přihlášeni. Přihlaste se prosím.");
          return;
        }
        const raw = session.workspace?.offeredServices ?? [];
        const list = Array.from(new Set(raw.map((s) => String(s).trim()).filter(Boolean)));
        setOfferedServices(list);
        setSelectedOffer((prev) => (prev && list.includes(prev) ? prev : list[0] ?? ""));
      } catch {
        if (!cancelled) {
          setOfferedServicesLoadError("Nepodařilo se načíst nabízené služby.");
          setOfferedServices([]);
        }
      } finally {
        if (!cancelled) setIsLoadingOfferedServices(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const state = await getWorkspaceAccessState();
      if (state.workspace) {
        const left = Math.max(0, state.workspace.creditsTotal - state.workspace.creditsUsed);
        setCreditsLeft(left);
      }
    })();
  }, []);

  useEffect(() => {
    const prefillUrl = searchParams.get("url")?.trim() ?? "";
    if (prefillUrl) {
      setTargetUrl(prefillUrl);
    }

    const prefillEmail = searchParams.get("email")?.trim() ?? "";
    if (prefillEmail) {
      setEmailTarget(prefillEmail);
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!selectedOffer) {
      alert("Prosím, vyberte nebo přidejte službu, kterou chcete nabízet.");
      return;
    }

    setIsLoading(true);
    setIsGenerated(false);

    try {
      const result = await generateEmailContent({
        targetUrl,
        selectedOfferedService: selectedOffer,
        language,
        tone,
        segment,
      });

      if ("error" in result && result.error) {
        if (result.error === "INSUFFICIENT_CREDITS") {
          setToastMessage(result.message ?? "Nemáte dostatek kreditů pro tuto akci.");
        } else {
          alert(result.error);
        }
        return;
      }

      if (result.data) {
        const nextSubjects = result.data.subjects;
        setSubjects(nextSubjects);
        setSelectedSubject(nextSubjects[0] ?? "");
        setEditableBody(result.data.body);
        setIsGenerated(true);
        setCreditsLeft((prev) => (prev === null ? prev : Math.max(0, prev - 1)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableBody);
    alert("Zkopírováno do schránky!");
  };

  const handleOpenEmail = () => {
    const target = emailTarget || "info@domain.com";
    const mailtoLink = `mailto:${target}?subject=${encodeURIComponent(selectedSubject)}&body=${encodeURIComponent(editableBody)}`;
    window.location.href = mailtoLink;
  };

  const handleRefreshSubjects = async () => {
    if (!selectedOffer) {
      alert("Pro regeneraci předmětů nejdřív vyberte službu.");
      return;
    }

    setIsRefreshingSubjects(true);
    try {
      const result = await generateEmailSubjects({
        targetUrl,
        selectedOfferedService: selectedOffer,
        language,
        tone,
        segment,
      });

      if ("error" in result && result.error) {
        alert(result.error);
        return;
      }

      if (result.data?.subjects?.length) {
        setSubjects(result.data.subjects);
        setSelectedSubject(result.data.subjects[0] ?? selectedSubject);
      }
    } finally {
      setIsRefreshingSubjects(false);
    }
  };

  const hasCredits = (creditsLeft ?? 1) > 0;
  const hasOfferedServices = offeredServices.length > 0;

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-start pt-0 pb-8">
        
        <div className="mb-4 text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Direct Outreach
          </h1>
          <p className="text-sm text-muted-foreground">
            Jednorázová analýza webu a generování obchodního e-mailu na míru.
          </p>
        </div>

        <div className="w-full max-w-6xl px-4 md:px-8 flex flex-col gap-6">
          
          <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm flex flex-col gap-8 transition-all">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cílová URL adresa</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                  <Input 
                    className="pl-9 h-11 rounded-xl bg-background border-border/50" 
                    placeholder="https://domain.com" 
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    autoComplete="off"
                    name="target-url-field-x"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kontaktní E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                  <Input 
                    className="pl-9 h-11 rounded-xl bg-background border-border/50" 
                    placeholder="info@domain.com" 
                    value={emailTarget}
                    onChange={(e) => setEmailTarget(e.target.value)}
                    autoComplete="off"
                    name="target-email-field-y"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Typ nabídky (Vaše služba)</span>
                <button className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline lowercase tracking-normal">
                  <FileText className="h-3.5 w-3.5" />
                  + přidat PDF kontext
                </button>
              </label>
              
              {!isLoadingOfferedServices && offeredServicesLoadError && (
                <p className="text-xs text-amber-600 dark:text-amber-500 max-w-md">{offeredServicesLoadError}</p>
              )}
              <div className="max-w-md space-y-3">
                {isLoadingOfferedServices ? (
                  <div className="flex h-10 w-full cursor-not-allowed items-center justify-start rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground opacity-70">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Načítání služeb...
                  </div>
                ) : hasOfferedServices ? (
                  <Select value={selectedOffer} onValueChange={setSelectedOffer}>
                    <SelectTrigger className="h-11 rounded-xl bg-background border-border/50 text-base focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Vyberte službu k nabídce…" />
                    </SelectTrigger>
                    <SelectContent className="bg-card shadow-xl border-border/50 rounded-xl">
                      <SelectGroup>
                        {offeredServices.map((name) => (
                          <SelectItem key={name} value={name} className="cursor-pointer">
                            {name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground/90">Žádné služby. Přidejte je v nastavení.</p>
                    <p className="mt-1 text-xs">
                      Nabízené služby se spravují v pracovním prostoru; Sniper z nich vybírá typ nabídky.
                    </p>
                    <Button asChild className="mt-3 h-9 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                      <Link href="/settings">Otevřít nastavení</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-14 w-14 rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 shadow-sm">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                
                <PopoverContent 
                  className="w-80 rounded-2xl p-4 shadow-xl border-border/50 bg-card" 
                  align="start" 
                  side="top" 
                  sideOffset={16}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Parametry zprávy</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Změňte výchozí nastavení pro tento konkrétní e-mail.</p>
                    </div>
                    
                    <div className="space-y-3">
                      
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Jazyk výstupu</label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="h-9 rounded-lg text-xs bg-background">
                            <SelectValue placeholder="Vyberte jazyk" />
                          </SelectTrigger>
                          <SelectContent className="bg-card shadow-lg border-border/60">
                            <SelectItem value="cs">🇨🇿 Čeština</SelectItem>
                            <SelectItem value="sk">🇸🇰 Slovenština</SelectItem>
                            <SelectItem value="en">🇬🇧 Angličtina</SelectItem>
                            <SelectItem value="de">🇩🇪 Němčina</SelectItem>
                            <SelectItem value="es">🇪🇸 Španělština</SelectItem>
                            <SelectItem value="ru">🇷🇺 Ruština</SelectItem>
                            <SelectItem value="fr">🇫🇷 Francouzština</SelectItem>
                            <SelectItem value="pl">🇵🇱 Polština</SelectItem>
                            <SelectItem value="it">🇮🇹 Italština</SelectItem>
                            <SelectItem value="nl">🇳🇱 Nizozemština</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tón komunikace</label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger className="h-9 rounded-lg text-xs bg-background">
                            <SelectValue placeholder="Vyberte tón" />
                          </SelectTrigger>
                          <SelectContent className="bg-card shadow-lg border-border/60">
                            <SelectItem value="friendly">👋 Přátelský a uvolněný</SelectItem>
                            <SelectItem value="professional">💼 Přísně profesionální</SelectItem>
                            <SelectItem value="assertive">🎯 Asertivní (Direct)</SelectItem>
                            <SelectItem value="punchy">⚡ Stručný a úderný (No-BS)</SelectItem>
                            <SelectItem value="educational">📚 Hodnotový (Edukativní)</SelectItem>
                            <SelectItem value="technical">🤓 Technický (Pro CTO)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cílový segment</label>
                        <Select value={segment} onValueChange={setSegment}>
                          <SelectTrigger className="h-9 rounded-lg text-xs bg-background">
                            <SelectValue placeholder="Vyberte segment" />
                          </SelectTrigger>
                          <SelectContent className="bg-card shadow-lg border-border/60">
                            <SelectItem value="b2b_saas">💻 B2B SaaS</SelectItem>
                            <SelectItem value="ecommerce">🛒 E-commerce</SelectItem>
                            <SelectItem value="manufacturing">🏭 Výroba / Průmysl</SelectItem>
                            <SelectItem value="real_estate">🏢 Reality a development</SelectItem>
                            <SelectItem value="finance">🏦 Finance / Účetnictví</SelectItem>
                            <SelectItem value="healthcare">🏥 Zdravotnictví / Kliniky</SelectItem>
                            <SelectItem value="logistics">🚚 Logistika a doprava</SelectItem>
                            <SelectItem value="law_firm">⚖️ Advokacie / Právo</SelectItem>
                            <SelectItem value="gastronomy">🍽️ Gastro / Restaurace</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                size="lg" 
                onClick={() => void handleGenerate()}
                disabled={
                  isLoading ||
                  isLoadingOfferedServices ||
                  !hasCredits ||
                  !hasOfferedServices ||
                  !selectedOffer
                }
                className="flex-1 h-14 rounded-xl text-base font-semibold transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:bg-blue-400"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <>
                    {hasCredits ? "Vygenerovat email" : "Nedostatek kreditů"}
                    <Wand2 className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
            {!hasCredits && (
              <div className="mt-2">
                <Link href="/settings/billing" className="text-xs text-blue-600 hover:underline">
                  Zvýšit limit kreditů
                </Link>
              </div>
            )}
          </div>

          {/* VÝSTUPNÍ E-MAIL */}
          {isGenerated && (
            <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm animate-in fade-in slide-in-from-top-8 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-semibold text-foreground">Vygenerovaná sekvence</h3>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                    🎯 {segmentMap[segment]}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    🎭 {toneMap[tone]}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    🌍 {language.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Předmět e-mailu</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="h-11 w-full rounded-xl border-border/50 bg-background px-3 py-2 text-sm focus:ring-0 focus:ring-offset-0">
                          <SelectValue placeholder="Vyberte předmět" />
                        </SelectTrigger>
                        <SelectContent className="bg-card shadow-xl border-border/50 rounded-xl">
                          {subjects.map((s, i) => (
                            <SelectItem key={i} value={s} className="cursor-pointer hover:bg-muted rounded-md">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => void handleRefreshSubjects()}
                      disabled={
                        isRefreshingSubjects ||
                        isLoading ||
                        isLoadingOfferedServices ||
                        !hasOfferedServices ||
                        !selectedOffer
                      }
                      className="flex items-center justify-center p-0 h-11 w-11 rounded-xl shrink-0 border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Vygenerovat nové předměty"
                    >
                      <RefreshCw className={cn("h-4 w-4", isRefreshingSubjects && "animate-spin")} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text e-mailu (Můžete upravit)</Label>
                  <textarea
                    ref={textareaRef}
                    className="flex w-full rounded-xl border border-border/50 bg-background px-4 py-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 leading-relaxed overflow-hidden resize-none transition-all duration-200"
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleCopy} className="rounded-xl border-border/60 hover:bg-muted font-semibold">
                  <Copy className="mr-2 h-4 w-4" />
                  Zkopírovat
                </Button>
                <Button onClick={handleOpenEmail} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold">
                  <Send className="mr-2 h-4 w-4" />
                  Otevřít v e-mailu
                </Button>
              </div>
              
              <div ref={bottomRef} className="h-1" />
            </div>
          )}

        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-amber-300 bg-card px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{toastMessage}</p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Zavřít
            </button>
          </div>
        </div>
      )}
    </>
  );
}