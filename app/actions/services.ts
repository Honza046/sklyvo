"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";

export async function getServices() {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return {
      error: "Nejste přihlášen.",
      services: [] as { id: string; name: string; description: string }[],
    };
  }

  try {
    const services = await prisma.service.findMany({
      where: { workspaceId: session.user.workspaceId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true },
    });
    return { services };
  } catch (e) {
    console.error("getServices:", e);
    return {
      error: "Nepodařilo se načíst služby.",
      services: [] as { id: string; name: string; description: string }[],
    };
  }
}

export async function createService(input: {
  name: string;
  description: string;
}) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen." };
  }
  const name = input.name?.trim();
  if (!name) {
    return { error: "Název služby je povinný." };
  }

  try {
    const service = await prisma.service.create({
      data: {
        workspaceId: session.user.workspaceId,
        name,
        description: (input.description ?? "").trim(),
      },
      select: { id: true, name: true, description: true },
    });
    revalidatePath("/settings");
    revalidatePath("/sniper");
    return { success: true as const, service };
  } catch (e) {
    console.error("createService:", e);
    return { error: "Nepodařilo se uložit službu." };
  }
}

export async function deleteService(serviceId: string) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen." };
  }

  if (!serviceId?.trim()) {
    return { error: "Chybí ID služby." };
  }

  try {
    await prisma.service.deleteMany({
      where: { id: serviceId, workspaceId: session.user.workspaceId },
    });
    revalidatePath("/settings");
    revalidatePath("/sniper");
    return { success: true as const };
  } catch (e) {
    console.error("deleteService:", e);
    return { error: "Nepodařilo se smazat službu." };
  }
}
