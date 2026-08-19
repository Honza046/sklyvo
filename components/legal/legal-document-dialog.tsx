"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLegalDocument } from "@/lib/legal/content";
import type { LegalDocumentId } from "@/lib/legal/types";
import { useLanguage } from "@/context/LanguageContext";

type LegalDocumentDialogProps = {
  documentId: LegalDocumentId | null;
  onOpenChange: (open: boolean) => void;
};

export function LegalDocumentDialog({
  documentId,
  onOpenChange,
}: LegalDocumentDialogProps) {
  const { language, t } = useLanguage();
  const open = documentId !== null;
  const doc = documentId ? getLegalDocument(documentId, language) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {doc ? (
        <DialogContent
          className="sk-dialog-flat sk-legal-dialog flex max-h-[min(88vh,820px)] w-[min(92vw,720px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-[20px]"
          overlayClassName="bg-[#08090a]/96"
        >
          <div className="sk-legal-dialog__head shrink-0 border-b border-[rgba(255,255,255,0.09)] px-5 pb-3.5 pt-5 pr-12">
            <DialogTitle className="text-left text-[15px] font-bold leading-snug tracking-tight text-[#fafafb]">
              {doc.title}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-left text-[10.5px] text-[#6b7078]">
              {t("legal.updatedLabel")}: {doc.updatedAt}
            </DialogDescription>
          </div>

          <div className="sk-legal-dialog__body min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-5">
              {doc.sections.map((section) => (
                <section key={section.heading ?? section.paragraphs[0]}>
                  {section.heading ? (
                    <h3 className="mb-2 text-[11.5px] font-bold tracking-tight text-[#f2f3f5]">
                      {section.heading}
                    </h3>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[11.5px] leading-[1.62] text-[#c9cdd3]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
