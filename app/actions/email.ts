"use server";

import { Resend } from "resend";
import { getSessionUser } from "@/app/actions/auth";
import type { SendEmailResult } from "@/lib/email-types";
import { sendWorkspaceEmail } from "@/lib/workspace-mailer";
import { verifyInternalWorkspaceToken } from "@/lib/internal-auth";

export type { SendEmailResult } from "@/lib/email-types";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Pouze s platným internalToken (server-side). */
  workspaceId?: string;
  internalToken?: string;
};

/**
 * Odešle outreach e-mail přes propojený firemní účet (SMTP / Google OAuth).
 * Workspace ze session, nebo ověřený internal token (cron / fronta).
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  workspaceId,
  internalToken,
}: SendEmailInput): Promise<SendEmailResult> {
  let resolvedWorkspaceId: string | undefined;

  if (workspaceId?.trim()) {
    if (!verifyInternalWorkspaceToken(workspaceId, internalToken)) {
      return { success: false, error: "Nejste přihlášen nebo chybí workspace." };
    }
    resolvedWorkspaceId = workspaceId.trim();
  } else {
    const session = await getSessionUser();
    resolvedWorkspaceId = session.user?.workspaceId ?? undefined;
  }

  if (!resolvedWorkspaceId) {
    return { success: false, error: "Nejste přihlášen nebo chybí workspace." };
  }

  return sendWorkspaceEmail({
    workspaceId: resolvedWorkspaceId,
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
 * Pozn.: V testovacím režimu Resendu (onboarding@resend.dev) e-mail fakticky dorazí
 * pouze na adresu vlastníka Resend účtu; pro libovolného příjemce je nutné ověřit doménu.
 */
export async function sendVerificationCodeEmail(
  to: string,
  code: string,
): Promise<SendEmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY || "fallback_aby_to_nepadlo");

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error("Chybí RESEND_API_KEY v .env souboru");
    return { success: false, error: "Chybí konfigurační klíč pro odesílání e-mailů." };
  }

  const recipient = to?.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { success: false, error: "Neplatná e-mailová adresa příjemce." };
  }

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Ověření změny e-mailu</h2>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
        Dobrý den,<br />
        pro dokončení změny e-mailové adresy ve vašem účtu zadejte následující ověřovací kód:
      </p>
      <div style="font-size: 34px; font-weight: 800; letter-spacing: 10px; text-align: center; background: #f1f5f9; border-radius: 12px; padding: 18px 0; margin: 0 0 16px; color: #2563eb;">
        ${code}
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
        Kód je platný <strong>15 minut</strong>. Pokud jste o změnu nežádali, tento e-mail ignorujte.
      </p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: recipient,
      subject: "Bezpečnostní kód pro změnu e-mailu",
      html,
    });

    if (error) {
      return { success: false, error: error.message || "Resend odmítl odeslání." };
    }

    return { success: true, id: data?.id ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Neznámá chyba při odesílání.";
    return { success: false, error: message };
  }
}

/**
 * Odešle e-mail s odkazem pro obnovu zapomenutého hesla.
 * Pozn.: stejně jako ostatní systémové e-maily používá testovací odesílatele onboarding@resend.dev.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<SendEmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY || "fallback_aby_to_nepadlo");

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error("Chybí RESEND_API_KEY v .env souboru");
    return { success: false, error: "Chybí konfigurační klíč pro odesílání e-mailů." };
  }

  const recipient = to?.trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { success: false, error: "Neplatná e-mailová adresa příjemce." };
  }

  const safeLink = resetLink.trim();
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Obnova hesla</h2>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Dobrý den,<br />
        kliknutím na odkaz níže si nastavíte nové heslo. Pokud jste o změnu nežádali, tento e-mail ignorujte.
      </p>
      <div style="text-align: center; margin: 0 0 20px;">
        <a href="${safeLink}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 12px;">
          Nastavit nové heslo
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0 0 8px;">
        Pokud tlačítko nefunguje, zkopírujte si tento odkaz do prohlížeče:<br />
        <a href="${safeLink}" style="color: #2563eb; word-break: break-all;">${safeLink}</a>
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0;">
        Odkaz je platný <strong>60 minut</strong>.
      </p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: recipient,
      subject: "Obnova zapomenutého hesla",
      html,
    });

    if (error) {
      return { success: false, error: error.message || "Resend odmítl odeslání." };
    }

    return { success: true, id: data?.id ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Neznámá chyba při odesílání.";
    return { success: false, error: message };
  }
}
