"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export type TeamMemberDto = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "AKTIVNÍ";
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AGENCY_MAX_MEMBERS = 5;

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Kolega";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export async function getTeamAccessState() {
  const session = await getSessionUser();
  if (!session.user?.workspaceId || !session.workspace) {
    return { error: "Nejste přihlášen." as const };
  }

  const planTier = (session.workspace.planTier ?? "NONE").toUpperCase();
  const isAgency = planTier.includes("AGENCY") || planTier === "AGENCY";

  const members = await prisma.user.findMany({
    where: { workspaceId: session.user.workspaceId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  const team: TeamMemberDto[] = members.map((m) => ({
    id: m.id,
    name: (m.name ?? "").trim() || displayNameFromEmail(m.email),
    email: m.email,
    role: m.role,
    status: "AKTIVNÍ",
  }));

  return {
    success: true as const,
    isAgency,
    planTier: session.workspace.planTier ?? "NONE",
    maxMembers: AGENCY_MAX_MEMBERS,
    sharedCredits: Math.max(
      0,
      (session.workspace.creditsTotal ?? 0) - (session.workspace.creditsUsed ?? 0),
    ),
    currentUserId: session.user.id,
    currentUserRole: session.user.role,
    members: team,
  };
}

/**
 * Pozve kolegu do stejného workspace (sdílené CRM / kredity / Sheets).
 * Pokud účet neexistuje, vytvoří ho s dočasným heslem.
 */
export async function inviteTeamMember(input: {
  email: string;
  role?: "ADMIN" | "MEMBER";
  name?: string;
}) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId || !session.workspace) {
    return { error: "Nejste přihlášen." };
  }
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { error: "Pozvat členy může jen vlastník nebo admin." };
  }

  const planTier = (session.workspace.planTier ?? "NONE").toUpperCase();
  const isAgency = planTier.includes("AGENCY");
  if (!isAgency) {
    return { error: "Týmová spolupráce je dostupná od tarifu Agency." };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Neplatný e-mail." };
  }

  const workspaceId = session.user.workspaceId;
  const memberCount = await prisma.user.count({ where: { workspaceId } });
  if (memberCount >= AGENCY_MAX_MEMBERS) {
    return {
      error: `Dosáhli jste limitu ${AGENCY_MAX_MEMBERS} členů pro Agency workspace.`,
    };
  }

  const role = input.role === "ADMIN" ? "ADMIN" : "MEMBER";
  const name =
    (input.name ?? "").trim() ||
    (email.startsWith("filip")
      ? "Filip Retzl"
      : email.startsWith("matej") || email.startsWith("matěj")
        ? "Matěj Pazdera"
        : displayNameFromEmail(email));

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (existing) {
    if (existing.workspaceId === workspaceId) {
      return { error: "Tento uživatel už je ve vašem workspace." };
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        workspaceId,
        role,
        name: existing.name?.trim() || name,
      },
    });
    revalidatePath("/settings");
    return {
      success: true as const,
      mode: "moved" as const,
      email,
      name: existing.name?.trim() || name,
      temporaryPassword: null as string | null,
    };
  }

  const temporaryPassword = randomBytes(5).toString("hex"); // 10 hex chars
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: temporaryPassword,
      workspaceId,
      role,
    },
  });

  revalidatePath("/settings");
  return {
    success: true as const,
    mode: "created" as const,
    email,
    name,
    temporaryPassword,
  };
}

export async function removeTeamMember(userId: string) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen." };
  }
  if (session.user.role !== "OWNER") {
    return { error: "Odebrat člena může jen vlastník." };
  }
  if (userId === session.user.id) {
    return { error: "Nemůžete odebrat sami sebe." };
  }

  const member = await prisma.user.findFirst({
    where: { id: userId, workspaceId: session.user.workspaceId },
  });
  if (!member) {
    return { error: "Člen nenalezen." };
  }
  if (member.role === "OWNER") {
    return { error: "Vlastníka nelze odebrat." };
  }

  // Přesun do vlastního prázdného workspace (účet zůstane funkční)
  const solo = await prisma.workspace.create({
    data: { name: `Prostor - ${member.name || member.email}` },
  });
  await prisma.user.update({
    where: { id: member.id },
    data: { workspaceId: solo.id, role: "OWNER" },
  });

  revalidatePath("/settings");
  return { success: true as const };
}
