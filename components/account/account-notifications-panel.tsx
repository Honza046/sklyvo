"use client";

import { useEffect, useState } from "react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/app/actions/notifications";
import { AccountPanel } from "@/components/account/account-panel";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/context/LanguageContext";
import type { NotificationPrefKey } from "@/lib/emails/notification-prefs";
import { toast } from "sonner";

const PREF_ROWS: NotificationPrefKey[] = [
  "notifyCampaignReply",
  "notifyCrmActivity",
  "notifyWeeklyRadarReport",
  "notifyLowCredits",
  "notifyBillingTrial",
  "notifyProductTips",
];

const PREF_I18N: Record<
  NotificationPrefKey,
  { title: string; desc: string }
> = {
  notifyCampaignReply: {
    title: "account.notifs.campaignReplyTitle",
    desc: "account.notifs.campaignReplyDesc",
  },
  notifyCrmActivity: {
    title: "account.notifs.crmActivityTitle",
    desc: "account.notifs.crmActivityDesc",
  },
  notifyWeeklyRadarReport: {
    title: "account.notifs.weeklyRadarTitle",
    desc: "account.notifs.weeklyRadarDesc",
  },
  notifyLowCredits: {
    title: "account.notifs.lowCreditsTitle",
    desc: "account.notifs.lowCreditsDesc",
  },
  notifyBillingTrial: {
    title: "account.notifs.billingTrialTitle",
    desc: "account.notifs.billingTrialDesc",
  },
  notifyProductTips: {
    title: "account.notifs.productTipsTitle",
    desc: "account.notifs.productTipsDesc",
  },
};

export function AccountNotificationsPanel() {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<Record<NotificationPrefKey, boolean> | null>(
    null,
  );
  const [busyKey, setBusyKey] = useState<NotificationPrefKey | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await getNotificationPreferences();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPrefs(result);
    })();
  }, []);

  async function handleToggle(key: NotificationPrefKey, checked: boolean) {
    if (!prefs) return;
    setBusyKey(key);
    const previous = prefs[key];
    setPrefs({ ...prefs, [key]: checked });
    try {
      const result = await updateNotificationPreferences({ [key]: checked });
      if ("error" in result) {
        setPrefs({ ...prefs, [key]: previous });
        toast.error(result.error);
        return;
      }
      toast.success(
        checked ? t("account.toast.notifOn") : t("account.toast.notifOff"),
      );
    } finally {
      setBusyKey(null);
    }
  }

  if (!prefs) {
    return (
      <AccountPanel loading loadingLabel={t("account.notificationsLoading")} />
    );
  }

  return (
    <AccountPanel description={t("account.notificationsPanelDesc")}>
      <ul className="sk-account-sub__toggle-list">
        {PREF_ROWS.map((key) => {
          const copy = PREF_I18N[key];
          const disabled = busyKey === key;
          return (
            <li key={key} className="sk-account-sub__toggle-row">
              <div className="sk-account-sub__toggle-copy">
                <p className="sk-account-sub__toggle-title">{t(copy.title)}</p>
                <p className="sk-account-sub__toggle-desc">{t(copy.desc)}</p>
              </div>
              <Switch
                checked={prefs[key]}
                disabled={disabled}
                onCheckedChange={(checked) => void handleToggle(key, checked)}
                aria-label={t(copy.title)}
              />
            </li>
          );
        })}
      </ul>
    </AccountPanel>
  );
}
