export type LegalDocumentId = "privacy" | "terms" | "data" | "cookies";

export type LegalSection = {
  heading?: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: LegalDocumentId;
  title: string;
  updatedAt: string;
  sections: LegalSection[];
};

export const LEGAL_DOCUMENT_IDS: LegalDocumentId[] = [
  "privacy",
  "terms",
  "data",
  "cookies",
];

export const LEGAL_TITLE_KEYS: Record<
  LegalDocumentId,
  "help.legalPrivacy" | "help.legalTerms" | "help.legalData" | "help.legalCookies"
> = {
  privacy: "help.legalPrivacy",
  terms: "help.legalTerms",
  data: "help.legalData",
  cookies: "help.legalCookies",
};
