"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Unplug } from "lucide-react";
import { toast } from "sonner";
import {
  disconnectEmailConnection,
  saveSmtpEmailConnection,
} from "@/app/actions/email-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/context/LanguageContext";
import type { EmailConnectionState } from "@/lib/email-connection-types";
import { EMAIL_SETUP_SETTINGS_HASH } from "@/lib/copilot/setup-knowledge";
import { cn } from "@/lib/utils";

type EmailIntegrationPanelProps = {
  initialState: EmailConnectionState;
};

const inputClass =
  "rounded-xl border-border/60 bg-background focus-visible:ring-blue-500";

function smtpModeToggleClass(active: boolean) {
  return cn(
    "flex-1 rounded-xl px-3 py-2 text-sm transition-all duration-200",
    active
      ? "bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700/80",
  );
}

export function EmailIntegrationPanel({ initialState }: EmailIntegrationPanelProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [smtpProvider, setSmtpProvider] = useState<"OUTLOOK_SMTP" | "CUSTOM_SMTP">(() =>
    initialState.provider === "CUSTOM_SMTP" ? "CUSTOM_SMTP" : "OUTLOOK_SMTP",
  );
  const [form, setForm] = useState({
    senderName: initialState.senderName ?? "",
    senderEmail: initialState.senderEmail ?? "",
    smtpHost: initialState.smtpHost ?? "smtp.office365.com",
    smtpPort: initialState.smtpPort?.toString() ?? "587",
    appPassword: "",
  });

  const applySeznamPreset = () => {
    setSmtpProvider("CUSTOM_SMTP");
    setForm((prev) => ({
      ...prev,
      senderEmail: prev.senderEmail.trim() || "jan@venegard.com",
      senderName: prev.senderName.trim() || "Jan Sedlář",
      smtpHost: "smtp.seznam.cz",
      smtpPort: "465",
    }));
  };

  useEffect(() => {
    setState(initialState);
    setForm((prev) => ({
      ...prev,
      senderName: initialState.senderName ?? prev.senderName,
      senderEmail: initialState.senderEmail ?? prev.senderEmail,
      smtpHost: initialState.smtpHost ?? prev.smtpHost,
      smtpPort: initialState.smtpPort?.toString() ?? prev.smtpPort,
    }));
  }, [initialState]);

  useEffect(() => {
    const connected = searchParams.get("emailConnected");
    const error = searchParams.get("emailError");
    const smtpMode = searchParams.get("smtpMode");
    const smtpHost = searchParams.get("smtpHost");
    const smtpPort = searchParams.get("smtpPort");

    if (smtpMode === "OUTLOOK_SMTP" || smtpMode === "CUSTOM_SMTP") {
      setSmtpProvider(smtpMode);
    }
    if (smtpHost || smtpPort) {
      setForm((prev) => ({
        ...prev,
        ...(smtpHost ? { smtpHost } : {}),
        ...(smtpPort ? { smtpPort } : {}),
      }));
    }

    if (connected === "google") {
      toast.success(t("settings.emailIntegration.connectedGoogle"));
      router.replace(`/settings#${EMAIL_SETUP_SETTINGS_HASH}`, { scroll: false });
    } else if (error) {
      toast.error(decodeURIComponent(error));
      router.replace(`/settings#${EMAIL_SETUP_SETTINGS_HASH}`, { scroll: false });
    }
  }, [router, searchParams, t]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#${EMAIL_SETUP_SETTINGS_HASH}`) return;
    // #region agent log
    fetch("http://127.0.0.1:7935/ingest/cd58245d-3cee-42b5-b476-9501fa947d37", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "dc49be",
      },
      body: JSON.stringify({
        sessionId: "dc49be",
        runId: "post-fix",
        hypothesisId: "E",
        location: "email-integration-panel.tsx:hash-effect",
        message: "Email panel saw deep-link hash (open owned by SettingsAccordion)",
        data: { hash: window.location.hash },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  const handleGoogleConnect = () => {
    window.location.href = "/api/email/google/authorize";
  };

  const handleSaveSmtp = async () => {
    setIsSaving(true);
    const result = await saveSmtpEmailConnection({
      provider: smtpProvider,
      senderName: form.senderName,
      senderEmail: form.senderEmail,
      smtpHost: form.smtpHost,
      smtpPort: Number(form.smtpPort),
      appPassword: form.appPassword,
    });
    setIsSaving(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(t("settings.emailIntegration.connectedSmtp"));
    setForm((prev) => ({ ...prev, appPassword: "" }));
    startTransition(() => router.refresh());
  };

  const handleDisconnect = useCallback(async () => {
    const result = await disconnectEmailConnection();
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("settings.emailIntegration.disconnected"));
    startTransition(() => router.refresh());
  }, [router, t]);

  const statusCardClass = state.connected
    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
    : "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20";

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("settings.emailIntegration.description")}</p>

      <div className={cn("rounded-2xl border p-4", statusCardClass)}>
        <div className="flex items-start gap-3">
          {state.connected ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {state.connected
                ? t("settings.emailIntegration.statusConnected")
                : t("settings.emailIntegration.statusDisconnected")}
            </p>
            {state.connected && state.senderEmail && (
              <p className="mt-1 text-sm text-muted-foreground">
                {state.senderName ? `${state.senderName} · ` : ""}
                {state.senderEmail}
                {state.provider ? ` · ${state.provider}` : ""}
              </p>
            )}
            {state.lastError && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{state.lastError}</p>
            )}
          </div>
          {state.connected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-xl"
              onClick={() => void handleDisconnect()}
              disabled={isPending}
            >
              <Unplug className="mr-2 h-4 w-4" />
              {t("settings.emailIntegration.disconnect")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-white dark:border-slate-700 dark:bg-slate-900">
              <span className="text-lg font-bold leading-none">
                <span className="text-[#4285F4]">G</span>
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{t("settings.emailIntegration.googleTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("settings.emailIntegration.googleDescription")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleGoogleConnect}
            className="w-full rounded-xl bg-white font-semibold text-[#4285F4] shadow-sm ring-1 ring-border hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {t("settings.emailIntegration.googleButton")}
          </Button>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{t("settings.emailIntegration.smtpTitle")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("settings.emailIntegration.smtpDescription")}
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={smtpModeToggleClass(smtpProvider === "OUTLOOK_SMTP")}
              onClick={() => {
                setSmtpProvider("OUTLOOK_SMTP");
                setForm((prev) => ({
                  ...prev,
                  smtpHost: "smtp.office365.com",
                  smtpPort: "587",
                }));
              }}
            >
              Outlook
            </button>
            <button
              type="button"
              className={smtpModeToggleClass(
                smtpProvider === "CUSTOM_SMTP" && form.smtpHost.includes("seznam"),
              )}
              onClick={applySeznamPreset}
            >
              Seznam
            </button>
            <button
              type="button"
              className={smtpModeToggleClass(
                smtpProvider === "CUSTOM_SMTP" && !form.smtpHost.includes("seznam"),
              )}
              onClick={() => setSmtpProvider("CUSTOM_SMTP")}
            >
              {t("settings.emailIntegration.customSmtp")}
            </button>
          </div>

          {form.smtpHost.includes("seznam") && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Seznam: heslo k{" "}
              <strong>jan@venegard.com</strong> (nebo heslo aplikace ze Seznam účtu). Host{" "}
              <code className="font-mono">smtp.seznam.cz</code>, port <code className="font-mono">465</code>.
            </p>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sender-name">{t("settings.emailIntegration.senderName")}</Label>
              <Input
                id="sender-name"
                value={form.senderName}
                onChange={(event) => setForm((prev) => ({ ...prev, senderName: event.target.value }))}
                className={inputClass}
                placeholder="Jan Novák"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sender-email">{t("settings.emailIntegration.senderEmail")}</Label>
              <Input
                id="sender-email"
                type="email"
                value={form.senderEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, senderEmail: event.target.value }))
                }
                className={inputClass}
                placeholder="jan@firma.cz"
              />
            </div>
            <div
              className={cn(
                "grid transition-all duration-200 ease-in-out",
                smtpProvider === "CUSTOM_SMTP" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="grid grid-cols-3 gap-3 pb-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="smtp-host">{t("settings.emailIntegration.smtpHost")}</Label>
                    <Input
                      id="smtp-host"
                      value={form.smtpHost}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, smtpHost: event.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp-port">{t("settings.emailIntegration.smtpPort")}</Label>
                    <Input
                      id="smtp-port"
                      value={form.smtpPort}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, smtpPort: event.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="app-password">{t("settings.emailIntegration.appPassword")}</Label>
              <Input
                id="app-password"
                type="password"
                value={form.appPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, appPassword: event.target.value }))
                }
                className={inputClass}
                placeholder="••••••••••••••••"
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleSaveSmtp()}
              disabled={isSaving}
              className="w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("settings.emailIntegration.saveSmtp")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
