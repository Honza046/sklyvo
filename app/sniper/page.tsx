"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wand2, Loader2, Mail, Globe, FileText, Send, Copy, Settings2, RefreshCw, Target, Info, X, ExternalLink } from "lucide-react";
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
import { EmailRichEditor } from "@/components/sniper/email-rich-editor";
import { cn } from "@/lib/utils";
import { htmlToPlainText, plainTextToEditorHtml } from "@/lib/email-format";
import { toast } from "sonner";
import { generateEmailContent, generateEmailSubjects } from "@/app/actions/generate";
import { getWorkspaceAccessState } from "@/app/actions/auth";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { sendSniperEmailNow } from "@/app/actions/sniper-send";
import { SNIPER_AUTODETECT_VALUE, SNIPER_OFFER_OPTIONS } from "@/lib/constants";
import { EMAIL_SETUP_SETTINGS_PATH } from "@/lib/copilot/setup-knowledge";

// Pomocné mapování pro hezké zobrazení v menu i na štítcích (label + unikátní emoji)
type OptionMeta = { label: string; emoji: string };

const toneMap: Record<string, OptionMeta> = {
  friendly: { label: "Elegantní a lidský", emoji: "🤝" },
  professional: { label: "Věcný a profesionální", emoji: "💼" },
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
  "rychlá myšlenka k vašemu webu",
  "napadla mě jedna věc k redesignu",
  "dotaz k mobilní verzi e shopu",
];

const INITIAL_EMAIL_BODY = `Dobrý den,

zde se po vygenerování zobrazí tělo e-mailu včetně oslovení. Vyplňte URL cílového webu a klikněte na Vygenerovat email.

S pozdravem`;

const SNIPER_HELP_SECTIONS = [
  {
    title: "Ikona nastavení (vlevo dole)",
    description: "Otevře filtry pro volbu tónu a jazyka e-mailu. Segment se určí automaticky z webu.",
  },
  {
    title: "Cílová URL adresa",
    description: "Web klienta, který AI projde — zjistí obor, nabídku a na co navázat.",
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
  analyza_klienta: string | null;
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
    analyza_klienta: optStr(["analyza_klienta", "analyzaKlienta", "client_analysis"]),
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
  /** ISO country from Radar URL — drives EN+native auto language. */
  const [countryCode, setCountryCode] = useState<string | null>(null);
  /** True after user manually changes the language select. */
  const [languageManualOverride, setLanguageManualOverride] = useState(false);
  const [prefilledLanguage, setPrefilledLanguage] = useState("cs");

  /**
   * Parametry skutečně použité u právě zobrazeného e-mailu (zmrazené při generování).
   * Segment vždy z detekce webu — už se nevybírá ručně.
   */
  const [generatedParams, setGeneratedParams] = useState<{
    segment: string | null;
    tone: string;
    language: string;
    analysis: string | null;
  } | null>(null);

  /** Typ nabídky — statický katalog. Výchozí je chytrá autodetekce AI. */
  const [selectedOffer, setSelectedOffer] = useState<string>(SNIPER_AUTODETECT_VALUE);

  const [isRefreshingSubjects, setIsRefreshingSubjects] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [emailConnected, setEmailConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Stavy pro interaktivní výstup
  const [subjects, setSubjects] = useState<string[]>(MOCK_SUBJECTS);
  const [selectedSubject, setSelectedSubject] = useState(MOCK_SUBJECTS[0]);
  const [editableBody, setEditableBody] = useState(INITIAL_EMAIL_BODY);
  const [editorKey, setEditorKey] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (isGenerated && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [isGenerated, editableBody]);

  useEffect(() => {
    void (async () => {
      const [state, emailState] = await Promise.all([
        getWorkspaceAccessState(),
        getEmailConnectionState(),
      ]);
      if (state.workspace) {
        const left = Math.max(0, state.workspace.creditsTotal - state.workspace.creditsUsed);
        setCreditsLeft(left);
      }
      setEmailConnected(emailState.connected);
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

    void (async () => {
      const { nativeLanguageFromCountry, normalizeCountryCode } = await import(
        "@/lib/country-language"
      );
      const country = normalizeCountryCode(searchParams.get("country"));
      setCountryCode(country);
      const native = nativeLanguageFromCountry(country);
      setPrefilledLanguage(native);
      setLanguage(native);
      setLanguageManualOverride(false);
    })();
  }, [searchParams]);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    setLanguageManualOverride(value !== prefilledLanguage);
  };

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
        segment: "auto",
        pdfData,
        countryCode,
        languageMode: languageManualOverride ? "manual" : "auto",
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
        setEditableBody(plainTextToEditorHtml(bodyCombined));
        setEditorKey((k) => k + 1);

        const finalSegment =
          d.detected_segment && segmentMap[d.detected_segment] ? d.detected_segment : null;
        const finalTone = d.detected_tone && toneMap[d.detected_tone] ? d.detected_tone : tone;
        const finalLanguage = languageManualOverride
          ? language
          : d.detected_language && languageFlagMap[d.detected_language]
            ? d.detected_language
            : language;

        setTone(finalTone);
        setLanguage(finalLanguage);
        if (!languageManualOverride && finalLanguage !== prefilledLanguage) {
          setPrefilledLanguage(finalLanguage);
        }

        setGeneratedParams({
          segment: finalSegment,
          tone: finalTone,
          language: finalLanguage,
          analysis: d.analyza_klienta,
        });
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

  const handleCopy = async () => {
    const plain = htmlToPlainText(editableBody);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([editableBody], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      toast.success("Zkopírováno do schránky.");
    } catch {
      await navigator.clipboard.writeText(plain);
      toast.success("Zkopírováno do schránky.");
    }
  };

  const handleOpenEmail = () => {
    const target = emailTarget.trim();
    if (!target) {
      toast.error("Zadejte kontaktní e-mail příjemce.");
      return;
    }
    const plain = htmlToPlainText(editableBody);
    const mailtoLink = `mailto:${target}?subject=${encodeURIComponent(selectedSubject)}&body=${encodeURIComponent(plain)}`;
    window.location.href = mailtoLink;
  };

  const handleSendNow = async () => {
    if (!emailConnected) {
      toast.error("Nejdřív napojte firemní e-mail.", {
        action: {
          label: "Nastavení",
          onClick: () => {
            window.location.href = EMAIL_SETUP_SETTINGS_PATH;
          },
        },
      });
      return;
    }
    const to = emailTarget.trim();
    if (!to) {
      toast.error("Zadejte kontaktní e-mail příjemce.");
      return;
    }
    if (!selectedSubject.trim() || !htmlToPlainText(editableBody).trim()) {
      toast.error("Chybí předmět nebo text e-mailu.");
      return;
    }

    setIsSending(true);
    try {
      const result = await sendSniperEmailNow({
        to,
        subject: selectedSubject,
        body: editableBody,
        targetUrl,
      });
      if ("error" in result) {
        if (result.needsEmailSetup) {
          toast.error(result.error, {
            action: {
              label: "Nastavení",
              onClick: () => {
                window.location.href = EMAIL_SETUP_SETTINGS_PATH;
              },
            },
          });
        } else {
          toast.error(result.error);
        }
        return;
      }
      toast.success("E-mail byl odeslán.");
    } catch (e) {
      console.error("SNIPER SEND:", e);
      toast.error("Odeslání selhalo.");
    } finally {
      setIsSending(false);
    }
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
        segment: "auto",
        countryCode,
        languageMode: languageManualOverride ? "manual" : "auto",
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
      <div
        className={cn(
          "flex h-full w-full flex-col items-center pt-0 md:pb-8",
          isGenerated
            ? "scrollbar-hide overflow-y-auto pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:overflow-y-auto"
            : "overflow-hidden pb-0 md:overflow-y-auto md:scrollbar-hide",
        )}
      >
        {/* Desktop hero */}
        <div className="mb-2 hidden space-y-1 text-center md:mb-2 md:block md:space-y-1">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Target className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Sniper
          </h1>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            Jednorázová analýza webu a generování obchodního e-mailu na míru.
          </p>
        </div>

        {/* Mobile page chrome */}
        <div className="mb-4 flex w-full max-w-6xl items-start justify-between gap-3 md:hidden">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Sniper</h1>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              Analýza webu a cold e-mail na míru
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full bg-muted/60 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Parametry zprávy"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-border/50 bg-card p-4 shadow-xl"
                align="end"
                side="bottom"
                sideOffset={8}
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Parametry zprávy</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Jazyk a tón pro tento e-mail.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Jazyk výstupu
                      </label>
                      <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="h-10 rounded-xl bg-background text-sm">
                          <SelectValue placeholder="Vyberte jazyk" />
                        </SelectTrigger>
                        <SelectContent className="border-border/60 bg-card shadow-lg">
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
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Tón komunikace
                      </label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="h-10 rounded-xl bg-background text-sm">
                          <SelectValue placeholder="Vyberte tón" />
                        </SelectTrigger>
                        <SelectContent className="border-border/60 bg-card shadow-lg">
                          {Object.entries(toneMap).map(([value, { label, emoji }]) => (
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
            <div
              tabIndex={0}
              className="group relative inline-flex outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-full"
            >
              <span
                className="inline-flex h-9 w-9 cursor-default items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
                aria-describedby="sniper-form-help-tooltip"
              >
                <Info className="h-4 w-4" aria-hidden />
              </span>
              <div
                id="sniper-form-help-tooltip"
                role="tooltip"
                className={cn(
                  "absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))]",
                  "origin-top-right translate-y-1 scale-[0.98] opacity-0 transition-all duration-200",
                  "pointer-events-none rounded-2xl border border-border/70 bg-white p-3.5 shadow-xl dark:bg-zinc-950",
                  "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
                  "group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100",
                )}
              >
                <div className="space-y-2.5">
                  {SNIPER_HELP_SECTIONS.map((section) => (
                    <div key={section.title}>
                      <p className="text-xs font-semibold text-foreground">{section.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-6xl flex-col gap-3 md:gap-6 md:px-8">
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

          {/* Native mobile form (grouped) */}
          <div className="overflow-hidden rounded-2xl bg-muted/50 dark:bg-muted/20 md:hidden">
            <div className="border-b border-border/40 px-4 py-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Cílová URL
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  className="h-10 border-0 bg-transparent pl-7 text-[15px] shadow-none focus-visible:ring-0"
                  placeholder="https://domain.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  autoComplete="off"
                  name="target-url-field-x"
                />
              </div>
            </div>
            <div className="border-b border-border/40 px-4 py-3">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Kontaktní e-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  className="h-10 border-0 bg-transparent pl-7 text-[15px] shadow-none focus-visible:ring-0"
                  placeholder="info@domain.com"
                  value={emailTarget}
                  onChange={(e) => setEmailTarget(e.target.value)}
                  autoComplete="off"
                  name="target-email-field-y"
                />
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-muted-foreground">Typ nabídky</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-medium text-blue-600"
                >
                  {pdfFile ? truncateFilename(pdfFile.name) : "+ PDF"}
                </button>
              </div>
              <Select value={selectedOffer} onValueChange={setSelectedOffer}>
                <SelectTrigger className="h-10 w-full border-0 bg-transparent px-0 text-[15px] shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Vyberte typ nabídky" />
                </SelectTrigger>
                <SelectContent className="z-50 rounded-xl border-border/50 bg-card shadow-xl">
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
              {pdfFile ? (
                <button
                  type="button"
                  className="mt-1 text-[11px] text-muted-foreground underline"
                  onClick={() => {
                    setPdfFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Odebrat PDF
                </button>
              ) : null}
            </div>
          </div>

          {!hasCredits && (
            <div className="md:hidden">
              <Link href="/settings/billing" className="text-xs font-medium text-blue-600">
                Zvýšit limit kreditů
              </Link>
            </div>
          )}

          {/* Desktop form card */}
          <div className="relative hidden flex-col gap-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all md:flex md:p-8">
            <div className="grid grid-cols-1 gap-6 pr-12 md:grid-cols-2 md:pr-14">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cílová URL adresa
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                  <Input
                    className="h-11 rounded-xl border-border/50 bg-background pl-9"
                    placeholder="https://domain.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    autoComplete="off"
                    name="target-url-field-x-desktop"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kontaktní E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                  <Input
                    className="h-11 rounded-xl border-border/50 bg-background pl-9"
                    placeholder="info@domain.com"
                    value={emailTarget}
                    onChange={(e) => setEmailTarget(e.target.value)}
                    autoComplete="off"
                    name="target-email-field-y-desktop"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        ? "rounded-md text-foreground hover:bg-muted/80"
                        : "lowercase tracking-normal text-blue-600 hover:text-blue-700 hover:underline",
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
                  <SelectTrigger className="h-11 w-full min-w-[280px] rounded-xl border-border/50 bg-background text-base focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Vyberte typ nabídky" />
                  </SelectTrigger>
                  <SelectContent className="z-50 rounded-xl border-border/50 bg-card shadow-xl">
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
                  <Button
                    variant="outline"
                    className="h-14 w-14 shrink-0 rounded-xl border-border/60 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
                  >
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 rounded-2xl border-border/50 bg-card p-4 shadow-xl"
                  align="start"
                  side="top"
                  sideOffset={16}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Parametry zprávy</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Změňte výchozí nastavení pro tento konkrétní e-mail.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Jazyk výstupu
                        </label>
                        <Select value={language} onValueChange={handleLanguageChange}>
                          <SelectTrigger className="h-9 rounded-lg bg-background text-xs">
                            <SelectValue placeholder="Vyberte jazyk" />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card shadow-lg">
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
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Tón komunikace
                        </label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger className="h-9 rounded-lg bg-background text-xs">
                            <SelectValue placeholder="Vyberte tón" />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card shadow-lg">
                            {Object.entries(toneMap).map(([value, { label, emoji }]) => (
                              <SelectItem key={value} value={value}>
                                {emoji} {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                        Segment (obor klienta) se určí automaticky z webu — už se nevybírá ručně, ať
                        e-mail sedí na reálnou firmu.
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                size="lg"
                onClick={() => void handleGenerate()}
                disabled={isLoading || !hasCredits || !selectedOffer}
                className="h-14 flex-1 rounded-xl bg-blue-600 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-blue-400"
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

            <div className="absolute right-6 top-6 z-40">
              <div
                tabIndex={0}
                className="group relative inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2"
              >
                <div
                  role="tooltip"
                  className={cn(
                    "absolute right-1 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2.5rem))]",
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
                <span className="inline-flex cursor-default text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-400">
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </div>
          </div>

          {/* Mobile sticky CTA */}
          {!isGenerated && (
            <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 p-3 md:hidden">
              <Button
                size="lg"
                onClick={() => void handleGenerate()}
                disabled={isLoading || !hasCredits || !selectedOffer}
                className="pointer-events-auto h-12 w-full rounded-2xl bg-blue-600 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    {hasCredits ? "Vygenerovat email" : "Nedostatek kreditů"}
                    <Wand2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* VÝSTUPNÍ E-MAIL */}
          {isGenerated && (
            <div className="rounded-2xl bg-muted/40 p-3 animate-in fade-in slide-in-from-top-8 duration-500 dark:bg-muted/15 sm:rounded-2xl sm:border sm:border-border/60 sm:bg-card sm:p-6 sm:shadow-sm md:p-8">
              <div className="mb-3 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
                <h3 className="text-[15px] font-semibold text-foreground sm:text-lg">Vygenerovaná sekvence</h3>
                
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                    {generatedParams?.segment && segmentMap[generatedParams.segment]
                      ? `${segmentMap[generatedParams.segment].emoji} ${segmentMap[generatedParams.segment].label}`
                      : "🔍 Z webu"}
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

              {generatedParams?.analysis && (
                <div className="mb-3 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/20 sm:mb-6 sm:rounded-xl sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                    Analýza webu
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-950/90 dark:text-emerald-100/90 sm:mt-1.5 sm:text-sm">
                    {generatedParams.analysis}
                  </p>
                </div>
              )}
              
              <div className="space-y-3 sm:space-y-6">
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
                  <EmailRichEditor
                    key={editorKey}
                    value={editableBody}
                    onChange={setEditableBody}
                  />
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2 pt-2 sm:mt-6 sm:flex sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3 sm:pt-4">
                <Button
                  variant="outline"
                  onClick={handleOpenEmail}
                  className="h-11 rounded-xl border-border/60 px-2 text-xs font-semibold hover:bg-muted sm:h-10 sm:px-4 sm:text-sm"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                  <span className="truncate">Otevřít v klientu</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="h-11 rounded-xl border-border/60 px-2 text-xs font-semibold hover:bg-muted sm:h-10 sm:px-4 sm:text-sm"
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                  Zkopírovat
                </Button>
                <Button
                  onClick={() => void handleSendNow()}
                  disabled={isSending}
                  className="col-span-2 h-11 rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700 sm:col-span-1 sm:h-10"
                  title={
                    emailConnected
                      ? "Odeslat přes napojený firemní e-mail"
                      : "Nejdřív napojte firemní e-mail v nastavení"
                  }
                >
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isSending ? "Odesílám…" : "Poslat"}
                </Button>
              </div>
              {!emailConnected && (
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  Pro přímé odeslání{" "}
                  <Link href={EMAIL_SETUP_SETTINGS_PATH} className="font-semibold text-blue-600 hover:underline">
                    napojte firemní e-mail
                  </Link>
                  .
                </p>
              )}
              
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