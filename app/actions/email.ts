"use server";

import type { SendEmailResult } from "@/lib/email-types";
import { sendSystemEmail } from "@/lib/emails/send-system";
import {
  emailCodeBlock,
  emailMuted,
  emailParagraph,
  renderSystemEmail,
} from "@/lib/emails/layout";
import { sendWorkspaceEmail } from "@/lib/workspace-mailer";
import { verifyInternalWorkspaceToken } from "@/lib/internal-auth";
import { getSessionUser } from "@/app/actions/auth";

export type { SendEmailResult } from "@/lib/email-types";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Preferovaná osobní schránka (jinak session user / workspace fallback). */
  userId?: string;
  /** Pouze s platným internalToken (server-side). */
  workspaceId?: string;
  internalToken?: string;
};

/**
 * Odešle outreach e-mail přes propojený účet (osobní → workspace fallback).
 * Workspace ze session, nebo ověřený internal token (cron / fronta).
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  userId,
  workspaceId,
  internalToken,
}: SendEmailInput): Promise<SendEmailResult> {
  let resolvedWorkspaceId: string | undefined;
  let resolvedUserId: string | undefined = userId?.trim() || undefined;

  if (workspaceId?.trim()) {
    if (!verifyInternalWorkspaceToken(workspaceId, internalToken)) {
      return { success: false, error: "Nejste přihlášen nebo chybí workspace." };
    }
    resolvedWorkspaceId = workspaceId.trim();
  } else {
    const session = await getSessionUser();
    resolvedWorkspaceId = session.user?.workspaceId ?? undefined;
    if (!resolvedUserId) {
      resolvedUserId = session.user?.id ?? undefined;
    }
  }

  if (!resolvedWorkspaceId) {
    return { success: false, error: "Nejste přihlášen nebo chybí workspace." };
  }

  return sendWorkspaceEmail({
    workspaceId: resolvedWorkspaceId,
    userId: resolvedUserId,
    to,
    subject,
    html,
    text,
  });
}

/**
 * Odešle 6místný ověřovací kód pro změnu e-mailu na NOVOU (skutečnou) adresu.
 * Na rozdíl od `sendEmail` zde NIKDY nepřesměrováváme příjemce – kód musí dorazit
 * na adresu, kterou si uživatel ověřuje.
 */
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

/**
 * Odešle e-mail s odkazem pro obnovu zapomenutého hesla.
 * Produkce: nastav RESEND_FROM_EMAIL na adresu z ověřené domény v Resendu.
 */
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
