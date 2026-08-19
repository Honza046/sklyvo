"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LEGAL_DOCUMENT_IDS, LEGAL_TITLE_KEYS } from "@/lib/legal/types";
import type { LegalDocumentId } from "@/lib/legal/types";
import { LegalDocumentDialog } from "@/components/legal/legal-document-dialog";
import { useLanguage } from "@/context/LanguageContext";

type LegalDocumentLinksProps = {
  className?: string;
};

export function LegalDocumentLinks({ className }: LegalDocumentLinksProps) {
  const { t } = useLanguage();
  const [activeDoc, setActiveDoc] = useState<LegalDocumentId | null>(null);

  return (
    <>
      <footer className={cn("sk-legal-footer", className)}>
        <div className="sk-legal-links">
          {LEGAL_DOCUMENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="sk-legal-links__btn"
              onClick={() => setActiveDoc(id)}
            >
              {t(LEGAL_TITLE_KEYS[id])}
            </button>
          ))}
        </div>
      </footer>

      <LegalDocumentDialog
        documentId={activeDoc}
        onOpenChange={(open) => {
          if (!open) setActiveDoc(null);
        }}
      />
    </>
  );
}
