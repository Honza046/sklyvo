"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { getHelpFaqs } from "@/lib/i18n/help-faqs";
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
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HelpCenterPage() {
  const { t, language } = useLanguage();
  const allFAQs = getHelpFaqs(language);
  const [activeModal, setActiveModal] = useState<"sniper" | "radar" | "crm" | "autopilot" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQs = allFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof faq.answer === "string" && faq.answer.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const trimmedSearch = searchQuery.trim();
  const displayedFAQs = trimmedSearch === "" ? allFAQs.slice(0, 4) : filteredFAQs;
  const showEmptySearch = trimmedSearch !== "" && filteredFAQs.length === 0;

  return (
      <div className="flex h-full w-full flex-col items-center justify-start pt-0 pb-12">
        
        {/* HLAVIČKA A VYHLEDÁVÁNÍ */}
        <div className="mb-8 text-center space-y-6 w-full max-w-2xl mx-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800/50">
                <LifeBuoy className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {t("help.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("help.subtitle")}
            </p>
          </div>

          <div className="relative w-full shadow-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("help.searchPlaceholder")}
              className="h-14 rounded-2xl border-border/60 bg-card pl-12 text-base focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex w-full max-w-4xl flex-col gap-8 px-4">
          {searchQuery.trim() === "" && (
            <>
              {/* RYCHLÍ PRŮVODCI (KARTY) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  className="group cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Crosshair className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 text-base font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {t("help.guideSniper")}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
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
                  className="group cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Radio className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 text-base font-bold transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {t("help.guideRadar")}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
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
                  className="group cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 text-base font-bold transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    {t("help.guideCrm")}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
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
                  className="group cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 text-base font-bold transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400">
                    {t("help.guideAutopilot")}
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("help.guideAutopilotDesc")}
                  </p>
                </div>
              </div>

              <div className="my-2 h-px w-full bg-border/40" />
            </>
          )}

          {/* NEJČASTĚJŠÍ DOTAZY (FAQ) */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">{t("help.faqTitle")}</h2>
            </div>

            {showEmptySearch ? (
              <p className="py-4 text-center text-gray-500 dark:text-muted-foreground">
                {t("help.faqEmpty")}
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-3">
                {displayedFAQs.map((faq) => (
                  <AccordionItem
                    key={faq.question}
                    value={`faq-${allFAQs.findIndex((f) => f.question === faq.question)}`}
                    className="rounded-2xl border border-border/60 bg-card px-6 py-2 shadow-sm transition-colors data-[state=open]:border-blue-200 dark:data-[state=open]:border-blue-800"
                  >
                    <AccordionTrigger className="text-left font-semibold hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          {/* KONTAKT NA PODPORU */}
          <div className="mt-8 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-900/10 p-8 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t("help.contactTitle")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {t("help.contactDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 font-semibold shadow-sm cursor-pointer">
                <a href="mailto:podpora@venegard.com?subject=Dotaz z aplikace">
                  <Mail className="mr-2 h-4 w-4" /> {t("help.contactEmail")}
                </a>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl border-border/60 px-6 font-semibold bg-background hover:bg-muted cursor-pointer">
                <a href="https://youtube.com" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> {t("help.contactVideos")}
                </a>
              </Button>
            </div>
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