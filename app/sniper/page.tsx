"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wand2, Loader2, Mail, Globe, FileText, Send, Copy, Settings2, RefreshCw, Target, Info, X } from "lucide-react";
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
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateEmailContent, generateEmailSubjects } from "@/app/actions/generate";
import { getWorkspaceAccessState } from "@/app/actions/auth";
import { SNIPER_AUTODETECT_VALUE, SNIPER_OFFER_OPTIONS } from "@/lib/constants";

// Pomocné mapování pro hezké zobrazení v menu i na štítcích (label + unikátní emoji)
type OptionMeta = { label: string; emoji: string };

const toneMap: Record<string, OptionMeta> = {
  friendly: { label: "Přátelský a uvolněný", emoji: "🤝" },
  professional: { label: "Přísně profesionální", emoji: "💼" },
  assertive: { label: "Asertivní", emoji: "⚡" },
  nobullshit: { label: "Stručný a úderný", emoji: "🎯" },
  educational: { label: "Hodnotový", emoji: "💡" },
  technical: { label: "Technický", emoji: "⚙️" },
};

const segmentMap: Record<string, OptionMeta> = {
  b2b_saas: { label: "B2B SaaS", emoji: "🎯" },
  ecommerce: { label: "E-commerce", emoji: "🛒" },
  production: { label: "Výroba / Průmysl", emoji: "🏭" },
  reality: { label: "Reality a development", emoji: "🏢" },
  finance: { label: "Finance / Účetnictví", emoji: "📊" },
  healthcare: { label: "Zdravotnictví / Kliniky", emoji: "🏥" },
  logistics: { label: "Logistika a doprava", emoji: "📦" },
  legal: { label: "Advokacie / Právo", emoji: "⚖️" },
  gastro: { label: "Gastro / Restaurace", emoji: "🍔" },
};

/** Vlajka podle jazyka výstupu — sjednocená ikona pro menu i štítek. */
const languageFlagMap: Record<string, string> = {
  cs: "🇨🇿",
  sk: "🇸🇰",
  en: "🇬🇧",
  de: "🇩🇪",
  es: "🇪🇸",
  ru: "🇷🇺",
  fr: "🇫🇷",
  pl: "🇵🇱",
  it: "🇮🇹",
  nl: "🇳🇱",
};

const MOCK_SUBJECTS = [
  "Doporučení pro váš klientský portál",
  "Napadla mě jedna věc ohledně vašeho webu",
  "Rychlý dotaz k AI integraci"
];

const INITIAL_EMAIL_BODY = `Dobrý den,

zde se po vygenerování zobrazí tělo e-mailu včetně oslovení. Vyplňte URL cílového webu a klikněte na Vygenerovat email.

S pozdravem`;

const SNIPER_HELP_SECTIONS = [
  {
    title: "Ikona nastavení (vlevo dole)",
    description: "Otevře filtry pro volbu tónu, jazyka a persony e-mailu.",
  },
  {
    title: "Cílová URL adresa",
    description: "Web klienta, který AI přečte a zanalyzuje.",
  },
  {
    title: "Přidat PDF kontext",
    description: "Možnost nahrát vlastní materiály pro chytřejší výstup.",
  },
] as const;

/** Vytáhne pole předmětů z odpovědi (nové vygenerovane_predmety nebo legacy jeden řetězec). */
function parsePredmetyFromPayload(o: Record<string, unknown>): string[] {
  for (const k of ["vygenerovane_predmety", "vygenerovanePredmety"]) {
    const v = o[k];
    if (Array.isArray(v)) {
      const arr = v.map((x) => String(x).trim()).filter(Boolean);
      if (arr.length > 0) return arr;
    }
  }
  const legacy = o.vygenerovany_predmet ?? o.vygenerovanyPredmet;
  if (typeof legacy === "string" && legacy.trim()) return [legacy.trim()];
  return [];
}

/** Normalizace odpovědi server action (očekávané snake_case z AI / Zod). */
function parseSniperEmailPayload(data: unknown): {
  osloveni: string;
  vygenerovany_email: string;
  vygenerovane_predmety: string[];
  contact_email: string | null;
  detected_segment: string | null;
  detected_tone: string | null;
  detected_language: string | null;
} | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const str = (keys: string[]) => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  const optStr = (keys: string[]): string | null => {
    for (const k of keys) {
      const v = o[k];
      if (v === null || v === undefined) continue;
      if (typeof v === "string") {
        const t = v.trim();
        return t.length > 0 ? t : null;
      }
    }
    return null;
  };
  const vygenerovane_predmety = parsePredmetyFromPayload(o);
  const vygenerovany_email = str(["vygenerovany_email", "vygenerovanyEmail"]);
  const osloveni = str(["osloveni"]) || "Dobrý den,";
  if (!vygenerovany_email || vygenerovane_predmety.length === 0) return null;
  return {
    osloveni,
    vygenerovany_email,
    vygenerovane_predmety,
    contact_email: optStr(["contact_email", "contactEmail"]),
    detected_segment: optStr(["detekovany_segment", "detected_segment", "detectedSegment"]),
    detected_tone: optStr(["detekovany_ton", "detected_tone", "detectedTone"]),
    detected_language: optStr(["detekovany_jazyk", "detected_language", "detectedLanguage"]),
  };
}

const SNIPER_MAX_PDF_BYTES = 4 * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("readAsDataURL"));
        return;
      }
      const comma = r.indexOf(",");
      resolve(comma >= 0 ? r.slice(comma + 1) : r);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader"));
    reader.readAsDataURL(file);
  });
}

function truncateFilename(name: string, max = 26): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  const budget = Math.max(4, max - ext.length - 1);
  const head = Math.ceil(budget * 0.55);
  const tail = budget - head;
  return `${base.slice(0, head)}…${base.slice(-tail)}${ext}`;
}

function SniperContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [emailTarget, setEmailTarget] = useState("");

  const [language, setLanguage] = useState("cs");
  const [tone, setTone] = useState("friendly");
  const [segment, setSegment] = useState("b2b_saas");

  /**
   * Parametry skutečně použité u právě zobrazeného e-mailu (zmrazené při generování).
   * Odznáčky čtou z tohoto stavu, ne z živých selectů — uživatel může selecty volně překlikávat.
   */
  const [generatedParams, setGeneratedParams] = useState<{
    segment: string;
    tone: string;
    language: string;
  } | null>(null);

  /** Typ nabídky — statický katalog. Výchozí je chytrá autodetekce AI. */
  const [selectedOffer, setSelectedOffer] = useState<string>(SNIPER_AUTODETECT_VALUE);

  const [isRefreshingSubjects, setIsRefreshingSubjects] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);

  // Stavy pro interaktivní výstup
  const [subjects, setSubjects] = useState<string[]>(MOCK_SUBJECTS);
  const [selectedSubject, setSelectedSubject] = useState(MOCK_SUBJECTS[0]);
  const [editableBody, setEditableBody] = useState(INITIAL_EMAIL_BODY);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);

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
    void (async () => {
      const state = await getWorkspaceAccessState();
      if (state.workspace) {
        const left = Math.max(0, state.workspace.creditsTotal - state.workspace.creditsUsed);
        setCreditsLeft(left);
      }
    })();
  }, []);

  useEffect(() => {
    const rawUrl = searchParams.get("url")?.trim() ?? "";
    if (rawUrl) {
      const normalized = /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : `https://${rawUrl.replace(/^\/+/, "")}`;
      setTargetUrl(normalized);
    }

    const prefillEmail = searchParams.get("email")?.trim() ?? "";
    if (prefillEmail) {
      setEmailTarget(prefillEmail);
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!selectedOffer) {
      toast.error("Prosím, vyberte nebo přidejte službu, kterou chcete nabízet.");
      return;
    }

    setIsLoading(true);
    setIsGenerated(false);

    let pdfData: string | undefined;
    if (pdfFile) {
      if (pdfFile.size > SNIPER_MAX_PDF_BYTES) {
        toast.error(`PDF může mít maximálně ${Math.round(SNIPER_MAX_PDF_BYTES / (1024 * 1024))} MB.`);
        setIsLoading(false);
        return;
      }
      try {
        pdfData = await readFileAsBase64(pdfFile);
      } catch {
        toast.error("PDF se nepodařilo načíst.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const result = await generateEmailContent({
        targetUrl,
        selectedOfferedService: selectedOffer,
        language,
        tone,
        segment,
        pdfData,
      });

      if ("error" in result && result.error) {
        if (result.error === "INSUFFICIENT_CREDITS") {
          toast.error(result.message ?? "Nemáte dostatek kreditů pro tuto akci.");
        } else {
          toast.error(
            typeof result.error === "string" ? result.error : "Generování e-mailu selhalo. Zkuste to prosím znovu.",
          );
        }
        return;
      }

      if (result.success && result.data) {
        const d = parseSniperEmailPayload(result.data);
        if (!d) {
          toast.error("Generování e-mailu selhalo. Zkuste to prosím znovu.");
          return;
        }
        setSubjects(d.vygenerovane_predmety);
        setSelectedSubject(d.vygenerovane_predmety[0] ?? "");
        const bodyCombined = `${d.osloveni}\n\n${d.vygenerovany_email}`;
        setEditableBody(bodyCombined);

        // Parametry skutečně použité u tohoto e-mailu: detekce z webu (pokud je validní),
        // jinak hodnoty zvolené v selectech při generování.
        const finalSegment =
          d.detected_segment && segmentMap[d.detected_segment] ? d.detected_segment : segment;
        const finalTone = d.detected_tone && toneMap[d.detected_tone] ? d.detected_tone : tone;
        const finalLanguage =
          d.detected_language && languageFlagMap[d.detected_language] ? d.detected_language : language;

        // Živé selecty srovnáme na použité hodnoty; uživatel je pak může volně překlikávat.
        setSegment(finalSegment);
        setTone(finalTone);
        setLanguage(finalLanguage);

        // Zmrazený stav pro odznáčky — mění se jen společně s textem při (pře)generování.
        setGeneratedParams({ segment: finalSegment, tone: finalTone, language: finalLanguage });
        setEmailTarget((prev) => {
          const trimmed = prev.trim();
          if (trimmed) return prev;
          const found = d.contact_email?.trim();
          return found && found.length > 0 ? found : prev;
        });
        setIsGenerated(true);
        setCreditsLeft((prev) => (prev === null ? prev : Math.max(0, prev - 1)));
        toast.success("E-mail byl úspěšně vygenerován.");
      } else {
        toast.error("Generování e-mailu selhalo. Zkuste to prosím znovu.");
      }
    } catch (e) {
      console.error("SNIPER CLIENT:", e);
      toast.error("Generování e-mailu selhalo. Zkuste to prosím znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(editableBody);
    toast.success("Zkopírováno do schránky.");
  };

  const handleOpenEmail = () => {
    const target = emailTarget || "info@domain.com";
    const mailtoLink = `mailto:${target}?subject=${encodeURIComponent(selectedSubject)}&body=${encodeURIComponent(editableBody)}`;
    window.location.href = mailtoLink;
  };

  const handleRefreshSubjects = async () => {
    if (!selectedOffer) {
      toast.error("Pro regeneraci předmětů nejdřív vyberte službu.");
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
        toast.error(
          typeof result.error === "string" ? result.error : "Generování předmětů selhalo. Zkuste to prosím znovu.",
        );
        return;
      }

      if (result.success && result.data?.subjects?.length) {
        setSubjects(result.data.subjects);
        setSelectedSubject(result.data.subjects[0] ?? selectedSubject);
        toast.success("Předměty byly obnoveny.");
      } else {
        toast.error("Generování předmětů selhalo. Zkuste to prosím znovu.");
      }
    } catch (e) {
      console.error("SNIPER CLIENT (subjects):", e);
      toast.error("Generování předmětů selhalo. Zkuste to prosím znovu.");
    } finally {
      setIsRefreshingSubjects(false);
    }
  };

  const hasCredits = (creditsLeft ?? 1) > 0;

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-start pt-0 pb-8">
        
        <div className="mb-2 text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl">
              <Target className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Sniper
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Jednorázová analýza webu a generování obchodního e-mailu na míru.
          </p>
        </div>

        <div className="w-full max-w-6xl px-4 md:px-8 flex flex-col gap-6">
          
          <div className="relative flex flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all md:p-8">
            
            <div className="grid grid-cols-1 gap-6 pr-12 md:grid-cols-2 md:gap-6 md:pr-14">
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
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.type && f.type !== "application/pdf") {
                    toast.error("Vyberte prosím soubor PDF.");
                    e.target.value = "";
                    return;
                  }
                  setPdfFile(f ?? null);
                }}
              />
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between gap-2">
                <span>Typ nabídky (Vaše služba)</span>
                <div
                  className={cn(
                    "flex max-w-[min(100%,14rem)] items-center gap-0.5 rounded-md border sm:max-w-[18rem]",
                    pdfFile ? "border-border/70 bg-muted/60 pr-0.5" : "border-transparent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left text-[11px] font-medium transition-colors",
                      pdfFile
                        ? "text-foreground hover:bg-muted/80 rounded-md"
                        : "text-blue-600 hover:text-blue-700 hover:underline lowercase tracking-normal",
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    {pdfFile ? (
                      <span className="min-w-0 truncate" title={pdfFile.name}>
                        {truncateFilename(pdfFile.name)}
                      </span>
                    ) : (
                      <span className="lowercase tracking-normal">+ přidat PDF kontext</span>
                    )}
                  </button>
                  {pdfFile ? (
                    <button
                      type="button"
                      aria-label="Odebrat PDF"
                      className="inline-flex shrink-0 rounded p-1 text-muted-foreground hover:bg-background/90 hover:text-foreground"
                      onClick={() => {
                        setPdfFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
              
              <div className="w-full max-w-lg space-y-3">
                <Select value={selectedOffer} onValueChange={setSelectedOffer}>
                  <SelectTrigger className="h-11 w-full min-w-[280px] rounded-xl bg-background border-border/50 text-base focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Vyberte typ nabídky" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-card shadow-xl border-border/50 rounded-xl">
                    {SNIPER_OFFER_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className={cn(
                          "cursor-pointer",
                          option.value === SNIPER_AUTODETECT_VALUE && "font-medium",
                        )}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                            {Object.entries(toneMap).map(([value, { label, emoji }]) => (
                              <SelectItem key={value} value={value}>
                                {emoji} {label}
                              </SelectItem>
                            ))}
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
                            {Object.entries(segmentMap).map(([value, { label, emoji }]) => (
                              <SelectItem key={value} value={value}>
                                {emoji} {label}
                              </SelectItem>
                            ))}
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
                  !hasCredits ||
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
              <div className="mt-1.5">
                <Link href="/settings/billing" className="text-xs text-blue-600 hover:underline">
                  Zvýšit limit kreditů
                </Link>
              </div>
            )}

            <div className="absolute top-6 right-6 z-40">
              <div
                tabIndex={0}
                className="group relative inline-flex outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 rounded-md"
              >
                <div
                  id="sniper-form-help-tooltip"
                  role="tooltip"
                  className={cn(
                    "absolute top-full right-1 z-50 mt-2 w-[min(20rem,calc(100vw-2.5rem))]",
                    "origin-top-right -translate-y-2 scale-[0.98] opacity-0 transition-all duration-200 ease-out",
                    "pointer-events-none rounded-xl border border-border/70 bg-white p-4 shadow-xl dark:border-zinc-700/90 dark:bg-zinc-950",
                    "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
                    "group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100",
                  )}
                >
                  <div className="space-y-3">
                    {SNIPER_HELP_SECTIONS.map((section) => (
                      <div key={section.title}>
                        <p className="text-sm font-semibold text-foreground">{section.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <span
                  className="inline-flex cursor-default text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-400"
                  aria-describedby="sniper-form-help-tooltip"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </div>
          </div>

          {/* VÝSTUPNÍ E-MAIL */}
          {isGenerated && (
            <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm animate-in fade-in slide-in-from-top-8 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-semibold text-foreground">Vygenerovaná sekvence</h3>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                    {segmentMap[generatedParams?.segment ?? ""]?.emoji}{" "}
                    {segmentMap[generatedParams?.segment ?? ""]?.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    {toneMap[generatedParams?.tone ?? ""]?.emoji}{" "}
                    {toneMap[generatedParams?.tone ?? ""]?.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    {languageFlagMap[generatedParams?.language ?? ""] ?? "🌍"}{" "}
                    {(generatedParams?.language ?? "").toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Předmět e-mailu</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Select
                        value={String(
                          subjects.length > 0
                            ? Math.max(
                                0,
                                subjects.indexOf(selectedSubject) >= 0
                                  ? subjects.indexOf(selectedSubject)
                                  : 0,
                              )
                            : 0,
                        )}
                        onValueChange={(v) => {
                          const i = Number.parseInt(v, 10);
                          if (!Number.isFinite(i) || i < 0 || i >= subjects.length) return;
                          setSelectedSubject(subjects[i] ?? "");
                        }}
                      >
                      <SelectTrigger className="h-11 w-full rounded-xl border-border/50 bg-background px-3 py-2 text-sm focus:ring-0 focus:ring-offset-0">
                          <SelectValue placeholder="Vyberte předmět" />
                        </SelectTrigger>
                        <SelectContent className="bg-card shadow-xl border-border/50 rounded-xl">
                          {subjects.map((s, i) => (
                            <SelectItem key={`${i}-${s}`} value={String(i)} className="cursor-pointer hover:bg-muted rounded-md">
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
    </>
  );
}

export default function SniperPage() {
  return (
    <Suspense fallback={<div>Načítání...</div>}>
      <SniperContent />
    </Suspense>
  );
}