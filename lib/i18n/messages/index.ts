import { cz, type MessageTree } from "@/lib/i18n/messages/cz";
import { de } from "@/lib/i18n/messages/de";
import { en } from "@/lib/i18n/messages/en";
import { es } from "@/lib/i18n/messages/es";
import type { Language } from "@/lib/i18n/types";

export const messages: Record<Language, MessageTree> = {
  cz,
  en,
  es,
  de,
};

export type { MessageTree } from "@/lib/i18n/messages/cz";
