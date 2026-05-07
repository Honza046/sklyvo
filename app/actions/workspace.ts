"use server";

import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type OnboardingFormInput = {
  companyName: string;
  industry: string;
  targetAudience: string;
  defaultTone: string;
  offeredServices: string[];
};

export async function saveOnboardingData(data: OnboardingFormInput) {
  const {
    companyName,
    industry,
    targetAudience,
    defaultTone,
    offeredServices: offeredServicesRaw,
  } = data;

  const offeredServicesList: string[] = Array.isArray(offeredServicesRaw)
    ? offeredServicesRaw
    : [];

  const session = await getSessionUser();

  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen. Přihlaste se prosím znovu." };
  }
  if (!companyName?.trim()) {
    return { error: "Název firmy je povinný." };
  }

  const normalizedOfferedServices = Array.from(
    new Set(offeredServicesList.map((item) => String(item).trim()).filter(Boolean)),
  );

  try {
    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: {
        name: companyName.trim(),
        companyName: companyName.trim(),
        industry: industry.trim() || null,
        targetAudience: targetAudience.trim() || null,
        defaultTone: defaultTone.trim() || null,
        offeredServices: normalizedOfferedServices,
      } as any,
    });
    return { success: true as const };
  } catch (error) {
    console.error("Chyba při ukládání onboardingu:", error);
    return { error: "Nepodařilo se uložit data. Zkontrolujte připojení k databázi." };
  }
}

export async function updateOfferedServices(services: string[]) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen. Přihlaste se prosím znovu." };
  }

  const normalized = Array.from(
    new Set((services ?? []).map((item) => item.trim()).filter(Boolean)),
  );

  try {
    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: {
        offeredServices: normalized,
      } as any,
    });
    revalidatePath("/settings");
    revalidatePath("/sniper");
    revalidatePath("/");
    return { success: true as const, services: normalized };
  } catch (e) {
    console.error("updateOfferedServices:", e);
    return { error: "Nepodařilo se uložit nabízené služby." };
  }
}
