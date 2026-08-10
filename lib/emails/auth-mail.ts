/**
 * System mail helpers — NOT server actions (avoid open relay via client RPC).
 */
import type { SendEmailResult } from "@/lib/email-types";
import { sendSystemEmail } from "@/lib/emails/send-system";
import {
  emailCodeBlock,
  emailMuted,
  emailParagraph,
  renderSystemEmail,
} from "@/lib/emails/layout";

export async function sendVerificationCodeEmail(
  to: string,
  code: string,
): Promise<SendEmailResult> {
  const html = renderSystemEmail({
    preview: `Váš ověřovací kód: ${code}`,
    title: "Ověření změny e-mailu",
    bodyHtml: [
      emailParagraph("Dobrý den,"),
      emailParagraph(
        "pro dokončení změny e-mailové adresy ve vašem účtu Sklyvo zadejte následující ověřovací kód:",
      ),
      emailCodeBlock(code),
      emailMuted(
        "Kód je platný <strong>15 minut</strong>. Pokud jste o změnu nežádali, tento e-mail ignorujte.",
      ),
    ].join(""),
  });

  return sendSystemEmail({
    to,
    subject: "Bezpečnostní kód pro změnu e-mailu — Sklyvo",
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<SendEmailResult> {
  const safeLink = resetLink.trim();
  const html = renderSystemEmail({
    preview: "Nastavte si nové heslo do Sklyvo",
    title: "Obnova hesla",
    bodyHtml: [
      emailParagraph("Dobrý den,"),
      emailParagraph(
        "kliknutím na tlačítko níže si nastavíte nové heslo. Pokud jste o změnu nežádali, tento e-mail ignorujte.",
      ),
      emailMuted(
        `Pokud tlačítko nefunguje, zkopírujte odkaz do prohlížeče:<br /><a href="${safeLink}" style="color:#02a7ff;word-break:break-all;">${safeLink}</a>`,
      ),
      emailMuted("Odkaz je platný <strong>60 minut</strong>."),
    ].join(""),
    cta: {
      label: "Nastavit nové heslo",
      href: safeLink,
    },
  });

  return sendSystemEmail({
    to,
    subject: "Obnova zapomenutého hesla — Sklyvo",
    html,
  });
}
