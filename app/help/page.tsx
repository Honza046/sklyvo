"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { getHelpFaqs } from "@/lib/i18n/help-faqs";
import { restartOnboardingTour } from "@/app/actions/onboarding-tour";
import { toast } from "sonner";
import { 
  LifeBuoy, 
  Search, 
  Crosshair, 
  Radio, 
  Users, 
  Mail, 
  MessageCircle,
  ExternalLink,
  BookOpen,
  X,
  Rocket,
  PlayCircle,
  Loader2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HelpCenterPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const allFAQs = getHelpFaqs(language);
  const [activeModal, setActiveModal] = useState<"sniper" | "radar" | "crm" | "autopilot" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRestartingTour, setIsRestartingTour] = useState(false);

  const filteredFAQs = allFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof faq.answer === "string" && faq.answer.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const trimmedSearch = searchQuery.trim();
  const displayedFAQs = trimmedSearch === "" ? allFAQs.slice(0, 4) : filteredFAQs;
  const showEmptySearch = trimmedSearch !== "" && filteredFAQs.length === 0;

  const handleRestartTour = async () => {
    setIsRestartingTour(true);
    try {
      const result = await restartOnboardingTour();
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("venegard-tour-preview", "1");
      }
      toast.success("Spouštím prohlídku…");
      router.push("/?tour=1");
    } finally {
      setIsRestartingTour(false);
    }
  };

  return (
      <div className="flex min-h-full w-full flex-col items-center justify-start pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-0 md:pb-12">
        
        {/* HLAVIČKA A VYHLEDÁVÁNÍ */}
        <div
          data-tour="onboarding-help-page"
          className="mx-auto mb-4 w-full max-w-2xl space-y-3 text-center md:mb-8 md:space-y-6"
        >
          <div className="space-y-1 md:space-y-2">
            <div className="mb-1 flex items-center justify-center gap-2 md:mb-2 md:gap-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 shadow-sm dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-400 md:rounded-2xl md:p-3">
                <LifeBuoy className="h-5 w-5 md:h-8 md:w-8" />
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t("help.title")}
            </h1>
            <p className="px-2 text-xs text-muted-foreground md:text-sm">
              {t("help.subtitle")}
            </p>
          </div>

          <div className="relative w-full shadow-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 sm:left-4 sm:h-5 sm:w-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("help.searchPlaceholder")}
              className="h-10 rounded-xl border-border/60 bg-card pl-10 text-sm focus-visible:ring-blue-500 sm:h-14 sm:rounded-2xl sm:pl-12 sm:text-base"
            />
          </div>
        </div>

        <div className="flex w-full max-w-4xl flex-col gap-4 px-0 md:gap-8 md:px-4">
          {searchQuery.trim() === "" && (
            <>
              {/* RYCHLÍ PRŮVODCI (KARTY) */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveModal("sniper")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveModal("sniper");
                    }
                  }}
                  className="group cursor-pointer rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700 sm:rounded-2xl sm:p-6"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 sm:mb-4 sm:h-10 sm:w-10 sm:rounded-xl">
                    <Crosshair className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="mb-0.5 text-sm font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 sm:mb-1 sm:text-base">
                    {t("help.guideSniper")}
                  </h3>
                  <p className="text-[10px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                    {t("help.guideSniperDesc")}
                  </p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveModal("radar")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveModal("radar");
                    }
                  }}
                  className="group cursor-pointer rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700 sm:rounded-2xl sm:p-6"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 sm:mb-4 sm:h-10 sm:w-10 sm:rounded-xl">
                    <Radio className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="mb-0.5 text-sm font-bold transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400 sm:mb-1 sm:text-base">
                    {t("help.guideRadar")}
                  </h3>
                  <p className="text-[10px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                    {t("help.guideRadarDesc")}
                  </p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveModal("crm")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveModal("crm");
                    }
                  }}
                  className="group cursor-pointer rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700 sm:rounded-2xl sm:p-6"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 sm:mb-4 sm:h-10 sm:w-10 sm:rounded-xl">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="mb-0.5 text-sm font-bold transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400 sm:mb-1 sm:text-base">
                    {t("help.guideCrm")}
                  </h3>
                  <p className="text-[10px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                    {t("help.guideCrmDesc")}
                  </p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveModal("autopilot")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveModal("autopilot");
                    }
                  }}
                  className="group cursor-pointer rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700 sm:rounded-2xl sm:p-6"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400 sm:mb-4 sm:h-10 sm:w-10 sm:rounded-xl">
                    <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="mb-0.5 text-sm font-bold transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 sm:mb-1 sm:text-base">
                    {t("help.guideAutopilot")}
                  </h3>
                  <p className="text-[10px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                    {t("help.guideAutopilotDesc")}
                  </p>
                </div>
              </div>

              <div className="my-1 h-px w-full bg-border/40 md:my-2" />
            </>
          )}

          {/* NEJČASTĚJŠÍ DOTAZY (FAQ) */}
          <div>
            <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-100 p-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:p-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h2 className="text-base font-bold sm:text-xl">{t("help.faqTitle")}</h2>
            </div>

            {showEmptySearch ? (
              <p className="py-4 text-center text-gray-500 dark:text-muted-foreground">
                {t("help.faqEmpty")}
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-2 sm:space-y-3">
                {displayedFAQs.map((faq) => (
                  <AccordionItem
                    key={faq.question}
                    value={`faq-${allFAQs.findIndex((f) => f.question === faq.question)}`}
                    className="rounded-xl border border-border/60 bg-card px-3 py-1 shadow-sm transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800 sm:rounded-2xl sm:px-6 sm:py-2"
                  >
                    <AccordionTrigger className="py-3 text-left text-sm font-semibold hover:no-underline sm:py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-3 text-xs leading-relaxed text-muted-foreground sm:pb-4 sm:text-sm">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          {/* KONTAKT NA PODPORU */}
          <div className="mt-4 mb-2 flex flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center dark:border-blue-800/60 dark:bg-blue-900/10 sm:mt-8 sm:mb-0 sm:rounded-2xl sm:p-8">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-400 sm:mb-4 sm:h-12 sm:w-12">
              <MessageCircle className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <h3 className="mb-1 text-base font-bold sm:mb-2 sm:text-lg">{t("help.contactTitle")}</h3>
            <p className="mx-auto mb-3 max-w-md text-xs text-muted-foreground sm:mb-6 sm:text-sm">
              {t("help.contactDesc")}
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
              <Button asChild className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:h-11 sm:rounded-xl sm:px-6">
                <a href="mailto:podpora@venegard.com?subject=Dotaz z aplikace">
                  <Mail className="mr-2 h-4 w-4" /> {t("help.contactEmail")}
                </a>
              </Button>
              <Button asChild variant="outline" className="h-9 rounded-lg border-border/60 bg-background px-4 text-sm font-semibold hover:bg-muted sm:h-11 sm:rounded-xl sm:px-6">
                <a href="https://youtube.com" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> {t("help.contactVideos")}
                </a>
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={isRestartingTour}
              onClick={() => void handleRestartTour()}
              className="mt-3 h-9 text-xs font-medium text-blue-700 hover:bg-blue-100/80 hover:text-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/40"
            >
              {isRestartingTour ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Spustit UI prohlídku znovu
            </Button>
          </div>

        </div>

        {activeModal !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
            role="presentation"
          >
            <div
              className="relative w-full max-w-2xl rounded-xl border border-border/60 bg-white p-8 shadow-xl dark:bg-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setActiveModal(null)}
                aria-label="Zavřít"
              >
                <X className="h-5 w-5" />
              </button>

              {activeModal === "sniper" && (
                <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🎯</span> Jak ovládat Snipera
                </h2>
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                  <p>
                    <strong>Sniper</strong> je váš hlavní nástroj pro direct outreach (cold e-mailing). Slouží k automatizovanému, ale vysoce personalizovanému oslovování potenciálních klientů.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Výběr cílů:</strong> Do kampaně můžete zařadit leady, které jste objevili přes Radar, nebo si nahrát vlastní seznam kontaktů (CSV).</li>
                    <li><strong>Tvorba zpráv:</strong> Vytvořte poutavý text e-mailu. Používejte proměnné jako <em>[Jméno]</em> nebo <em>[Firma]</em>, aby každá zpráva působila, že je psaná ručně.</li>
                    <li><strong>Automatické Follow-upy:</strong> Většina obchodů se uzavírá až po několika urgencích. Sniper za vás automaticky pošle další zprávu, pokud klient na tu první neodpoví.</li>
                    <li><strong>Ochrana domény:</strong> Systém rozesílá zprávy postupně a simuluje lidské chování. Tím chráníme vaše e-maily před pádem do spamu.</li>
                  </ul>
                  <p className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg">
                    💡 <strong>Profi tip:</strong> Snažte se být v prvním e-mailu struční. Neprodávejte hned, ale snažte se vyvolat zvědavost a domluvit si hovor.
                  </p>
                </div>
              </div>
              )}
              {activeModal === "radar" && (
                <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📡</span> Jak na Radar
                </h2>
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                  <p>
                    <strong>Radar (Auto Prospector)</strong> je váš hlavní nástroj pro vyhledávání nových obchodních příležitostí. Najde vám relevantní firmy a přesné kontakty na lidi, kteří o nich rozhodují.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Vyhledávání firem:</strong> Zadejte obor, klíčová slova nebo lokalitu. Radar prohledá databáze a sestaví vám seznam potenciálních klientů přesně na míru.</li>
                    <li><strong>Deep Scan kontaktů:</strong> U vybraných firem systém automaticky dohledá e-maily na klíčové osoby, telefony a profily na sociálních sítích.</li>
                    <li><strong>Filtrování:</strong> Výsledky si můžete jednoduše třídit podle velikosti firmy, pozice člověka v nápovědě nebo jiných kritérií.</li>
                    <li><strong>Odeslání do kampaně:</strong> Všechny slibné kontakty, které v Radaru najdete, můžete jedním kliknutím poslat rovnou do Snipera k oslovení.</li>
                  </ul>
                  <p className="mt-4 p-3 bg-emerald-50 text-emerald-800 rounded-lg">
                    💡 <strong>Profi tip:</strong> Čím specifičtější klíčová slova do Radaru zadáte, tím relevantnější leady získáte a tím lépe se vám bude psát úvodní e-mail.
                  </p>
                </div>
              </div>
              )}
              {activeModal === "crm" && (
                <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🤝</span> CRM a Integrace
                </h2>
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                  <p>
                    V této sekci udržujete pořádek ve všech rozehraných obchodech a propojujete systém s vašimi stávajícími nástroji.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Zabudované CRM</h3>
                      <p>Jakmile kampaň běží, stavy leadů se automaticky aktualizují. Přesně vidíte, kdo už dostal e-mail, kdo odpověděl a u koho čekáte na schůzku. Systém vás sám upozorní v sekci "K řešení", když klient odepíše.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Možnosti propojení</h3>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>E-mailové schránky:</strong> Připojení Google Workspace, Microsoft 365 nebo vlastního SMTP/IMAP pro odesílání zpráv.</li>
                        <li><strong>Externí CRM (Pipedrive, HubSpot):</strong> Automatické přepisování domluvených schůzek z naší aplikace do vašeho hlavního podnikového CRM.</li>
                        <li><strong>Make.com / Zapier:</strong> Vytváření pokročilých automatizací (např. odeslání zprávy na Slack při pozitivní odpovědi klienta).</li>
                      </ul>
                    </div>
                  </div>
                  <p className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-lg">
                    ⚙️ <strong>Kde to najdu:</strong> Všechny e-mailové účty, API klíče a webhooky se nastavují v hlavní sekci Nastavení - Integrace.
                  </p>
                </div>
              </div>
              )}
              {activeModal === "autopilot" && (
                <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 dark:text-foreground">
                  <Rocket className="h-5 w-5 text-violet-600 dark:text-violet-400" /> Jak na Autopilot
                </h2>
                <div className="space-y-4 text-sm text-gray-600 leading-relaxed dark:text-muted-foreground">
                  <p>
                    <strong>Autopilot</strong> je váš plně automatizovaný systém, který spojuje celý proces outreach kampaní do jednoho plynulého cyklu. Skládá se ze 3 hlavních možností/kroků:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Sběr firem:</strong> Automatické vyhledávání a stahování nových leadů a firem z databáze na základě vašich zadaných kritérií.</li>
                    <li><strong>Odesílání:</strong> Plně automatizované sekvence e-mailů a sledování follow-upů bez nutnosti vaší neustálé kontroly.</li>
                    <li><strong>Full Auto:</strong> Kompletní autopilot, který spojí vyhledávání i odesílání dohromady a běží nepřetržitě na pozadí.</li>
                  </ul>
                  <p className="mt-4 p-3 bg-violet-50 text-violet-800 rounded-lg dark:bg-violet-900/20 dark:text-violet-200">
                    💡 <strong>Profi tip:</strong> Než zapnete režim Full Auto, otestujte si kvalitu vygenerovaných textů a segmentů ručně v záložce Sniper.
                  </p>
                </div>
              </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}