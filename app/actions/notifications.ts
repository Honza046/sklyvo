"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import {
  type NotificationPreferences,
  type NotificationPrefKey,
} from "@/lib/emails/notification-prefs";

const PREF_KEYS: NotificationPrefKey[] = [
  "notifyCampaignReply",
  "notifyCrmActivity",
  "notifyWeeklyRadarReport",
  "notifyLowCredits",
  "notifyBillingTrial",
  "notifyProductTips",
];

export async function getNotificationPreferences(): Promise<
  NotificationPreferences | { error: string }
> {
  const session = await getSessionUser();
  if (!session.user?.id) {
    return { error: "Nejste přihlášen." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      notifyCampaignReply: true,
      notifyCrmActivity: true,
      notifyWeeklyRadarReport: true,
      notifyLowCredits: true,
      notifyBillingTrial: true,
      notifyProductTips: true,
    },
  });

  if (!user) {
    return { error: "Uživatel nenalezen." };
  }

  return {
    notifyCampaignReply: user.notifyCampaignReply,
    notifyCrmActivity: user.notifyCrmActivity,
    notifyWeeklyRadarReport: user.notifyWeeklyRadarReport,
    notifyLowCredits: user.notifyLowCredits,
    notifyBillingTrial: user.notifyBillingTrial,
    notifyProductTips: user.notifyProductTips,
  };
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<{ success: true } | { error: string }> {
  const session = await getSessionUser();
  if (!session.user?.id) {
    return { error: "Nejste přihlášen." };
  }

  const data: Partial<Record<NotificationPrefKey, boolean>> = {};
  for (const key of PREF_KEYS) {
    if (typeof patch[key] === "boolean") {
      data[key] = patch[key];
    }
  }

  if (Object.keys(data).length === 0) {
    return { error: "Žádné změny k uložení." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  revalidatePath("/account");
  return { success: true };
}
