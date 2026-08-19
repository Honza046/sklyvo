"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getHelpFaqSections } from "@/lib/i18n/help-faqs";
import { restartOnboardingTour } from "@/app/actions/onboarding-tour";
import { toast } from "sonner";
import {
  ChevronRight,
  Loader2,
  Mail,
  PlayCircle,
} from "lucide-react";
import { SklyBotChat } from "@/components/support/skly-bot-chat";
import { LegalDocumentLinks } from "@/components/legal/legal-document-links";
import { SKLYVO_BRAND } from "@/lib/sklyvo-brand";

export default function SupportPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const faqSections = getHelpFaqSections(language);
  const [openFaq, setOpenFaq] = useState<string[]>([]);
  const [isRestartingTour, setIsRestartingTour] = useState(false);

  const toggleFaq = (question: string) => {
    setOpenFaq((prev) =>
      prev.includes(question)
        ? prev.filter((q) => q !== question)
        : [...prev, question],
    );
  };

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
    <div data-tour="onboarding-help-page" className="sk-help-page">
      <div className="sk-page-head shrink-0">
        <h1 className="sk-page-head__title">{t("help.title")}</h1>
        <p className="sk-page-head__sub">{t("help.subtitle")}</p>
      </div>

      <div className="sk-help-grid min-h-0 flex-1">
        <section className="sk-help-faq">
          <span className="sk-help-faq__title">{t("help.faqTitle")}</span>

          <div className="sk-help-faq__scroll">
            {faqSections.map((section) => (
              <div key={section.id}>
                <div className="sk-help-faq__group-title">{section.title}</div>
                <div className="sk-help-faq__items">
                  {section.items.map((faq) => {
                    const on = openFaq.includes(faq.question);
                    return (
                      <div key={faq.question}>
                        <button
                          type="button"
                          className="sk-help-faq__q"
                          aria-expanded={on}
                          onClick={() => toggleFaq(faq.question)}
                        >
                          <span className="sk-help-faq__chevron">
                            <ChevronRight
                              className="h-3 w-3"
                              strokeWidth={2.2}
                              aria-hidden
                            />
                          </span>
                          <span>{faq.question}</span>
                        </button>
                        <div className="sk-help-faq__a" data-open={on}>
                          <div className="sk-help-faq__a-inner">
                            <p className="sk-help-faq__text">{faq.answer}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="sk-help-faq__actions">
            <button
              type="button"
              className="sk-help-actionbtn"
              onClick={() => {
                const subject = encodeURIComponent("Dotaz z aplikace Sklyvo");
                window.location.href = `mailto:${SKLYVO_BRAND.supportEmail}?subject=${subject}`;
              }}
            >
              <Mail className="h-3.5 w-3.5" strokeWidth={2} />
              {t("help.contactEmail")}
            </button>
            <button
              type="button"
              disabled={isRestartingTour}
              onClick={() => void handleRestartTour()}
              className="sk-help-actionbtn"
            >
              {isRestartingTour ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {t("help.restartTour")}
            </button>
          </div>

          <LegalDocumentLinks className="sk-help-legal" />
        </section>

        <SklyBotChat variant="panel" className="min-h-0" />
      </div>
    </div>
  );
}
