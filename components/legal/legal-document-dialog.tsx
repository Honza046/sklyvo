"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLegalDocument } from "@/lib/legal/content";
import type { LegalDocumentId } from "@/lib/legal/types";
import { useLanguage } from "@/context/LanguageContext";
import {
  Cookie,
  Database,
  ScrollText,
  Shield,
  type LucideIcon,
} from "lucide-react";

type LegalDocumentDialogProps = {
  documentId: LegalDocumentId | null;
  onOpenChange: (open: boolean) => void;
};

const LEGAL_ICONS: Record<LegalDocumentId, LucideIcon> = {
  privacy: Shield,
  terms: ScrollText,
  data: Database,
  cookies: Cookie,
};

function parseSectionHeading(heading?: string) {
  if (!heading) return { num: undefined, title: undefined };
  const match = heading.match(/^(\d+)\.\s*(.+)$/);
  if (!match) return { num: undefined, title: heading };
  return { num: match[1], title: match[2] };
}

export function LegalDocumentDialog({
  documentId,
  onOpenChange,
}: LegalDocumentDialogProps) {
  const { language, t } = useLanguage();
  const open = documentId !== null;
  const doc = documentId ? getLegalDocument(documentId, language) : null;
  const Icon = documentId ? LEGAL_ICONS[documentId] : Shield;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {doc && documentId ? (
        <DialogContent
          className="sk-dialog-flat sk-legal-dialog max-h-[min(88vh,820px)] w-[min(92vw,720px)] max-w-none gap-0 overflow-hidden p-0 sm:rounded-[20px]"
          overlayClassName="sk-legal-dialog__overlay"
        >
          <header className="sk-legal-dialog__head shrink-0">
            <div className="sk-legal-dialog__icon" aria-hidden="true">
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.85} />
            </div>
            <div className="sk-legal-dialog__head-copy min-w-0">
              <DialogTitle className="sk-legal-dialog__title">
                {doc.title}
              </DialogTitle>
              <DialogDescription className="sk-legal-dialog__meta">
                <span
                  className="sk-legal-dialog__meta-dot sk-live-dot"
                  aria-hidden="true"
                />
                {t("legal.updatedLabel")}: {doc.updatedAt}
              </DialogDescription>
            </div>
          </header>

          <div className="sk-legal-dialog__body-wrap min-h-0 flex-1">
            <div className="sk-legal-dialog__body min-h-0 flex-1 overflow-y-auto">
              <div className="sk-legal-dialog__sections">
                {doc.sections.map((section) => {
                  const { num, title } = parseSectionHeading(section.heading);
                  const sectionKey = section.heading ?? section.paragraphs[0];

                  return (
                    <article key={sectionKey} className="sk-legal-dialog__section">
                      {title ? (
                        <div className="sk-legal-dialog__section-head">
                          {num ? (
                            <span className="sk-legal-dialog__section-num">
                              {num}
                            </span>
                          ) : null}
                          <h3 className="sk-legal-dialog__section-title">
                            {title}
                          </h3>
                        </div>
                      ) : null}
                      <div className="sk-legal-dialog__section-body">
                        {section.paragraphs.map((paragraph) => (
                          <p
                            key={paragraph}
                            className="sk-legal-dialog__paragraph"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <footer className="sk-legal-dialog__foot shrink-0">
            <DialogClose type="button" className="sk-legal-dialog__close-btn">
              {t("legal.closeLabel")}
            </DialogClose>
          </footer>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
