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
  companyWebsite?: string;
  companyContext?: string;
  emailSignature?: string;
};

export async function saveOnboardingData(data: OnboardingFormInput) {
  const {
    companyName,
    industry,
    targetAudience,
    defaultTone,
    offeredServices: offeredServicesRaw,
    companyWebsite,
    companyContext,
    emailSignature,
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
    new Set(
      offeredServicesList.map((item) => String(item).trim()).filter(Boolean),
    ),
  );

  const website = (companyWebsite ?? "").trim();
  let context = (companyContext ?? "").trim();
  if (website) {
    const webLine = `Web: ${website}`;
    if (!context.toLowerCase().includes(website.toLowerCase())) {
      context = context ? `${context}\n\n${webLine}` : webLine;
    }
  }
  const signature = (emailSignature ?? "").trim();

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
        companyContext: context.length > 0 ? context : null,
        emailSignature: signature.length > 0 ? signature : null,
      } as any,
    });
    revalidatePath("/", "layout");
    revalidatePath("/onboarding");
    revalidatePath("/settings");
    return { success: true as const };
  } catch (error) {
    console.error("Chyba při ukládání onboardingu:", error);
    return {
      error: "Nepodařilo se uložit data. Zkontrolujte připojení k databázi.",
    };
  }
}

export async function updateCompanyContext(companyContext: string) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen. Přihlaste se prosím znovu." };
  }

  const trimmed = companyContext.trim();

  try {
    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: {
        companyContext: trimmed.length > 0 ? trimmed : null,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/account");
    revalidatePath("/sniper");
    return { success: true as const, companyContext: trimmed };
  } catch (e) {
    console.error("updateCompanyContext:", e);
    const message = e instanceof Error ? e.message : String(e);
    return {
      error: `Nepodařilo se uložit profil firmy.${message ? ` (${message})` : ""}`,
    };
  }
}

export type WorkspaceServicesInput = {
  offeredServices: string[];
  companyServices: string;
};

export async function updateWorkspaceServicesSettings(
  input: WorkspaceServicesInput,
) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen. Přihlaste se prosím znovu." };
  }

  const normalized = Array.from(
    new Set(
      (input.offeredServices ?? []).map((item) => item.trim()).filter(Boolean),
    ),
  );
  const companyServices = input.companyServices.trim();

  try {
    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: {
        offeredServices: normalized,
        companyServices: companyServices.length > 0 ? companyServices : null,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/sniper");
    revalidatePath("/");
    return {
      success: true as const,
      offeredServices: normalized,
      companyServices,
    };
  } catch (e) {
    console.error("updateWorkspaceServicesSettings:", e);
    const message = e instanceof Error ? e.message : String(e);
    return {
      error: `Nepodařilo se uložit nabízené služby.${message ? ` (${message})` : ""}`,
    };
  }
}

import { serializeSystemPromptWithForbiddenWords } from "@/lib/ai-behavior-settings";

export type AiBehaviorSettingsInput = {
  emailSignature: string;
  systemPrompt: string;
  forbiddenWords: string;
};

export async function updateAiBehaviorSettings(input: AiBehaviorSettingsInput) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen. Přihlaste se prosím znovu." };
  }

  const emailSignature = input.emailSignature.trim();
  const systemPrompt = input.systemPrompt.trim();
  const forbiddenWords = input.forbiddenWords.trim();
  const storedSystemPrompt = serializeSystemPromptWithForbiddenWords(
    systemPrompt,
    forbiddenWords,
  );

  try {
    await prisma.workspace.update({
      where: { id: session.user.workspaceId },
      data: {
        emailSignature: emailSignature.length > 0 ? emailSignature : null,
        systemPrompt: storedSystemPrompt.length > 0 ? storedSystemPrompt : null,
      },
    });
    revalidatePath("/settings");
    revalidatePath("/sniper");
    revalidatePath("/autopilot/sniper");
    return {
      success: true as const,
      emailSignature,
      systemPrompt,
      forbiddenWords,
    };
  } catch (e) {
    console.error("updateAiBehaviorSettings:", e);
    const message = e instanceof Error ? e.message : String(e);
    return {
      error: `Nepodařilo se uložit chování AI.${message ? ` (${message})` : ""}`,
    };
  }
}

/** @deprecated Použij updateWorkspaceServicesSettings */
export async function updateOfferedServices(services: string[]) {
  const session = await getSessionUser();
  if (!session.user?.workspaceId) {
    return { error: "Nejste přihlášen. Přihlaste se prosím znovu." };
  }

  const existing = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { companyServices: true },
  });

  return updateWorkspaceServicesSettings({
    offeredServices: services,
    companyServices: existing?.companyServices ?? "",
  });
}
