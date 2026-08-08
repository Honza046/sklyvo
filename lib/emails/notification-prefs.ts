export type NotificationPrefKey =
  | "notifyCampaignReply"
  | "notifyCrmActivity"
  | "notifyWeeklyRadarReport"
  | "notifyLowCredits"
  | "notifyBillingTrial"
  | "notifyProductTips";

export type NotificationPreferences = Record<NotificationPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  notifyCampaignReply: true,
  notifyCrmActivity: true,
  notifyWeeklyRadarReport: true,
  notifyLowCredits: true,
  notifyBillingTrial: true,
  notifyProductTips: true,
};
