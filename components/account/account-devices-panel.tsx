"use client";

import { useMemo } from "react";
import { Laptop, MonitorSmartphone, Smartphone } from "lucide-react";
import { AccountPanel } from "@/components/account/account-panel";
import { useLanguage } from "@/context/LanguageContext";

function detectDeviceLabel(
  userAgent: string,
  t: (key: string) => string,
) {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod|android|mobile/.test(ua)) {
    if (/iphone|ipod/.test(ua)) {
      return { icon: Smartphone, label: t("account.devicesIphone") };
    }
    if (/ipad/.test(ua)) {
      return { icon: Smartphone, label: t("account.devicesIpad") };
    }
    if (/android/.test(ua)) {
      return { icon: Smartphone, label: t("account.devicesAndroid") };
    }
    return { icon: Smartphone, label: t("account.devicesMobile") };
  }
  if (/mac os x|macintosh/.test(ua)) {
    return { icon: Laptop, label: t("account.devicesMac") };
  }
  if (/windows/.test(ua)) {
    return { icon: MonitorSmartphone, label: t("account.devicesWindows") };
  }
  if (/linux/.test(ua)) {
    return { icon: Laptop, label: t("account.devicesLinux") };
  }
  return { icon: MonitorSmartphone, label: t("account.devicesBrowser") };
}

function detectBrowserLabel(userAgent: string, t: (key: string) => string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Microsoft Edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Google Chrome";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  return t("account.devicesGenericBrowser");
}

export function AccountDevicesPanel() {
  const { t } = useLanguage();
  const device = useMemo(() => {
    if (typeof navigator === "undefined") {
      return {
        platform: "—",
        browser: "—",
        Icon: MonitorSmartphone,
      };
    }
    const detected = detectDeviceLabel(navigator.userAgent, t);
    return {
      platform: detected.label,
      browser: detectBrowserLabel(navigator.userAgent, t),
      Icon: detected.icon,
    };
  }, [t]);

  return (
    <AccountPanel
      description={t("account.devicesPanelDesc")}
      hint={t("account.devicesHint")}
    >
      <ul className="sk-account-sub__device-list">
        <li className="sk-account-sub__device-row">
          <div className="sk-account-sub__device-icon">
            <device.Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="sk-account-sub__device-main">
            <p className="sk-account-sub__device-title">
              {device.platform} · {device.browser}
            </p>
            <p className="sk-account-sub__device-sub">
              {t("account.devicesCurrentSession")}
            </p>
          </div>
          <span className="sk-account-sub__device-badge">
            {t("account.devicesActiveNow")}
          </span>
        </li>
      </ul>
    </AccountPanel>
  );
}
