import { Resend } from "resend";
import type { SendEmailResult } from "@/lib/email-types";
import { getResendFromAddress, mapResendSendError } from "@/lib/resend-system-mail";
import { SKLYVO_BRAND } from "@/lib/sklyvo-brand";

type SendSystemEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/**
 * Shared Resend sender for Sklyvo → customer product e-mails.
 */
export async function sendSystemEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendSystemEmailInput): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error("Chybí RESEND_API_KEY v .env souboru");
    return { success: false, error: "Chybí konfigurační klíč pro odesílání e-mailů." };
  }

  const recipient = to?.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { success: false, error: "Neplatná e-mailová adresa příjemce." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: recipient,
      subject,
      html,
      text,
      replyTo: replyTo ?? SKLYVO_BRAND.supportEmail,
    });

    if (error) {
      return {
        success: false,
        error: mapResendSendError(error.message || "Resend odmítl odeslání."),
      };
    }

    return { success: true, id: data?.id ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Neznámá chyba při odesílání.";
    return { success: false, error: mapResendSendError(message) };
  }
}
