"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getHelpFaqSections } from "@/lib/i18n/help-faqs";
import { restartOnboardingTour } from "@/app/actions/onboarding-tour";
import { toast } from "sonner";
import {
  Crosshair,
  Radio,
  Users,
  Mail,
  X,
  Rocket,
  PlayCircle,
  Loader2,
  ChevronRight,
  LifeBuoy,
} from "lucide-react";
import {
  SklyBotChat,
  type SklyBotChatHandle,
} from "@/components/support/skly-bot-chat";
import { cn } from "@/lib/utils";

type GuideId = "sniper" | "radar" | "crm" | "autopilot";

const GUIDE_META: Record<
  GuideId,
  { icon: typeof Crosshair; titleKey: string; descKey: string }
> = {
  sniper: {
    icon: Crosshair,
    titleKey: "help.guideSniper",
    descKey: "help.guideSniperDesc",
  },
  radar: {
    icon: Radio,
    titleKey: "help.guideRadar",
    descKey: "help.guideRadarDesc",
  },
  crm: {
    icon: Users,
    titleKey: "help.guideCrm",
    descKey: "help.guideCrmDesc",
  },
  autopilot: {
    icon: Rocket,
    titleKey: "help.guideAutopilot",
    descKey: "help.guideAutopilotDesc",
  },
};

export default function SupportPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const faqSections = getHelpFaqSections(language);
  const chatRef = useRef<SklyBotChatHandle>(null);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<GuideId | null>(null);
  const [isRestartingTour, setIsRestartingTour] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

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
      toast.success(t("tour.starting"));
      router.push("/?tour=1");
    } finally {
      setIsRestartingTour(false);
    }
  };

  return (
    <div
      data-tour="onboarding-help-page"
      className={cn(
        "sk-support scrollbar-hide",
        chatExpanded ? "sk-support--chat" : "sk-support--hub",
      )}
    >
      {!chatExpanded && (
        <header className="sk-support__hero mb-3 shrink-0 sm:mb-4 md:mb-5">
          <div className="sk-page-badge" aria-hidden>
            <LifeBuoy strokeWidth={2} />
          </div>
          <h1 className="sk-type-h1 sk-support__hero-title">{t("help.title")}</h1>
          <p className="sk-type-body sk-support__hero-sub">
            {t("help.subtitle")}
          </p>
        </header>
      )}

      <div className="sk-support__stack">
        <div
          className={cn(
            "sk-support__chat-slot",
            chatExpanded
              ? "sk-support__chat-slot--expanded"
              : "sk-support__chat-slot--teaser",
          )}
        >
          <SklyBotChat
            ref={chatRef}
            className={chatExpanded ? "min-h-0 flex-1" : undefined}
            variant={chatExpanded ? "fullscreen" : "teaser"}
            onExpand={() => setChatExpanded(true)}
            onCollapse={() => setChatExpanded(false)}
          />
        </div>

        {!chatExpanded && (
          <section className="sk-support__section">
            <h2 className="sk-support__section-title">
              {t("help.guidesTitle")}
            </h2>
            <div className="sk-support__topics">
              {(Object.keys(GUIDE_META) as GuideId[]).map((id) => {
                const meta = GUIDE_META[id];
                const Icon = meta.icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveModal(id)}
                    className="sk-help-card sk-support__topic"
                  >
                    <span className="sk-help-icon sk-support__topic-icon">
                      <Icon strokeWidth={2} />
                    </span>
                    <span className="sk-support__topic-copy">
                      <span className="sk-support__topic-title">
                        {t(meta.titleKey)}
                      </span>
                      <span className="sk-support__topic-desc">
                        {t(meta.descKey)}
                      </span>
                    </span>
                    <ChevronRight
                      className="sk-support__topic-chevron"
                      aria-hidden
                      strokeWidth={2}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {!chatExpanded && (
          <section className="sk-support__section sk-support__section--faq">
            <h2 className="sk-support__section-title">{t("help.faqTitle")}</h2>
            <div className="sk-support__faq-topics">
              {faqSections.map((section) => (
                <div key={section.id} className="sk-support__faq-topic">
                  <h3 className="sk-support__faq-topic-title">{section.title}</h3>
                  <ul className="sk-support__faq-links">
                    {section.items.map((faq) => {
                      const open = openFaq === faq.question;
                      return (
                        <li key={faq.question}>
                          <button
                            type="button"
                            className={cn(
                              "sk-support__faq-link",
                              open && "sk-support__faq-link--open",
                            )}
                            aria-expanded={open}
                            onClick={() =>
                              setOpenFaq(open ? null : faq.question)
                            }
                          >
                            {faq.question}
                            {open ? null : (
                              <ChevronRight
                                className="sk-support__faq-link-arrow"
                                aria-hidden
                                strokeWidth={2}
                              />
                            )}
                          </button>
                          {open ? (
                            <p className="sk-support__faq-answer">{faq.answer}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {!chatExpanded && (
          <footer className="sk-support__footer">
            <div className="sk-support__footer-actions">
              <a
                href="mailto:podpora@venegard.com?subject=Dotaz z aplikace"
                className="sk-support__footer-btn"
              >
                <Mail className="h-3.5 w-3.5" strokeWidth={2} />
                {t("help.contactEmail")}
              </a>
              <button
                type="button"
                disabled={isRestartingTour}
                onClick={() => void handleRestartTour()}
                className="sk-support__footer-btn"
              >
                {isRestartingTour ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {t("help.restartTour")}
              </button>
            </div>
          </footer>
        )}
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
              <GuideBody
                title="Jak ovládat Snipera"
                icon={<Crosshair strokeWidth={2} />}
              >
                <p>
                  <strong>Sniper</strong> je váš hlavní nástroj pro direct
                  outreach (cold e-mailing).
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Výběr cílů:</strong> Leady z Radaru nebo vlastní
                    CSV.
                  </li>
                  <li>
                    <strong>Tvorba zpráv:</strong> Proměnné jako{" "}
                    <em>[Jméno]</em> / <em>[Firma]</em>.
                  </li>
                  <li>
                    <strong>Follow-upy:</strong> Další zpráva, když klient
                    neodpoví.
                  </li>
                </ul>
                <p className="sk-help-tip mt-4 p-3 text-sm">
                  <strong>Profi tip:</strong> V prvním e-mailu buďte struční.
                </p>
              </GuideBody>
            )}

            {activeModal === "radar" && (
              <GuideBody
                title="Jak na Radar"
                icon={<Radio strokeWidth={2} />}
              >
                <p>
                  <strong>Radar</strong> najde relevantní firmy a rozhodovací
                  kontakty.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Vyhledávání:</strong> Obor, klíčová slova, lokalita.
                  </li>
                  <li>
                    <strong>Deep Scan:</strong> E-maily, telefony, profily.
                  </li>
                  <li>
                    <strong>Do kampaně:</strong> Jedním klikem do Snipera /
                    Autopilota.
                  </li>
                </ul>
              </GuideBody>
            )}

            {activeModal === "crm" && (
              <GuideBody
                title="CRM a Integrace"
                icon={<Users strokeWidth={2} />}
              >
                <p>
                  Pipeline leadů a propojení s e-mailem i externími nástroji.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <strong>E-mail:</strong> Google, Microsoft 365, SMTP/IMAP.
                  </li>
                  <li>
                    <strong>CRM:</strong> Pipedrive, HubSpot…
                  </li>
                  <li>
                    <strong>Automatizace:</strong> Make.com / Zapier.
                  </li>
                </ul>
                <p className="sk-help-tip mt-4 p-3 text-sm">
                  <strong>Kde:</strong> Nastavení → Integrace.
                </p>
              </GuideBody>
            )}

            {activeModal === "autopilot" && (
              <GuideBody
                title="Jak na Autopilot"
                icon={<Rocket strokeWidth={2} />}
              >
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong>Sběr firem:</strong> Automatické hledání leadů.
                  </li>
                  <li>
                    <strong>Odesílání:</strong> Sekvence a follow-upy.
                  </li>
                  <li>
                    <strong>Full Auto:</strong> Sběr i odesílání na pozadí.
                  </li>
                </ul>
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
      <h2 className="sk-type-h2 mb-4 flex items-center gap-3">
        <span className="sk-help-icon">{icon}</span>
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
