"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/actions/auth";

export async function completeOnboardingTour() {
  const session = await getSessionUser();
  if (!session.user?.id) {
    return { ok: false as const, error: "Nepřihlášen." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingTourCompleted: true },
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Pro úpravy / testování — znovu spustí UI prohlídku po refreshi. */
export async function restartOnboardingTour() {
  const session = await getSessionUser();
  if (!session.user?.id) {
    return { ok: false as const, error: "Nepřihlášen." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingTourCompleted: false },
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}
