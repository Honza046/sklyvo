import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export type TenantContext = {
  userId: string;
  workspaceId: string;
};

/**
 * Session → vlastní user + workspace. Nikdy nebrat workspaceId z klienta.
 */
export async function requireTenant(): Promise<
  | { ok: true; tenant: TenantContext }
  | { ok: false; error: string }
> {
  const session = await getSessionUser();
  const userId = session.user?.id?.trim();
  const workspaceId =
    session.workspace?.id?.trim() || session.user?.workspaceId?.trim();
  if (!userId || !workspaceId) {
    return { ok: false, error: "Nejste přihlášen." };
  }
  return { ok: true, tenant: { userId, workspaceId } };
}

/** Ověří, že user patří do daného workspace (cross-tenant lock). */
export async function assertUserInWorkspace(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const uid = userId.trim();
  const wid = workspaceId.trim();
  if (!uid || !wid) return false;
  const row = await prisma.user.findFirst({
    where: { id: uid, workspaceId: wid },
    select: { id: true },
  });
  return Boolean(row);
}

/** Lead musí patřit do workspace — jinak null. */
export async function findLeadInWorkspace(
  leadId: string,
  workspaceId: string,
  select?: Record<string, boolean>,
) {
  return prisma.lead.findFirst({
    where: { id: leadId.trim(), workspaceId: workspaceId.trim() },
    ...(select ? { select } : {}),
  });
}
