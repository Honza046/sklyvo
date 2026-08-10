"use server";

import type { SendEmailResult } from "@/lib/email-types";
import { sendWorkspaceEmail } from "@/lib/workspace-mailer";
import { verifyInternalWorkspaceToken } from "@/lib/internal-auth";
import { getSessionUser } from "@/app/actions/auth";
import { assertUserInWorkspace } from "@/lib/tenant";

export type { SendEmailResult } from "@/lib/email-types";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Preferovaná osobní schránka — jen vlastní user nebo člen workspace (ověřeno). */
  userId?: string;
  /** Pouze s platným internalToken (server-side). */
  workspaceId?: string;
  internalToken?: string;
};

/**
 * Odešle outreach e-mail přes propojený účet (osobní → workspace fallback).
 * Workspace ze session, nebo ověřený internal token (cron / fronta).
 * Cizí userId mimo workspace = odmítnuto.
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
  let resolvedUserId: string | undefined;

  if (workspaceId?.trim()) {
    if (!verifyInternalWorkspaceToken(workspaceId, internalToken)) {
      return {
        success: false,
        error: "Nejste přihlášen nebo chybí workspace.",
      };
    }
    resolvedWorkspaceId = workspaceId.trim();
    const requested = userId?.trim();
    if (requested) {
      if (!(await assertUserInWorkspace(requested, resolvedWorkspaceId))) {
        return { success: false, error: "Nepovolený odesílatel." };
      }
      resolvedUserId = requested;
    }
  } else {
    const session = await getSessionUser();
    resolvedWorkspaceId = session.user?.workspaceId ?? undefined;
    const sessionUserId = session.user?.id ?? undefined;
    const requested = userId?.trim();
    if (requested) {
      // Session path: pouze vlastní schránka (ne cizí teammate ID z klienta).
      if (!sessionUserId || requested !== sessionUserId) {
        return { success: false, error: "Nepovolený odesílatel." };
      }
      resolvedUserId = sessionUserId;
    } else {
      resolvedUserId = sessionUserId;
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
