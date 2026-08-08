"use client";

import { useState, type ReactNode } from "react";
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

type GuideId = "sniper" | "radar" | "crm" | "autopilot";

const GUIDE_META: Record<
  GuideId,
  { accent: string; icon: typeof Crosshair; titleKey: string; descKey: string }
> = {
  sniper: {
    accent: "#02a7ff",
    icon: Crosshair,
    titleKey: "help.guideSniper",
    descKey: "help.guideSniperDesc",
  },
  radar: {
    accent: "#059669",
    icon: Radio,
    titleKey: "help.guideRadar",
    descKey: "help.guideRadarDesc",
  },
  crm: {
    accent: "#d97706",
    icon: Users,
    titleKey: "help.guideCrm",
    descKey: "help.guideCrmDesc",
  },
  autopilot: {
    accent: "#02a7ff",
    icon: Rocket,
    titleKey: "help.guideAutopilot",
    descKey: "help.guideAutopilotDesc",
  },
};

export default function HelpCenterPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const allFAQs = getHelpFaqs(language);
  const [activeModal, setActiveModal] = useState<GuideId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRestartingTour, setIsRestartingTour] = useState(false);

  const filteredFAQs = allFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof faq.answer === "string" &&
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())),
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
        window.sessionStorage.setItem("sklyvo-tour-preview", "1");
      }
      toast.success("Spouštím prohlídku…");
      router.push("/?tour=1");
    } finally {
      setIsRestartingTour(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-start pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-0 md:pb-12">
      <div
        data-tour="onboarding-help-page"
        className="mx-auto mb-4 w-full max-w-2xl space-y-3 text-center md:mb-8 md:space-y-6"
      >
        <div className="space-y-1 md:space-y-2">
          <div className="mb-1 flex items-center justify-center md:mb-2">
            <span className="sk-settings-icon !h-12 !w-12 !rounded-[14px]">
              <LifeBuoy className="h-6 w-6" strokeWidth={2.25} />
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {t("help.title")}
          </h1>
          <p className="px-2 text-xs text-muted-foreground md:text-sm">{t("help.subtitle")}</p>
        </div>

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 sm:left-4 sm:h-5 sm:w-5" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("help.searchPlaceholder")}
            className="h-10 rounded-xl pl-10 text-sm sm:h-14 sm:rounded-2xl sm:pl-12 sm:text-base"
          />
        </div>
      </div>

      <div className="flex w-full max-w-4xl flex-col gap-4 px-0 md:gap-8 md:px-4">
        {searchQuery.trim() === "" && (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
              {(Object.keys(GUIDE_META) as GuideId[]).map((id) => {
                const meta = GUIDE_META[id];
                const Icon = meta.icon;
                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveModal(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveModal(id);
                      }
                    }}
                    className="sk-help-card p-3 text-left sm:p-6"
                    style={{ ["--sk-help-accent" as string]: meta.accent }}
                  >
                    <div className="sk-help-icon mb-2 sm:mb-4">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <h3 className="mb-0.5 text-sm font-bold text-[color:var(--sk-ink)] sm:mb-1 sm:text-base">
                      {t(meta.titleKey)}
                    </h3>
                    <p className="text-[10px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">
                      {t(meta.descKey)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="my-1 h-px w-full bg-[rgba(210,225,238,0.7)] md:my-2" />
          </>
        )}

        <div>
          <div className="mb-3 flex items-center gap-3 sm:mb-6">
            <span className="sk-chip sk-chip--muted !h-9 !w-9 !rounded-xl">
              <BookOpen className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </span>
            <h2 className="text-base font-bold sm:text-xl">{t("help.faqTitle")}</h2>
          </div>

          {showEmptySearch ? (
            <p className="sk-surface--empty text-muted-foreground">{t("help.faqEmpty")}</p>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-2 sm:space-y-3">
              {displayedFAQs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${allFAQs.findIndex((f) => f.question === faq.question)}`}
                  className="sk-help-faq border-none px-3 py-1 sm:px-6 sm:py-2"
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

        <div className="sk-help-contact mt-4 mb-2 flex flex-col items-center justify-center p-4 text-center sm:mt-8 sm:mb-0 sm:p-8">
          <span
            className="sk-help-icon mb-2 sm:mb-4"
            style={{ ["--sk-help-accent" as string]: "#02a7ff" }}
          >
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <h3 className="mb-1 text-base font-bold sm:mb-2 sm:text-lg">{t("help.contactTitle")}</h3>
          <p className="mx-auto mb-3 max-w-md text-xs text-muted-foreground sm:mb-6 sm:text-sm">
            {t("help.contactDesc")}
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <Button asChild className="h-9 rounded-xl px-4 text-sm sm:h-11 sm:px-6">
              <a href="mailto:podpora@venegard.com?subject=Dotaz z aplikace">
                <Mail className="mr-2 h-4 w-4" /> {t("help.contactEmail")}
              </a>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-xl px-4 text-sm sm:h-11 sm:px-6">
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
            className="mt-3 h-auto px-0 text-xs font-medium text-[color:var(--sk-brand)] shadow-none hover:bg-transparent hover:text-[color:var(--sk-ink)]"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,40,70,0.35)] p-4 backdrop-blur-[6px]"
          onClick={() => setActiveModal(null)}
          role="presentation"
        >
          <div
            className="sk-help-modal relative w-full max-w-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              ["--sk-help-accent" as string]: GUIDE_META[activeModal].accent,
            }}
          >
            <button
              type="button"
              className="sk-press-btn absolute right-4 top-4 h-9 w-9 rounded-xl p-0"
              onClick={() => setActiveModal(null)}
              aria-label="Zavřít"
            >
              <X className="mx-auto h-4 w-4" />
            </button>

            {activeModal === "sniper" && (
              <GuideBody title="Jak ovládat Snipera" icon={<Crosshair className="h-5 w-5" />}>
                <p>
                  <strong>Sniper</strong> je váš hlavní nástroj pro direct outreach (cold e-mailing).
                  Slouží k automatizovanému, ale vysoce personalizovanému oslovování potenciálních
                  klientů.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Výběr cílů:</strong> Do kampaně můžete zařadit leady z Radaru, nebo si
                    nahrát vlastní seznam kontaktů (CSV).
                  </li>
                  <li>
                    <strong>Tvorba zpráv:</strong> Používejte proměnné jako <em>[Jméno]</em> nebo{" "}
                    <em>[Firma]</em>, aby každá zpráva působila ručně psaná.
                  </li>
                  <li>
                    <strong>Automatické Follow-upy:</strong> Sniper pošle další zprávu, pokud klient
                    na tu první neodpoví.
                  </li>
                  <li>
                    <strong>Ochrana domény:</strong> Systém rozesílá postupně a simuluje lidské
                    chování.
                  </li>
                </ul>
                <p className="sk-help-tip mt-4 p-3 text-sm">
                  <strong>Profi tip:</strong> V prvním e-mailu buďte struční. Nesnažte se hned
                  prodat — vyvolejte zvědavost a domluvte si hovor.
                </p>
              </GuideBody>
            )}

            {activeModal === "radar" && (
              <GuideBody title="Jak na Radar" icon={<Radio className="h-5 w-5" />}>
                <p>
                  <strong>Radar (Auto Prospector)</strong> najde relevantní firmy a kontakty na lidi,
                  kteří o nich rozhodují.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Vyhledávání firem:</strong> Zadejte obor, klíčová slova nebo lokalitu.
                  </li>
                  <li>
                    <strong>Deep Scan kontaktů:</strong> Dohledá e-maily, telefony a sociální
                    profily.
                  </li>
                  <li>
                    <strong>Filtrování:</strong> Tříďte podle velikosti firmy nebo pozice.
                  </li>
                  <li>
                    <strong>Odeslání do kampaně:</strong> Slibné kontakty pošlete jedním kliknutím do
                    Snipera.
                  </li>
                </ul>
                <p className="sk-help-tip mt-4 p-3 text-sm">
                  <strong>Profi tip:</strong> Čím specifičtější klíčová slova, tím relevantnější
                  leady.
                </p>
              </GuideBody>
            )}

            {activeModal === "crm" && (
              <GuideBody title="CRM a Integrace" icon={<Users className="h-5 w-5" />}>
                <p>
                  V této sekci udržujete pořádek ve rozehraných obchodech a propojujete systém s
                  vašimi nástroji.
                </p>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-[color:var(--sk-ink)]">Zabudované CRM</h3>
                    <p>
                      Stavy leadů se aktualizují automaticky. Systém vás upozorní v sekci „K řešení“,
                      když klient odepíše.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[color:var(--sk-ink)]">Možnosti propojení</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        <strong>E-mailové schránky:</strong> Google Workspace, Microsoft 365 nebo
                        SMTP/IMAP.
                      </li>
                      <li>
                        <strong>Externí CRM:</strong> Pipedrive, HubSpot a další.
                      </li>
                      <li>
                        <strong>Make.com / Zapier:</strong> Pokročilé automatizace.
                      </li>
                    </ul>
                  </div>
                </div>
                <p className="sk-help-tip mt-4 p-3 text-sm">
                  <strong>Kde to najdu:</strong> Účty, API klíče a webhooky jsou v Nastavení →
                  Integrace.
                </p>
              </GuideBody>
            )}

            {activeModal === "autopilot" && (
              <GuideBody title="Jak na Autopilot" icon={<Rocket className="h-5 w-5" />}>
                <p>
                  <strong>Autopilot</strong> spojuje outreach do jednoho automatizovaného cyklu:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Sběr firem:</strong> Automatické vyhledávání leadů podle kritérií.
                  </li>
                  <li>
                    <strong>Odesílání:</strong> Sekvence e-mailů a follow-upy bez ruční kontroly.
                  </li>
                  <li>
                    <strong>Full Auto:</strong> Sběr i odesílání běží nepřetržitě na pozadí.
                  </li>
                </ul>
                <p className="sk-help-tip mt-4 p-3 text-sm">
                  <strong>Profi tip:</strong> Než zapnete Full Auto, otestujte texty ručně ve
                  Sniperovi.
                </p>
              </GuideBody>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GuideBody({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-[color:var(--sk-ink)]">
        <span className="sk-help-icon">{icon}</span>
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
