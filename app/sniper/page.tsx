"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Wand2,
  Loader2,
  Mail,
  Globe,
  FileText,
  Send,
  Copy,
  Settings2,
  RefreshCw,
  Info,
  X,
  ExternalLink,
} from "lucide-react";
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
import { SniperRecentPanel } from "@/components/sniper/sniper-recent-panel";
import {
  LanguageFlag,
  SNIPER_LANGUAGE_LABELS,
  hasLanguageFlag,
} from "@/components/language-flag";
import { cn } from "@/lib/utils";
import { htmlToPlainText, plainTextToEditorHtml } from "@/lib/email-format";
import {
  listSniperRecent,
  markSniperRecentSent,
  upsertSniperRecent,
  type SniperRecentItem,
} from "@/lib/sniper-recent";
import { toast } from "sonner";
import {
  generateEmailContent,
  generateEmailSubjects,
} from "@/app/actions/generate";
import { getWorkspaceAccessState } from "@/app/actions/auth";
import { getEmailConnectionState } from "@/app/actions/email-connection";
import { sendSniperEmailNow } from "@/app/actions/sniper-send";
import { SNIPER_AUTODETECT_VALUE, SNIPER_OFFER_OPTIONS } from "@/lib/constants";
import { tService } from "@/lib/i18n/service-catalog";
import { EMAIL_SETUP_SETTINGS_PATH } from "@/lib/copilot/setup-knowledge";
import { useLanguage } from "@/context/LanguageContext";

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

/** Jazyky výstupu — vlajka přes PNG (Windows nezobrazuje emoji vlajky). */
const SNIPER_LANGUAGES = [
  { value: "cs" },
  { value: "sk" },
  { value: "en" },
  { value: "de" },
  { value: "es" },
  { value: "ru" },
  { value: "fr" },
  { value: "pl" },
  { value: "it" },
  { value: "nl" },
] as const;

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
    description:
      "Otevře filtry pro volbu tónu a jazyka e-mailu. Segment se určí automaticky z webu.",
  },
  {
    title: "Cílová URL adresa",
    description:
      "Web klienta, který AI projde. Zjistí obor, nabídku a na co navázat.",
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
    analyza_klienta: optStr([
      "analyza_klienta",
      "analyzaKlienta",
      "client_analysis",
    ]),
    detected_segment: optStr([
      "detekovany_segment",
      "detected_segment",
      "detectedSegment",
    ]),
    detected_tone: optStr(["detekovany_ton", "detected_tone", "detectedTone"]),
    detected_language: optStr([
      "detekovany_jazyk",
      "detected_language",
      "detectedLanguage",
    ]),
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
  const { t, language: uiLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [emailTarget, setEmailTarget] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<SniperRecentItem[]>([]);

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
  const [selectedOffer, setSelectedOffer] = useState<string>(
    SNIPER_AUTODETECT_VALUE,
  );

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
        const left = Math.max(
          0,
          state.workspace.creditsTotal - state.workspace.creditsUsed,
        );
        setCreditsLeft(left);
        setWorkspaceId(state.workspace.id);
        setRecentItems(listSniperRecent(state.workspace.id));
      }
      setEmailConnected(emailState.connected);
    })();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setRecentItems(listSniperRecent(workspaceId));
  }, [workspaceId]);

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
      const { nativeLanguageFromCountry, normalizeCountryCode } =
        await import("@/lib/country-language");
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
      toast.error(
        "Prosím, vyberte nebo přidejte službu, kterou chcete nabízet.",
      );
      return;
    }

    setIsLoading(true);
    setIsGenerated(false);

    let pdfData: string | undefined;
    if (pdfFile) {
      if (pdfFile.size > SNIPER_MAX_PDF_BYTES) {
        toast.error(
          `PDF může mít maximálně ${Math.round(SNIPER_MAX_PDF_BYTES / (1024 * 1024))} MB.`,
        );
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
          toast.error(
            result.message ?? "Nemáte dostatek kreditů pro tuto akci.",
          );
        } else {
          toast.error(
            typeof result.error === "string"
              ? result.error
              : "Generování e-mailu selhalo. Zkuste to prosím znovu.",
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
        const bodyHtml = plainTextToEditorHtml(bodyCombined);
        setEditableBody(bodyHtml);
        setEditorKey((k) => k + 1);

        const finalSegment =
          d.detected_segment && segmentMap[d.detected_segment]
            ? d.detected_segment
            : null;
        const finalTone =
          d.detected_tone && toneMap[d.detected_tone] ? d.detected_tone : tone;
        const finalLanguage = languageManualOverride
          ? language
          : d.detected_language && hasLanguageFlag(d.detected_language)
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
        const resolvedEmail = (() => {
          const trimmed = emailTarget.trim();
          if (trimmed) return trimmed;
          const found = d.contact_email?.trim();
          return found && found.length > 0 ? found : "";
        })();
        setEmailTarget((prev) => {
          const trimmed = prev.trim();
          if (trimmed) return prev;
          return resolvedEmail || prev;
        });
        setIsGenerated(true);
        setCreditsLeft((prev) =>
          prev === null ? prev : Math.max(0, prev - 1),
        );
        setRecentItems(
          upsertSniperRecent(workspaceId, {
            targetUrl,
            contactEmail: resolvedEmail || emailTarget.trim(),
            status: "draft",
            selectedOffer,
            tone: finalTone,
            language: finalLanguage,
            subjects: d.vygenerovane_predmety,
            selectedSubject: d.vygenerovane_predmety[0] ?? "",
            body: bodyHtml,
            segment: finalSegment,
            analysis: d.analyza_klienta,
          }),
        );
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
      toast.success("E-mail odeslán. V CRM je kontaktováno.");
      setRecentItems(markSniperRecentSent(workspaceId, targetUrl, to));
      // Zavři editor a vrať Sniper do výchozího stavu (ne Autopilot).
      setIsGenerated(false);
      setGeneratedParams(null);
      setSubjects([...MOCK_SUBJECTS]);
      setSelectedSubject(MOCK_SUBJECTS[0] ?? "");
      setEditableBody(INITIAL_EMAIL_BODY);
      setEditorKey((k) => k + 1);
      setPdfFile(null);
      setTargetUrl("");
      setEmailTarget("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
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
          typeof result.error === "string"
            ? result.error
            : "Generování předmětů selhalo. Zkuste to prosím znovu.",
        );
        return;
      }

      if (result.success && result.data?.subjects?.length) {
        setSubjects(result.data.subjects);
        setSelectedSubject(result.data.subjects[0] ?? selectedSubject);
        toast.success(t("sniper.subjectsRefreshed"));
      } else {
        toast.error(t("sniper.subjectsFailed"));
      }
    } catch (e) {
      console.error("SNIPER CLIENT (subjects):", e);
      toast.error(t("sniper.subjectsFailed"));
    } finally {
      setIsRefreshingSubjects(false);
    }
  };

  const handleOpenRecent = (item: SniperRecentItem) => {
    setTargetUrl(item.targetUrl);
    setEmailTarget(item.contactEmail);
    setSelectedOffer(item.selectedOffer || SNIPER_AUTODETECT_VALUE);
    setTone(item.tone || "friendly");
    setLanguage(item.language || "cs");
    setLanguageManualOverride(true);
    setSubjects(item.subjects.length > 0 ? item.subjects : [...MOCK_SUBJECTS]);
    setSelectedSubject(
      item.selectedSubject || item.subjects[0] || MOCK_SUBJECTS[0] || "",
    );
    setEditableBody(item.body || INITIAL_EMAIL_BODY);
    setEditorKey((k) => k + 1);
    setGeneratedParams({
      segment: item.segment,
      tone: item.tone || "friendly",
      language: item.language || "cs",
      analysis: item.analysis,
    });
    setIsGenerated(true);
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success(t("sniper.recentRestored"));
  };

  const hasCredits = (creditsLeft ?? 1) > 0;

  const dateLocale =
    uiLanguage === "cz"
      ? "cs-CZ"
      : uiLanguage === "de"
        ? "de-DE"
        : uiLanguage === "es"
          ? "es-ES"
          : "en-GB";

  return (
    <>
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-y-auto pb-6 scrollbar-hide",
          !isGenerated && "overflow-hidden",
        )}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.type && f.type !== "application/pdf") {
                toast.error(t("sniper.pdfOnly"));
                e.target.value = "";
                return;
              }
              setPdfFile(f ?? null);
            }}
          />

          {/* Desktop form card */}
          <div className="relative flex shrink-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("sniper.targetUrlLabel")}
                </label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    className="h-11 rounded-xl pl-9 text-sm"
                    placeholder="https://domain.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    autoComplete="off"
                    name="target-url-field-x-desktop"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("sniper.contactEmail")}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    className="h-11 rounded-xl pl-9 text-sm"
                    placeholder="info@domain.com"
                    value={emailTarget}
                    onChange={(e) => setEmailTarget(e.target.value)}
                    autoComplete="off"
                    name="target-email-field-y-desktop"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("sniper.offerType")}
                </label>
                <Select value={selectedOffer} onValueChange={setSelectedOffer}>
                  <SelectTrigger className="h-11 w-full rounded-xl text-sm outline-none ring-0 focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0">
                    <SelectValue placeholder={t("sniper.offerType")} />
                  </SelectTrigger>
                  <SelectContent className="z-50 rounded-xl border-border/50 bg-card shadow-xl">
                    {SNIPER_OFFER_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className={cn(
                          "cursor-pointer",
                          option.value === SNIPER_AUTODETECT_VALUE &&
                            "font-medium",
                        )}
                      >
                        {option.value === SNIPER_AUTODETECT_VALUE
                          ? t("sniper.autoDetect")
                          : tService(t, option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end justify-end pb-0.5">
                <div
                  className={cn(
                    "flex max-w-full items-center gap-0.5 rounded-md border",
                    pdfFile
                      ? "border-border/70 bg-muted/60 pr-0.5"
                      : "border-transparent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left text-[11px] font-medium transition-colors",
                      pdfFile
                        ? "rounded-md text-foreground hover:bg-muted/80"
                        : "lowercase tracking-normal text-muted-foreground hover:text-foreground hover:underline",
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    {pdfFile ? (
                      <span className="min-w-0 truncate" title={pdfFile.name}>
                        {truncateFilename(pdfFile.name)}
                      </span>
                    ) : (
                      <span className="lowercase tracking-normal">
                        {t("sniper.addPdfContext")}
                      </span>
                    )}
                  </button>
                  {pdfFile ? (
                    <button
                      type="button"
                      aria-label="Odebrat PDF"
                      className="inline-flex shrink-0 rounded p-1 text-muted-foreground hover:bg-background/90 hover:text-foreground"
                      onClick={() => {
                        setPdfFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label="Parametry zprávy"
                    className="sk-press-btn h-11 w-11 shrink-0 rounded-xl p-0"
                  >
                    <Settings2 className="h-4 w-4" />
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
                      <h4 className="sk-type-h3">Parametry zprávy</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Změňte výchozí nastavení pro tento konkrétní e-mail.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t("sniper.outputLanguage")}
                        </label>
                        <Select
                          value={language}
                          onValueChange={handleLanguageChange}
                        >
                          <SelectTrigger className="h-9 rounded-lg bg-background text-xs">
                            <SelectValue placeholder={t("sniper.outputLanguage")} />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card shadow-lg">
                            {SNIPER_LANGUAGES.map(({ value }) => (
                              <SelectItem key={value} value={value}>
                                <span className="inline-flex items-center gap-2">
                                  <LanguageFlag code={value} />
                                  {t(`sniper.languages.${value}`)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t("sniper.toneLabel")}
                        </label>
                        <Select value={tone} onValueChange={setTone}>
                          <SelectTrigger className="h-9 rounded-lg bg-background text-xs">
                            <SelectValue placeholder={t("sniper.tonePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent className="border-border/60 bg-card shadow-lg">
                            {Object.entries(toneMap).map(
                              ([value, { emoji }]) => (
                                <SelectItem key={value} value={value}>
                                  {emoji}{" "}
                                  {t(`sniper.tones.${value}`)}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                        {t("sniper.segmentAutoHint")}
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                variant="primary"
                onClick={() => void handleGenerate()}
                disabled={!hasCredits || !selectedOffer}
                aria-busy={isLoading}
                className={cn(
                  "h-11 flex-1 text-sm",
                  isLoading && "pointer-events-none",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("sniper.generating")}
                  </>
                ) : (
                  <>
                    {hasCredits ? t("sniper.generate") : t("sniper.insufficientCreditsShort")}
                    <Wand2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            {!hasCredits && (
              <div className="mt-1.5">
                <Link
                  href="/settings/billing"
                  className="text-xs text-blue-600 hover:underline"
                >
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
                    "pointer-events-none rounded-xl border border-border/70 bg-white p-4 shadow-xl ",
                    "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
                    "group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100",
                  )}
                >
                  <div className="space-y-3">
                    {SNIPER_HELP_SECTIONS.map((section) => (
                      <div key={section.title}>
                        <p className="text-sm font-semibold text-foreground">
                          {section.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <span className="inline-flex cursor-default text-gray-400 transition-colors group-hover:text-gray-600 ">
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </div>
          </div>

          {!isGenerated ? (
            <SniperRecentPanel
              items={recentItems}
              onOpen={handleOpenRecent}
              title={t("sniper.recentTitle")}
              emptyHint={t("sniper.recentEmpty")}
              draftLabel={t("sniper.recentDraft")}
              sentLabel={t("sniper.recentSent")}
              openLabel={t("sniper.recentOpen")}
              dateLocale={dateLocale}
            />
          ) : null}

          {/* VÝSTUPNÍ E-MAIL */}
          {isGenerated && (
            <div className="rounded-2xl bg-muted/40 p-3 animate-in fade-in slide-in-from-top-8 duration-500 sm:rounded-2xl sm:border sm:border-border/60 sm:bg-card sm:p-6 sm:shadow-sm md:p-8">
              <div className="mb-3 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
                <h3 className="text-[15px] font-semibold text-foreground sm:text-lg">
                  Vygenerovaná sekvence
                </h3>

                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 ">
                    {generatedParams?.segment &&
                    segmentMap[generatedParams.segment]
                      ? `${segmentMap[generatedParams.segment].emoji} ${segmentMap[generatedParams.segment].label}`
                      : "🔍 Z webu"}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 ">
                    {toneMap[generatedParams?.tone ?? ""]?.emoji}{" "}
                    {toneMap[generatedParams?.tone ?? ""]?.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 ">
                    <LanguageFlag code={generatedParams?.language ?? ""} />
                    {SNIPER_LANGUAGE_LABELS[generatedParams?.language ?? ""] ??
                      (generatedParams?.language ?? "").toUpperCase()}
                  </span>
                </div>
              </div>

              {generatedParams?.analysis && (
                <div className="mb-3 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2.5 sm:mb-6 sm:rounded-xl sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 ">
                    Analýza webu
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-950/90 sm:mt-1.5 sm:text-sm">
                    {generatedParams.analysis}
                  </p>
                </div>
              )}

              <div className="space-y-3 sm:space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Předmět e-mailu
                  </Label>
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
                          if (
                            !Number.isFinite(i) ||
                            i < 0 ||
                            i >= subjects.length
                          )
                            return;
                          setSelectedSubject(subjects[i] ?? "");
                        }}
                      >
                        <SelectTrigger className="h-11 w-full rounded-xl border-border/50 bg-background px-3 py-2 text-sm outline-none ring-0 focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0">
                          <SelectValue placeholder="Vyberte předmět" />
                        </SelectTrigger>
                        <SelectContent className="bg-card shadow-xl border-border/50 rounded-xl">
                          {subjects.map((s, i) => (
                            <SelectItem
                              key={`${i}-${s}`}
                              value={String(i)}
                              className="cursor-pointer hover:bg-muted rounded-md"
                            >
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
                        isRefreshingSubjects || isLoading || !selectedOffer
                      }
                      className="flex items-center justify-center p-0 h-11 w-11 rounded-xl shrink-0 border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                      title={t("sniper.refreshSubjects")}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isRefreshingSubjects && "animate-spin",
                        )}
                      />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Text e-mailu (Můžete upravit)
                  </Label>
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
                  <Link
                    href={EMAIL_SETUP_SETTINGS_PATH}
                    className="font-semibold text-blue-600 hover:underline"
                  >
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
